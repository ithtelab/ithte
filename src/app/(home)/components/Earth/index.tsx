'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const SRC = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';

export function Earth() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;
    let initialized = false;

    const initialize = () => {
      if (initialized) return;
      initialized = true;

      if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1 });
        hls.loadSource(SRC);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = SRC;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !document.hidden) {
          initialize();
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: '300px 0px', threshold: 0.02 },
    );

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else if (video.getBoundingClientRect().bottom > 0) void video.play().catch(() => undefined);
    };

    observer.observe(video);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
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
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/60" />
    </>
  );
}
