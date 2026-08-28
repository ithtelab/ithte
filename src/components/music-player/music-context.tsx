'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { PLAYLIST_ID, type LyricLine, type NeteaseTrack } from './netease';

interface MusicContextValue {
  tracks: NeteaseTrack[];
  playlistName: string;
  loading: boolean;
  error: string;
  urlError: string;
  currentIndex: number;
  currentTrack: NeteaseTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  lyricsEnabled: boolean;
  playerExpanded: boolean;
  /** 当前歌曲歌词（带翻译） */
  lyrics: LyricLine[];
  lyricLoading: boolean;
  lyricError: string;
  audioAnalyser: AnalyserNode | null;
  getPlaybackTime: () => number;
  playTrack: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
  toggleLyrics: () => void;
  setPlayerExpanded: (expanded: boolean) => void;
  seek: (time: number) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

// 连续播放失败熔断阈值:达到后停止自动切歌,提示检查登录状态
const PLAY_FAILURE_LIMIT = 3;

/** 随机取下一首的索引,保证不会随机到当前这首(count>1 时) */
function randomNextIndex(count: number, current: number) {
  if (count <= 1) return current;
  const index = Math.floor(Math.random() * count);
  return index === current ? (index + 1) % count : index;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);

  const [tracks, setTracks] = useState<NeteaseTrack[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlError, setUrlError] = useState('');

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricLoading, setLyricLoading] = useState(false);
  const [lyricError, setLyricError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolumeState] = useState(0.75);
  const [lyricsEnabled, setLyricsEnabled] = useState(true);
  const [playerExpanded, setPlayerExpanded] = useState(false);

  // 取址请求序号:快速连点时丢弃过期响应,避免「播 A 显 B」竞态
  const requestIdRef = useRef(0);
  // 连续播放失败计数(成功播放一首后清零)
  const failureCountRef = useRef(0);
  // 主动清空 src(load)时的媒体 error 不算播放失败
  const ignoreMediaErrorRef = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedVolumeRaw = localStorage.getItem('yuniao-music-volume');
        const savedVolume = savedVolumeRaw === null ? Number.NaN : Number(savedVolumeRaw);
        const nextVolume = Number.isFinite(savedVolume)
          ? Math.min(Math.max(savedVolume, 0), 1)
          : 0.75;
        setVolumeState(nextVolume);
        if (audioRef.current) audioRef.current.volume = nextVolume;

        const savedLyrics = localStorage.getItem('yuniao-lyrics-enabled');
        if (savedLyrics !== null) setLyricsEnabled(savedLyrics !== 'false');
      } catch {
        /* use defaults */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const setVolume = useCallback((value: number) => {
    const nextVolume = Math.min(Math.max(Number(value) || 0, 0), 1);
    setVolumeState(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
    try {
      localStorage.setItem('yuniao-music-volume', String(nextVolume));
    } catch {
      /* ignore persistence errors */
    }
  }, []);

  const toggleLyrics = useCallback(() => {
    setLyricsEnabled((enabled) => {
      const next = !enabled;
      try {
        localStorage.setItem('yuniao-lyrics-enabled', String(next));
      } catch {
        /* ignore persistence errors */
      }
      return next;
    });
  }, []);

  const ensureAudioAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return null;

    if (!audioContextRef.current) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.62;
      analyser.minDecibels = -88;
      analyser.maxDecibels = -6;

      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);

      // iOS 来电/切后台会挂起 Web Audio 图,输出静音但 <audio> 仍在「播放」。
      // 挂起时尝试恢复;恢复失败(无手势)就暂停元素,让 UI 与真实状态保持一致。
      context.onstatechange = () => {
        if (context.state !== 'suspended') return;
        void context.resume().catch(() => audioRef.current?.pause());
      };

      audioContextRef.current = context;
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      setAudioAnalyser(analyser);
    }

    const context = audioContextRef.current;
    if (context?.state === 'suspended') {
      await context.resume().catch(() => {});
    }

    return analyserRef.current;
  }, []);

  useEffect(() => {
    if (isPlaying) void ensureAudioAnalyser();
  }, [isPlaying, ensureAudioAnalyser]);

  // 页面重新可见时恢复被挂起的 AudioContext(失败则暂停元素同步 UI)
  useEffect(() => {
    const resumeSuspendedContext = () => {
      const context = audioContextRef.current;
      if (!context || context.state !== 'suspended') return;
      if (audioRef.current?.paused) return;
      void context.resume().catch(() => audioRef.current?.pause());
    };
    document.addEventListener('visibilitychange', resumeSuspendedContext);
    return () => document.removeEventListener('visibilitychange', resumeSuspendedContext);
  }, []);

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      audioSourceRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  const isShuffleRef = useRef(isShuffle);
  const isRepeatRef = useRef(isRepeat);
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);
  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  /* 播放期间以约 20fps 同步时间，满足逐字歌词高亮，同时控制全局重渲染频率。 */
  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let previous = 0;
    const update = (timestamp: number) => {
      if (timestamp - previous >= 50) {
        previous = timestamp;
        const audio = audioRef.current;
        if (audio) setCurrentTime(audio.currentTime);
      }
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  /* ---------- 拉取歌单 ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/music/playlist?id=${PLAYLIST_ID}`);
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.tracks)) {
          throw new Error(json.error || '歌单加载失败');
        }
        if (!alive) return;
        setTracks(json.tracks);
        setPlaylistName(json.name || '我的歌单');
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- 切歌时加载歌词 ----------
     （重置 loading/error/lyrics 在 loadTrack 事件处理器里完成，见 loadTrack）
  */
  useEffect(() => {
    const track = tracks[currentIndex];
    // 关闭歌词时不请求歌词接口(对外暴露的 lyricLoading 由渲染侧按开关派生)
    if (!lyricsEnabled || !track) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/music/lyric?id=${track.id}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.ok || !Array.isArray(json.lines)) {
          throw new Error(json.error || '歌词加载失败');
        }
        setLyrics(json.lines);
      } catch (err) {
        if (alive) setLyricError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLyricLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentIndex, tracks, lyricsEnabled]);

  /* ---------- 播放失败熔断 ----------
     连续失败达到阈值后停止自动切歌,给出需要登录/稍后再试的提示。
     next 通过 ref 调用,避免 handlePlaybackFailure ↔ loadTrack 循环依赖。
  */
  const nextRef = useRef<() => void>(() => {});
  const handlePlaybackFailure = useCallback((message?: string) => {
    failureCountRef.current += 1;
    if (failureCountRef.current < PLAY_FAILURE_LIMIT) {
      nextRef.current();
      return;
    }
    setUrlError(message || '连续多首歌曲播放失败，已停止自动切换，请检查网易云登录状态或稍后再试');
    setIsPlaying(false);
  }, []);

  /* ---------- 播放 ---------- */
  const loadTrack = useCallback(
    async (index: number, autoplay: boolean) => {
      const audio = audioRef.current;
      const track = tracks[index];
      if (!audio || !track) return;
      const requestId = ++requestIdRef.current;
      if (autoplay) void ensureAudioAnalyser();
      setCurrentIndex(index);
      // 立即重置进度,避免短暂显示上一首的进度与时长
      setCurrentTime(0);
      setDuration(0);
      setUrlError('');
      setLyricLoading(true);
      setLyricError('');
      setLyrics([]);
      try {
        const res = await fetch(`/api/music/url?id=${track.id}`);
        const json = await res.json();
        // 已有更新的取址请求,这份过期响应直接丢弃
        if (requestIdRef.current !== requestId) return;
        if (!res.ok || !json.ok || !json.url) {
          setUrlError(json.error || '播放地址获取失败');
          ignoreMediaErrorRef.current = true;
          audio.removeAttribute('src');
          audio.load();
          ignoreMediaErrorRef.current = false;
          setIsPlaying(false);
          // 顺播链条上的失败自动跳下一首;用户点选的失败只提示不强切
          if (autoplay) handlePlaybackFailure();
          return;
        }
        audio.src = json.url;
        audio.load();
        if (autoplay) {
          try {
            await audio.play();
            failureCountRef.current = 0;
          } catch {
            // 自动播放策略拒绝等场景:以 pause 事件与 catch 为准,不做乐观置位
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setUrlError(err instanceof Error ? err.message : String(err));
        setIsPlaying(false);
        if (autoplay) handlePlaybackFailure();
      }
    },
    [tracks, ensureAudioAnalyser, handlePlaybackFailure],
  );

  const playTrack = useCallback(
    (index: number) => loadTrack(index, true),
    [loadTrack],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void ensureAudioAnalyser();
    if (!audio.src) {
      loadTrack(currentIndex, true);
      return;
    }
    if (audio.paused) {
      // isPlaying 以 onPlay/onPause 事件为唯一真源,这里只负责发起播放
      audio.play().then(() => {
        failureCountRef.current = 0;
      }).catch(() => {
        setIsPlaying(false);
        setUrlError((prev) => prev || '播放被浏览器拦截，请再点击一次播放按钮');
      });
    } else {
      audio.pause();
    }
  }, [currentIndex, loadTrack, ensureAudioAnalyser]);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const count = tracks.length;
    if (!count) return;
    const index = isShuffleRef.current
      ? randomNextIndex(count, currentIndex)
      : (currentIndex + 1) % count;
    loadTrack(index, true);
  }, [currentIndex, tracks.length, loadTrack]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const count = tracks.length;
    if (!count) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = isShuffleRef.current
      ? randomNextIndex(count, currentIndex)
      : (currentIndex - 1 + count) % count;
    loadTrack(index, true);
  }, [currentIndex, tracks.length, loadTrack]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(Math.max(time, 0), audio.duration);
    setCurrentTime(audio.currentTime);
  }, []);

  const getPlaybackTime = useCallback(
    () => audioRef.current?.currentTime ?? 0,
    [],
  );

  const currentTrack = tracks[currentIndex] ?? null;

  /* ---------- 锁屏/系统媒体控制(MediaSession) ---------- */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.cover ? [{ src: currentTrack.cover, sizes: '512x512' }] : [],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    try {
      session.setActionHandler('play', () => togglePlay());
      session.setActionHandler('pause', () => togglePlay());
      session.setActionHandler('previoustrack', () => prev());
      session.setActionHandler('nexttrack', () => next());
      session.setActionHandler('seekto', (details) => {
        if (details.seekTime != null && Number.isFinite(details.seekTime)) seek(details.seekTime);
      });
    } catch {
      /* 部分平台不支持这些动作 */
    }
    return () => {
      try {
        session.setActionHandler('play', null);
        session.setActionHandler('pause', null);
        session.setActionHandler('previoustrack', null);
        session.setActionHandler('nexttrack', null);
        session.setActionHandler('seekto', null);
      } catch {
        /* ignore */
      }
    };
  }, [togglePlay, next, prev, seek]);

  const handleMediaError = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src || ignoreMediaErrorRef.current) return;
    // MEDIA_ERR_ABORTED(1) 是主动换源/清源,不算播放失败
    if (audio.error?.code === 1) return;
    handlePlaybackFailure('当前歌曲加载失败，自动切换下一首…');
  }, [handlePlaybackFailure]);

  return (
    <MusicContext.Provider
      value={{
        tracks,
        playlistName,
        loading,
        error,
        urlError,
        currentIndex,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        isShuffle,
        isRepeat,
        volume,
        lyricsEnabled,
        playerExpanded,
        lyrics,
        lyricLoading: lyricsEnabled ? lyricLoading : false,
        lyricError,
        audioAnalyser,
        getPlaybackTime,
        playTrack,
        togglePlay,
        next,
        prev,
        toggleShuffle: () => setIsShuffle((v) => !v),
        toggleRepeat: () => setIsRepeat((v) => !v),
        setVolume,
        toggleLyrics,
        setPlayerExpanded,
        seek,
      }}
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrentTime(a.currentTime);
          if (a.duration && Number.isFinite(a.duration)) setDuration(a.duration);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (isRepeatRef.current) {
            audioRef.current?.play().catch(() => {});
          } else {
            next();
          }
        }}
        onError={handleMediaError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic 必须在 <MusicProvider> 内使用');
  return ctx;
}
