'use client';

import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Captions,
  Disc3,
  ExternalLink,
  LoaderCircle,
  LogIn,
  LogOut,
  Minimize2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { NETESE_OPEN_URL, type NeteaseTrack } from './netease';
import { useMusic } from './music-context';

const DISC_W = 56;
const PANEL_W = 320;
const TRACK_ROW_HEIGHT = 52;
const TRACK_LIST_HEIGHT = 224;
const TRACK_OVERSCAN = 3;

interface NeteaseProfile {
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
}

const formatTime = (seconds: number = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface VirtualTrackListProps {
  tracks: NeteaseTrack[];
  currentIndex: number;
  isPlaying: boolean;
  playTrack: (index: number) => void;
}

const VirtualTrackList = memo(function VirtualTrackList({
  tracks,
  currentIndex,
  isPlaying,
  playTrack,
}: VirtualTrackListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(() => Math.max(0, currentIndex * TRACK_ROW_HEIGHT - TRACK_LIST_HEIGHT / 2));

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rowTop = currentIndex * TRACK_ROW_HEIGHT;
    const rowBottom = rowTop + TRACK_ROW_HEIGHT;
    if (rowTop < viewport.scrollTop || rowBottom > viewport.scrollTop + TRACK_LIST_HEIGHT) {
      const nextTop = Math.max(0, rowTop - TRACK_LIST_HEIGHT / 2 + TRACK_ROW_HEIGHT / 2);
      viewport.scrollTop = nextTop;
      setScrollTop(nextTop);
    }
  }, [currentIndex]);

  const startIndex = Math.max(0, Math.floor(scrollTop / TRACK_ROW_HEIGHT) - TRACK_OVERSCAN);
  const visibleCount = Math.ceil(TRACK_LIST_HEIGHT / TRACK_ROW_HEIGHT) + TRACK_OVERSCAN * 2;
  const endIndex = Math.min(tracks.length, startIndex + visibleCount);
  const visibleTracks = tracks.slice(startIndex, endIndex);

  return (
    <div
      ref={viewportRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="glass-scroll h-56 overflow-y-auto"
    >
      <div className="relative" style={{ height: tracks.length * TRACK_ROW_HEIGHT }}>
        {visibleTracks.map((track, offset) => {
          const index = startIndex + offset;
          const isActive = index === currentIndex;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => playTrack(index)}
              className={`absolute left-2 right-2 flex h-12 items-center gap-3 rounded-xl px-2.5 text-left transition-colors ${
                isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
              }`}
              style={{ top: index * TRACK_ROW_HEIGHT + 2 }}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                  isActive
                    ? 'bg-[#9fe8d0]/20 text-[#9fe8d0]'
                    : 'bg-white/[0.06] text-white/50'
                }`}
              >
                {isPlaying && isActive ? <span className="animate-pulse">♫</span> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${isActive ? 'font-medium text-[#f4f0e8]' : 'text-white/80'}`}>
                  {track.title}
                </span>
                <span className="block truncate text-[11px] text-white/40">{track.artist}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-white/35">
                {formatTime(track.duration / 1000)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export function MusicPlayer() {
  const {
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
    playerExpanded: expanded,
    playTrack,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    toggleLyrics,
    setPlayerExpanded: setExpanded,
    seek,
  } = useMusic();

  const rootRef = useRef<HTMLDivElement>(null);
  const previousVolumeRef = useRef(0.75);
  const mobileSheetStartYRef = useRef<number | null>(null);
  const seekPointerIdRef = useRef<number | null>(null);
  const seekPreviewRef = useRef<number | null>(null);

  const [hoverPull, setHoverPull] = useState(0);
  const [neteaseLoggedIn, setNeteaseLoggedIn] = useState(false);
  const [neteaseProfile, setNeteaseProfile] = useState<NeteaseProfile | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginQrKey, setLoginQrKey] = useState('');
  const [loginQrImage, setLoginQrImage] = useState('');
  const [loginState, setLoginState] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  // 初始位置保持 SSR 安全（默认贴右下角占位），挂载后再从 localStorage 恢复
  const [pos, setPos] = useState({ x: -16, y: 0 });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isMobile || !expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded, isMobile]);

  useEffect(() => {
    let alive = true;
    fetch('/api/music/auth/status')
      .then((response) => response.json())
      .then((json) => {
        if (!alive) return;
        setNeteaseLoggedIn(!!json.loggedIn);
        setNeteaseProfile(json.profile || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const createLoginQr = async () => {
    setLoginOpen(true);
    setLoginLoading(true);
    setLoginError('');
    setLoginState('正在生成二维码…');
    setLoginQrKey('');
    setLoginQrImage('');
    try {
      const response = await fetch('/api/music/auth/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok || !json.key || !json.qrimg) {
        throw new Error(json.error || '二维码生成失败');
      }
      setLoginQrImage(json.qrimg);
      setLoginQrKey(json.key);
      setLoginState('请使用网易云音乐 App 扫码');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : String(error));
      setLoginState('');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (!loginOpen || !loginQrKey) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    const POLL_INTERVAL = 1300;
    const MAX_FAILURES = 5;

    const poll = async () => {
      try {
        const response = await fetch('/api/music/auth/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', key: loginQrKey }),
        });
        const json = await response.json();
        if (stopped) return;
        if (!response.ok || !json.ok) throw new Error(json.error || '登录状态检查失败');

        failures = 0;
        setLoginError('');

        if (json.code === 803) {
          setNeteaseLoggedIn(true);
          setNeteaseProfile(json.profile || null);
          setLoginState('登录成功');
          setLoginQrKey('');
          return;
        }
        if (json.code === 802) setLoginState('已扫码，请在手机上确认');
        else if (json.code === 800) {
          // 二维码过期自动重建:仅清 key,由下方「sign 过期触发重建」逻辑重新生成
          setLoginState('二维码已过期，正在自动刷新…');
          setLoginQrKey('');
          return;
        } else setLoginState('请使用网易云音乐 App 扫码');
      } catch (error) {
        if (stopped) return;
        failures += 1;
        if (failures >= MAX_FAILURES) {
          setLoginError('网络异常，已停止轮询，请点击「刷新二维码」重试');
          setLoginQrKey('');
          return;
        }
        setLoginError(`网络波动，正在重试（${failures}/${MAX_FAILURES}）…`);
        // 指数退避:1.3s → 2.6s → 5.2s → 8s(封顶)
        timer = setTimeout(poll, Math.min(POLL_INTERVAL * 2 ** failures, 8000));
        return;
      }

      if (!stopped) timer = setTimeout(poll, POLL_INTERVAL);
    };

    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [loginOpen, loginQrKey]);

  // 挂载后恢复保存的位置（只在客户端运行，避免水合不匹配）
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let next = { x: w - 16, y: h - 104 }; // 右下角贴边
    try {
      const saved = localStorage.getItem('yuniao-music-player');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') next = p;
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 从 localStorage 恢复外部持久化状态
    setPos({
      x: Math.min(Math.max(next.x, 8 - DISC_W), Math.max(w - 16, 8)),
      y: Math.min(Math.max(next.y, 8), Math.max(h - DISC_W - 16, 8)),
    });
  }, []);

  const drag = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const activeTrack = currentTrack;

  useLayoutEffect(() => {
    // 拖拽中只更新视图;拖拽结束(或其他吸附/校正后)才落盘,避免 pointermove 频率同步写 localStorage
    if (dragging) return;
    try {
      localStorage.setItem('yuniao-music-player', JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos, dragging]);

  const displayedTime = seekPreview ?? currentTime;
  const progressPct = duration ? Math.min((displayedTime / duration) * 100, 100) : 0;

  // createLoginQr 在上面已被定义为普通函数;这里用 ref 转发以稳定引用给 effect 用
  const createLoginQrRef = useRef(createLoginQr);
  useEffect(() => {
    createLoginQrRef.current = createLoginQr;
  });

  // 登录面板打开、但当前无有效 key(首次进入或二维码过期后)时自动生成,避免手动刷新
  useEffect(() => {
    if (!loginOpen || loginQrKey || loginLoading) return;
    void createLoginQrRef.current();
  }, [loginOpen, loginQrKey, loginLoading]);

  const logoutNetease = async () => {
    await fetch('/api/music/auth/status', { method: 'DELETE' }).catch(() => {});
    setNeteaseLoggedIn(false);
    setNeteaseProfile(null);
  };

  // iOS Safari 的 audio.volume 只读,音量控件无效,降级为系统音量提示
  const [iosVolumeUnsupported, setIosVolumeUnsupported] = useState(false);
  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIosVolumeUnsupported(isIOS);
    };
    detect();
  }, []);

  const toggleMute = () => {
    if (volume > 0.01) {
      previousVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 0.75);
    }
  };

  /* ---------- 拖动 / 吸附 ---------- */
  const tuckToEdge = (x: number) => {
    const w = window.innerWidth;
    return x + DISC_W / 2 < w / 2 ? 8 - DISC_W : w - 16;
  };

  const handleDragStart = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: r.left,
      origY: r.top,
    };
    movedRef.current = false;
    setDragging(true);
    setHoverPull(0);
    // 对齐实际渲染位置（hover 拉出后可能与 pos 不一致）
    setPos((p) => ({ x: r.left, y: r.top }));
    el.setPointerCapture?.(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) movedRef.current = true;

    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const maxX = window.innerWidth - r.width - 4;
    const maxY = window.innerHeight - r.height - 4;
    setPos({
      x: Math.min(Math.max(d.origX + dx, 4), Math.max(maxX, 4)),
      y: Math.min(Math.max(d.origY + dy, 4), Math.max(maxY, 4)),
    });
  };

  const handleDragEnd = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture?.(e.pointerId);
    drag.current = null;
    setDragging(false);

    if (expanded) return; // 面板只做位置校正，不吸附
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    setPos((p) => ({ ...p, x: tuckToEdge(cx) }));
  };

  const handleCollapsedClick = () => {
    if (movedRef.current) return;
    if (isMobile) {
      setExpanded(true);
      return;
    }
    const w = window.innerWidth;
    setPos((p) => ({
      // 面板比唱片宽，展开时先水平收进视口
      x: Math.min(Math.max(p.x, 4), Math.max(w - PANEL_W - 8, 4)),
      y: Math.min(Math.max(p.y, 8), Math.max(window.innerHeight - 480, 8)),
    }));
    setExpanded(true);
  };

  // 展开后按面板实际高度校正垂直位置，避免超出视口
  useLayoutEffect(() => {
    if (!expanded || isMobile) return;
    const el = rootRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = window.innerHeight;
    if (rect.top < 8 || rect.bottom > h - 8) {
      setPos((p) => ({ ...p, y: Math.min(Math.max(p.y, 8), Math.max(h - rect.height - 8, 8)) }));
    }
  }, [expanded, isMobile]);

  const collapse = () => {
    setExpanded(false);
    if (isMobile) return;
    setPos((p) => ({ ...p, x: tuckToEdge(p.x + PANEL_W / 2) }));
  };

  const handleHover = (entered: boolean) => {
    if (dragging || expanded) return;
    if (!entered) {
      setHoverPull(0);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    let target = 0;
    if (r.left < margin) target = margin - r.left;
    else if (r.right > window.innerWidth - margin) {
      target = window.innerWidth - margin - r.right;
    }
    setHoverPull(target);
  };

  const getSeekTime = (element: HTMLDivElement, clientX: number) => {
    if (!duration) return 0;
    const rect = element.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return ratio * duration;
  };

  const updateSeekPreview = (element: HTMLDivElement, clientX: number) => {
    const time = getSeekTime(element, clientX);
    seekPreviewRef.current = time;
    setSeekPreview(time);
    return time;
  };

  const handleSeekStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!duration || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    seekPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateSeekPreview(event.currentTarget, event.clientX);
  };

  const handleSeekMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (seekPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    updateSeekPreview(event.currentTarget, event.clientX);
  };

  const finishSeeking = (element: HTMLDivElement, pointerId: number, clientX?: number) => {
    if (seekPointerIdRef.current !== pointerId) return;
    // pointer cancel(clientX 为空)时回弹到当前进度,不应用预览位置
    if (clientX !== undefined) {
      seek(updateSeekPreview(element, clientX));
    }
    seekPointerIdRef.current = null;
    seekPreviewRef.current = null;
    setSeekPreview(null);
    if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
  };

  const handleSeekEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    finishSeeking(event.currentTarget, event.pointerId, event.clientX);
  };

  const handleSeekCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishSeeking(event.currentTarget, event.pointerId);
  };

  const handleMobileSheetStart = (event: React.PointerEvent<HTMLDivElement>) => {
    mobileSheetStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleMobileSheetEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = mobileSheetStartYRef.current;
    mobileSheetStartYRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (start !== null && event.clientY - start > 64) collapse();
  };

  /* ---------- 渲染 ---------- */
  return (
    <motion.div
      ref={rootRef}
      className="fixed z-[60]"
      style={
        isMobile
          ? expanded
            ? { left: 0, right: 0, bottom: 0, top: 'auto', touchAction: 'auto' }
            : { left: 'auto', right: 14, bottom: 'calc(env(safe-area-inset-bottom) + 16px)', top: 'auto', touchAction: 'auto' }
          : { left: pos.x, top: pos.y, touchAction: 'none' }
      }
    >
      <AnimatePresence>
        {expanded && isMobile ? (
          <motion.button
            key="mobile-player-backdrop"
            type="button"
            aria-label="收起播放器"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={collapse}
            className="fixed inset-0 z-0 cursor-default bg-black/58 backdrop-blur-[2px]"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {expanded ? (
          /* ================= 展开面板 ================= */
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="music-player-panel relative z-10 max-h-[78svh] w-screen overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b0d12]/96 pb-[env(safe-area-inset-bottom)] shadow-[0_20px_55px_rgba(0,0,0,0.52)] md:max-h-none md:w-[320px] md:overflow-hidden md:rounded-3xl md:pb-0"
          >
            {/* 顶部拖拽头 */}
            <div
              onPointerDown={isMobile ? handleMobileSheetStart : handleDragStart}
              onPointerMove={isMobile ? undefined : handleDragMove}
              onPointerUp={isMobile ? handleMobileSheetEnd : handleDragEnd}
              onPointerCancel={isMobile ? () => { mobileSheetStartYRef.current = null; } : handleDragEnd}
              className="relative flex touch-none items-center gap-3 border-b border-white/10 p-4 pt-5 md:cursor-grab md:p-4 md:active:cursor-grabbing"
            >
              <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/18 md:hidden" />
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15">
                {activeTrack?.cover ? (
                  <img
                    src={activeTrack.cover}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/5 text-[#9fe8d0]">
                    <Music2 className="h-6 w-6" />
                  </div>
                )}
                {isPlaying && activeTrack?.cover && (
                  <span
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                    style={{ opacity: 0.4 }}
                  >
                    <Disc3 className="h-6 w-6 text-white animate-spin" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#f4f0e8]">
                  {activeTrack?.title ?? '尚未播放'}
                </p>
                <p className="truncate text-xs text-white/50">
                  {activeTrack ? `${activeTrack.artist} · ${activeTrack.album}` : playlistName}
                </p>
              </div>

              <button
                type="button"
                aria-label="最小化"
                onClick={collapse}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 pt-3">
              {/* 进度 */}
              <div className="space-y-1.5">
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="播放进度"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(duration || 0)}
                  aria-valuenow={Math.round(displayedTime)}
                  aria-valuetext={`${formatTime(displayedTime)} / ${formatTime(duration)}`}
                  className="group relative h-5 w-full touch-none cursor-ew-resize select-none"
                  onPointerDown={handleSeekStart}
                  onPointerMove={handleSeekMove}
                  onPointerUp={handleSeekEnd}
                  onPointerCancel={handleSeekCancel}
                  onKeyDown={(event) => {
                    if (!duration) return;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      seek(Math.max(0, currentTime - 5));
                    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      seek(Math.min(duration, currentTime + 5));
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      seek(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      seek(duration);
                    }
                  }}
                >
                  <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#9fe8d0]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div
                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9fe8d0] shadow-[0_0_8px_rgba(159,232,208,0.8)] transition-opacity ${
                      seekPreview !== null ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                    }`}
                    style={{ left: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] tabular-nums text-white/40">
                  <span>{formatTime(displayedTime)}</span>
                  <span>
                    {activeTrack?.duration
                      ? formatTime(activeTrack.duration / 1000)
                      : formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* 控制键 */}
              <div className="mt-2 flex items-center justify-center gap-1">
                <button
                  type="button"
                  aria-label="随机播放"
                  onClick={toggleShuffle}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isShuffle
                      ? 'bg-[#9fe8d0]/15 text-[#9fe8d0]'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="上一首"
                  onClick={prev}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? '暂停' : '播放'}
                  onClick={togglePlay}
                  className="mx-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#9fe8d0] text-[#050608] shadow-[0_0_24px_rgba(159,232,208,0.35)] transition-transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="下一首"
                  onClick={next}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="单曲循环"
                  onClick={toggleRepeat}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isRepeat
                      ? 'bg-[#d7a35b]/15 text-[#d7a35b]'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isRepeat ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex h-10 items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5">
                {iosVolumeUnsupported ? (
                  <span className="flex-1 text-center text-[11px] text-white/40">音量请使用系统/耳机控制</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleMute}
                      title={volume > 0.01 ? '静音' : '恢复音量'}
                      aria-label={volume > 0.01 ? '静音' : '恢复音量'}
                      className="flex h-7 w-7 shrink-0 items-center justify-center text-white/55 transition-colors hover:text-[#9fe8d0]"
                    >
                      {volume <= 0.01 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(event) => {
                        const nextVolume = Number(event.currentTarget.value);
                        if (nextVolume > 0.01) previousVolumeRef.current = nextVolume;
                        setVolume(nextVolume);
                      }}
                      aria-label="音量"
                      className="music-volume-slider min-w-0 flex-1"
                      style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
                    />
                  </>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={lyricsEnabled}
                  onClick={toggleLyrics}
                  title={lyricsEnabled ? '关闭歌词' : '开启歌词'}
                  className={`flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[11px] transition-colors ${
                    lyricsEnabled ? 'text-[#9fe8d0]' : 'text-white/40 hover:text-white/65'
                  }`}
                >
                  <Captions className="h-3.5 w-3.5" />
                  <span>歌词</span>
                  <span
                    aria-hidden="true"
                    className={`relative h-4 w-7 rounded-full transition-colors ${
                      lyricsEnabled ? 'bg-[#9fe8d0]/28' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
                        lyricsEnabled ? 'left-3.5 bg-[#b7ffe8]' : 'left-0.5 bg-white/40'
                      }`}
                    />
                  </span>
                </button>
              </div>

              {urlError && (
                <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {urlError}
                </p>
              )}
            </div>

            {/* 歌单 */}
            <div className="relative border-t border-white/10">
              {loading && (
                <div className="h-56 px-3 py-4 text-center text-xs text-white/40">歌单加载中…</div>
              )}
              {error && (
                <div className="h-56 px-3 py-4 text-center text-xs text-red-300">{error}</div>
              )}
              {!loading && !error && (
                <VirtualTrackList
                  tracks={tracks}
                  currentIndex={currentIndex}
                  isPlaying={isPlaying}
                  playTrack={playTrack}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0b0d12] to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0b0d12] to-transparent" />

              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
                <span className="truncate text-[11px] text-white/40">
                  {playlistName || '网易云歌单'}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={neteaseLoggedIn ? logoutNetease : createLoginQr}
                    title={neteaseLoggedIn ? '退出网易云登录' : '登录网易云'}
                    className="flex max-w-24 items-center gap-1 text-[11px] text-[#9fe8d0]/80 transition-colors hover:text-[#9fe8d0]"
                  >
                    {neteaseLoggedIn ? <LogOut className="h-3 w-3 shrink-0" /> : <LogIn className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{neteaseLoggedIn ? neteaseProfile?.nickname || '已登录' : '登录'}</span>
                  </button>
                  <a
                    href={NETESE_OPEN_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="打开网易云"
                    className="text-white/35 transition-colors hover:text-white/70"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {loginOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col bg-[#0a0c11]/98 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">登录网易云音乐</p>
                      <p className="mt-1 text-[11px] text-white/40">登录态仅保存在当前浏览器</p>
                    </div>
                    <button
                      type="button"
                      title="关闭"
                      onClick={() => setLoginOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-white p-2 shadow-[0_0_36px_rgba(230,0,38,0.18)]">
                      {loginQrImage ? (
                        <img src={loginQrImage} alt="网易云登录二维码" className="h-full w-full" />
                      ) : loginLoading ? (
                        <LoaderCircle className="h-7 w-7 animate-spin text-[#e60026]" />
                      ) : (
                        <LogIn className="h-7 w-7 text-[#e60026]" />
                      )}
                    </div>

                    <p className={`mt-4 text-center text-xs ${loginError ? 'text-red-300' : 'text-white/60'}`}>
                      {loginError || loginState}
                    </p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {!loginQrKey && !neteaseLoggedIn && (
                      <button
                        type="button"
                        onClick={createLoginQr}
                        disabled={loginLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:opacity-50"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        刷新二维码
                      </button>
                    )}
                    {neteaseLoggedIn && (
                      <button
                        type="button"
                        onClick={() => setLoginOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#9fe8d0] px-4 py-2 text-xs font-medium text-[#07110e]"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        完成
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ================= 收起唱片 ================= */
          <motion.button
            key="disc"
            type="button"
            aria-label="展开播放器"
            onPointerDown={isMobile ? undefined : handleDragStart}
            onPointerMove={isMobile ? undefined : handleDragMove}
            onPointerUp={isMobile ? undefined : handleDragEnd}
            onPointerCancel={isMobile ? undefined : handleDragEnd}
            onClick={handleCollapsedClick}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            animate={{ x: hoverPull }}
            transition={
              dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }
            }
            className="relative block h-14 w-14 cursor-pointer md:cursor-grab md:active:cursor-grabbing"
          >
            {/* 唱片纹路（播放时旋转） */}
            <span
              className={`absolute inset-0 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.6)] ${
                isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
              }`}
              style={{
                background:
                  'repeating-radial-gradient(circle at center, #0c0e12 0px, #0c0e12 1px, #23272f 1px, #23272f 3px, #12151b 3px, #12151b 4px)',
              }}
            />
            <span className="absolute inset-0 rounded-full ring-1 ring-white/20" />
            {/* 中心标签 */}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#2b2f3a] to-[#171a21] ring-1 ring-white/20">
                {isPlaying ? (
                  <Disc3 className="h-3.5 w-3.5 text-[#9fe8d0]" />
                ) : (
                  <Play className="ml-0.5 h-3 w-3 text-[#9fe8d0]" />
                )}
              </span>
            </span>
            {/* 右上角小标记 */}
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d7a35b] text-[#050608] shadow">
              <Music2 className="h-2 w-2" />
            </span>
            {/* 播放失败角标:收起状态下也要能感知到播放异常 */}
            {urlError ? (
              <span
                aria-hidden
                className="pointer-events-none absolute -left-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white shadow"
              >
                !
              </span>
            ) : null}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
