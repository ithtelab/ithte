'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ViewportVideo } from '@/components/ui/viewport-video';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260510_060007_60275ce7-030c-4668-a160-8f364ec537d3.mp4';

export function Quote() {
  const sectionRef = useRef<HTMLElement>(null);
  const peakRef = useRef<HTMLSpanElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const peak = peakRef.current;
    const lines = linesRef.current;
    const tail = tailRef.current;
    if (!section || !peak || !lines || !tail) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set([peak, lines.children, tail], { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 82%',
            toggleActions: 'play none none none',
            once: true,
          },
        })
        .from(peak, { autoAlpha: 0, scale: 1.8, y: 80, ease: 'power3.out', duration: 0.9 }, 0)
        .from(
          lines.children,
          { autoAlpha: 0, y: 42, stagger: 0.1, ease: 'power3.out', duration: 0.6 },
          0.14,
        )
        .from(tail, { autoAlpha: 0, y: 30, ease: 'power3.out', duration: 0.55 }, 0.3);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="quote"
      data-section
      className="relative min-h-[100svh] overflow-hidden"
    >
      <div data-parallax className="absolute inset-[-10%] will-change-transform">
        <ViewportVideo
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          poster="/travel/ocean-sunset.png"
          aria-label="登顶山峰的向往"
          className="quote-video h-full w-full object-cover"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,0.78)_0%,rgba(5,6,8,0.22)_34%,rgba(5,6,8,0.45)_62%,rgba(5,6,8,0.97)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(5,6,8,0.72)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-[linear-gradient(180deg,rgba(5,6,8,0.95),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(0deg,rgba(5,6,8,0.98),transparent)]" />
      <div className="pointer-events-none absolute -left-1/4 top-1/4 h-[55%] w-[70%] bg-[radial-gradient(ellipse_at_center,rgba(215,163,91,0.22),transparent_68%)]" />
      <div className="pointer-events-none absolute -right-1/5 bottom-1/5 h-[48%] w-[55%] bg-[radial-gradient(ellipse_at_center,rgba(159,232,208,0.12),transparent_68%)]" />

      <p
        aria-hidden
        className="quote-watermark pointer-events-none absolute left-1/2 top-[6%] z-[1] -translate-x-1/2 select-none whitespace-nowrap font-black leading-none tracking-[-0.08em] text-[26vw] text-white/[0.07] md:top-[2%] md:text-[20vw]"
      >
        SUMMIT
      </p>

      <div className="relative z-10 flex min-h-[100svh] flex-col justify-center px-4 py-24 md:px-8 md:py-28">
        <div className="mx-auto w-full max-w-7xl text-center">
          <blockquote className="mx-auto max-w-6xl">
            <div ref={linesRef} className="space-y-3 md:space-y-4">
              <p className="text-xl font-medium tracking-[-0.03em] text-white/55 md:text-3xl lg:text-4xl">
                半山腰风景很美，
              </p>
              <p className="text-xl font-medium tracking-[-0.03em] text-white/55 md:text-3xl lg:text-4xl">
                然而我还是更想到
              </p>
            </div>

            <span
              ref={peakRef}
              className="quote-peak mt-2 block font-black leading-[0.88] tracking-[-0.08em] text-[#d7a35b] md:mt-4"
            >
              山顶
            </span>

            <p
              ref={tailRef}
              className="mt-4 text-2xl font-black tracking-[-0.05em] text-white md:mt-6 md:text-5xl lg:text-6xl"
            >
              去看看。
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
