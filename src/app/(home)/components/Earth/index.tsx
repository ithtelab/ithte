'use client';

import { useEffect, useRef } from 'react';

const SRC = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';

export function Earth() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: import('hls.js').default | null = null;
    let initialized = false;
    let cancelled = false;

    const saveData = typeof navigator !== 'undefined' && 'connection' in navigator
      ? Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData)
      : false;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initialize = async () => {
      if (initialized) return;
      initialized = true;
      // 按需动态加载 hls.js light 构建(去掉 MPEG-TS 之外的非必需组件),避免首屏捆绑全量库
      const Hls = (await import('hls.js')).default;
      if (cancelled) return;
      if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1 });
        hls.loadSource(SRC);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = SRC;
      }
      if (reduceMotion || saveData) {
        video.pause();
        return;
      }
      await video.play().catch(() => undefined);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !document.hidden) {
          void initialize();
        } else {
          video.pause();
        }
      },
      { rootMargin: '300px 0px', threshold: 0.02 },
    );

    const onVisibility = () => {
      if (document.hidden || reduceMotion || saveData) video.pause();
      else if (video.getBoundingClientRect().bottom > 0) void video.play().catch(() => undefined);
    };

    observer.observe(video);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause();
      hls?.destroy();
    };
  }, []);

  return (
    <>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/60" />
    </>
  );
}
