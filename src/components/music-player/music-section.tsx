'use client';

import {
  ExternalLink,
  Headphones,
  Heart,
  Music2,
  Pause,
  Play,
  Radio,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/neon-button';
import { Card } from '@/components/ui/card';

import { NETESE_OPEN_URL } from './netease';
import { useMusic } from './music-context';
import { GlassScroll } from './glass-scroll';

const formatTime = (seconds: number = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const highlights = [
  {
    title: '沉浸声场',
    description: '精选热歌榜 · 私人歌单，戴上耳机就是一场私享音乐会。',
    icon: Headphones,
  },
  {
    title: '全网曲库',
    description: '直接对接网易云音乐，数百首曲目随点随播，不受格式限制。',
    icon: Radio,
  },
  {
    title: '随播随切',
    description: '页面右下角常驻小唱片，点播、切歌、收藏全程不断档。',
    icon: Sparkles,
  },
];

export function MusicSection() {
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
    playTrack,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    seek,
  } = useMusic();

  const progressPct = duration ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <section data-section className="relative overflow-hidden px-6 py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#9fe8d0]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#d7a35b]/[0.03] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl">
        <Card
          data-reveal
          className="relative overflow-hidden border border-white/10 bg-background/40 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-16"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-10">
              <div className="space-y-5">
                <Badge
                  variant="outline"
                  className="w-fit border-white/20 bg-background/40 text-xs uppercase tracking-[0.2em] text-[#9fe8d0]/90 backdrop-blur"
                >
                  黑天鹅电台 · listen app
                </Badge>
                <div className="space-y-4">
                  <h2
                    data-section-title
                    className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl"
                  >
                    听见你的<em className="font-semibold not-italic text-[#9fe8d0]">热爱</em>
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
                    右侧就是我的网易云歌单。点任意一首即可播放，
                    页面右下角的小唱片会和你同步——这就是属于我的背景音乐。
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row">
                <Button
                  size="lg"
                  variant="solid"
                  onClick={togglePlay}
                  className="text-base"
                >
                  {isPlaying ? '暂停播放' : '立即播放'}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  asChild
                  className="text-base"
                >
                  <a href={NETESE_OPEN_URL} target="_blank" rel="noreferrer">
                    在网易云打开歌单
                  </a>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-1">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="group h-full rounded-3xl border border-white/10 bg-background/60 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-[#9fe8d0]/90">
                      <highlight.icon className="h-4 w-4" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {highlight.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/70">
                      {highlight.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* 正在播放 */}
              <div className="shrink-0 rounded-3xl border border-white/10 bg-background/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="flex items-start gap-4">
                  <div
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/20 via-white/10 to-transparent ${
                      isPlaying && currentTrack ? 'animate-[spin_6s_linear_infinite]' : ''
                    }`}
                    style={
                      currentTrack?.cover
                        ? {
                            backgroundImage: `url(${currentTrack.cover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {!currentTrack?.cover && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-[#9fe8d0]">
                        <Music2 className="h-7 w-7" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                          Now playing
                        </p>
                        <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
                          {currentTrack?.title ?? '尚未播放'}
                        </h3>
                        <p className="truncate text-sm text-foreground/60">
                          {currentTrack
                            ? `${currentTrack.artist} · ${currentTrack.album}`
                            : playlistName || '网易云歌单'}
                        </p>
                      </div>
                      <a
                        href={
                          currentTrack
                            ? `https://music.163.com/#/song?id=${currentTrack.id}`
                            : NETESE_OPEN_URL
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label="收藏到网易云"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/60 text-foreground/70 backdrop-blur transition-colors hover:text-[#e5484d]"
                      >
                        <Heart className="h-4 w-4" />
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-xs uppercase tracking-[0.2em]"
                    >
                      <a
                        href={
                          currentTrack
                            ? `https://music.163.com/#/song?id=${currentTrack.id}`
                            : NETESE_OPEN_URL
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        在网易云打开
                        <ExternalLink className="ml-1.5 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* 进度 */}
                <div className="space-y-3 pt-6">
                  <div className="flex items-center justify-between text-xs font-medium tracking-wide text-foreground/50">
                    <span className="tabular-nums">{formatTime(currentTime)}</span>
                    <span className="tabular-nums">
                      {currentTrack?.duration
                        ? formatTime(currentTrack.duration / 1000)
                        : formatTime(duration)}
                    </span>
                  </div>
                  <div
                    className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/10"
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.min(
                        Math.max(((e.clientX - rect.left) / rect.width) * 100, 0),
                        100,
                      );
                      if (duration) seek((pct / 100) * duration);
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9fe8d0] to-[#9fe8d0]/40 transition-[width]"
                      style={{ width: `${progressPct}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#9fe8d0] opacity-0 shadow-[0_0_10px_rgba(159,232,208,0.9)] transition-opacity group-hover:opacity-100"
                      style={{ left: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* 控制键 */}
                <div className="flex items-center justify-between pt-5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="随机播放"
                      onClick={toggleShuffle}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/60 text-foreground/70 backdrop-blur transition-colors hover:text-foreground ${
                        isShuffle ? 'text-[#9fe8d0]' : ''
                      }`}
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="上一首"
                      onClick={prev}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/60 text-foreground/70 backdrop-blur transition-colors hover:text-foreground"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    aria-label={isPlaying ? '暂停' : '播放'}
                    onClick={togglePlay}
                    className="h-12 w-12 rounded-full bg-[#9fe8d0] text-background shadow-[0_0_28px_rgba(159,232,208,0.45)] hover:bg-[#9fe8d0]/90"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="下一首"
                      onClick={next}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/60 text-foreground/70 backdrop-blur transition-colors hover:text-foreground"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="单曲循环"
                      onClick={toggleRepeat}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/60 text-foreground/70 backdrop-blur transition-colors hover:text-foreground ${
                        isRepeat ? 'text-[#d7a35b]' : ''
                      }`}
                    >
                      {isRepeat ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 歌单列表 */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-background/70 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="mb-3 flex shrink-0 items-center justify-between px-1">
                  <span className="text-xs uppercase tracking-[0.25em] text-foreground/50">
                    Playlist · 歌单
                  </span>
                  <span className="text-xs tabular-nums text-foreground/40">
                    {loading ? '加载中' : `${tracks.length} 首`}
                  </span>
                </div>

                <div className="relative min-h-0 flex-1 min-h-[20rem] lg:min-h-0">
                  <div className="absolute inset-0">
                    <GlassScroll className="h-full" contentClassName="space-y-1.5 pr-1.5">
                  {loading && (
                      <div className="px-3 py-6 text-center text-sm text-foreground/40">
                        歌单加载中…
                      </div>
                    )}
                    {error && (
                      <div className="px-3 py-6 text-center text-sm text-red-300">{error}</div>
                    )}
                    {!loading &&
                      !error &&
                      tracks.map((track, index) => {
                        const isActive = index === currentIndex;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => playTrack(index)}
                            aria-pressed={isActive}
                            className={`group flex w-full items-center gap-3.5 rounded-2xl border p-3 text-left backdrop-blur-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fe8d0]/50 ${
                              isActive
                                ? 'border-[#9fe8d0]/30 bg-[#9fe8d0]/[0.06]'
                                : 'border-white/10 bg-background/60 hover:-translate-y-0.5 hover:border-white/20'
                            }`}
                          >
                            <div
                              className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10 transition-colors ${
                                isActive ? 'ring-2 ring-[#9fe8d0]/40' : ''
                              }`}
                            >
                              {track.cover ? (
                                <img
                                  src={track.cover}
                                  alt=""
                                  draggable={false}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-background/70 text-sm font-semibold text-foreground/70">
                                  {track.title.charAt(0)}
                                </div>
                              )}
                              {isActive && isPlaying && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                                  <span className="flex h-3.5 items-end gap-[2px]">
                                    {[0, 1, 2].map((bar) => (
                                      <span
                                        key={bar}
                                        className="eq-bar w-[3px] rounded-full bg-[#9fe8d0]"
                                        style={{
                                          height: '100%',
                                          animationDelay: `${bar * 160}ms`,
                                        }}
                                      />
                                    ))}
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="flex flex-1 items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className={`truncate text-sm font-semibold ${
                                    isActive ? 'text-[#9fe8d0]' : 'text-foreground/90'
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <p className="truncate text-xs text-foreground/60">
                                  {track.artist}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 tabular-nums">
                                {formatTime(track.duration / 1000)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </GlassScroll>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-background/70 via-background/35 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-background/70 via-background/35 to-transparent" />
                </div>
              </div>

              {urlError && (
                <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {urlError}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
