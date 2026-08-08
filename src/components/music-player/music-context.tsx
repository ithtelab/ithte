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
    if (!track) return;
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
  }, [currentIndex, tracks]);

  /* ---------- 播放 ---------- */
  const loadTrack = useCallback(
    async (index: number, autoplay: boolean) => {
      const audio = audioRef.current;
      const track = tracks[index];
      if (!audio || !track) return;
      if (autoplay) void ensureAudioAnalyser();
      setCurrentIndex(index);
      setUrlError('');
      setLyricLoading(true);
      setLyricError('');
      setLyrics([]);
      try {
        const res = await fetch(`/api/music/url?id=${track.id}`);
        const json = await res.json();
        if (!res.ok || !json.ok || !json.url) {
          setUrlError(json.error || '播放地址获取失败');
          audio.removeAttribute('src');
          audio.load();
          setIsPlaying(false);
          return;
        }
        audio.src = json.url;
        audio.load();
        if (autoplay) {
          audio.play().catch(() => setIsPlaying(false));
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : String(err));
        setIsPlaying(false);
      }
    },
    [tracks, ensureAudioAnalyser],
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
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentIndex, loadTrack, ensureAudioAnalyser]);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const count = tracks.length;
    if (!count) return;
    const index = isShuffleRef.current
      ? Math.floor(Math.random() * count)
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
      ? Math.floor(Math.random() * count)
      : (currentIndex - 1 + count) % count;
    loadTrack(index, true);
  }, [currentIndex, tracks.length, loadTrack]);

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
        lyricLoading,
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
