'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';

type ViewportVideoProps = Omit<ComponentProps<'video'>, 'src' | 'autoPlay'> & {
  src: string;
};

export function ViewportVideo({ src, muted = true, loop = true, playsInline = true, ...props }: ViewportVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        loadObserver.disconnect();
      },
      { rootMargin: '600px 0px' },
    );

    const playbackObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = !!entry?.isIntersecting;
        if (visibleRef.current && !document.hidden) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.08 },
    );

    const handleVisibility = () => {
      if (document.hidden) video.pause();
      else if (video.getBoundingClientRect().bottom > 0 && video.getBoundingClientRect().top < window.innerHeight) {
        void video.play().catch(() => undefined);
      }
    };

    loadObserver.observe(video);
    playbackObserver.observe(video);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      loadObserver.disconnect();
      playbackObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    if (visibleRef.current && !document.hidden) void video.play().catch(() => undefined);
    else video.pause();
  }, [shouldLoad]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload="none"
      {...props}
    />
  );
}
