'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HiOutlineMapPin } from 'react-icons/hi2';

const COORDS = {
  lat: '35.4149° N',
  lng: '116.5872° E',
} as const;

export function Location() {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const map = mapRef.current;
    const pin = pinRef.current;
    if (!section || !map || !pin) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set(map, { scale: 1 });
        gsap.set(pin, { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      gsap.set(map, { scale: 1.28 });
      gsap.set(pin, { autoAlpha: 0, y: -120, scale: 0.4 });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            end: 'top 18%',
            scrub: 0.65,
          },
        })
        .to(map, { scale: 1, ease: 'none', duration: 1 }, 0)
        .to(pin, { autoAlpha: 1, y: 0, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.35);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="location"
      data-section
      className="relative min-h-[100svh] overflow-hidden"
    >
      <div ref={mapRef} className="absolute inset-[-6%] will-change-transform">
        <iframe
          title="济宁地图"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.openstreetmap.org/export/embed.html?bbox=116.25%2C35.20%2C116.90%2C35.65&amp;layer=mapnik&amp;marker=35.4149%2C116.5872"
          className="location-map h-full w-full border-0 grayscale-[0.7] brightness-[0.55] contrast-[1.2] saturate-[0.35]"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,0.82)_0%,rgba(5,6,8,0.35)_38%,rgba(5,6,8,0.55)_68%,rgba(5,6,8,0.94)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_22%,rgba(5,6,8,0.72)_100%)]" />
      <div className="pointer-events-none absolute -left-1/4 top-0 h-[55%] w-[70%] bg-[radial-gradient(ellipse_at_center,rgba(159,232,208,0.14),transparent_65%)]" />
      <div className="pointer-events-none absolute -right-1/5 bottom-1/4 h-[45%] w-[55%] bg-[radial-gradient(ellipse_at_center,rgba(215,163,91,0.12),transparent_68%)]" />

      <p
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[10%] z-[1] -translate-x-1/2 select-none whitespace-nowrap font-black leading-none tracking-[-0.08em] text-[22vw] text-white/[0.05] md:top-[6%] md:text-[16vw]"
      >
        济宁
      </p>

      <div
        ref={pinRef}
        className="pointer-events-none absolute left-[50%] top-[53%] z-[2] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="location-ring location-ring--1 absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#9fe8d0]/50 md:h-40 md:w-40" />
          <span className="location-ring location-ring--2 absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#9fe8d0]/40 md:h-40 md:w-40" />
          <span className="location-ring location-ring--3 absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d7a35b]/35 md:h-40 md:w-40" />
        </div>
        <div className="relative flex flex-col items-center">
          <span className="location-pin-core mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#9fe8d0] text-[#050608] md:h-12 md:w-12">
            <HiOutlineMapPin className="h-6 w-6" aria-hidden />
          </span>
          <span className="rounded-full bg-[#050608]/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            Jining · 济宁
          </span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-10 pt-28 md:px-8 md:pb-14">
        <div className="mx-auto w-full max-w-7xl">
          <h2
            data-section-title
            className="max-w-5xl text-balance text-5xl font-black leading-[1.05] tracking-[-0.06em] text-white md:text-7xl lg:text-[6.5rem]"
          >
            目前我在{' '}
            <em className="font-normal not-italic text-[#9fe8d0]">山东</em>{' '}
            <em className="font-normal not-italic text-[#d7a35b]">济宁</em>
            <br />
            过着平凡而快乐的生活
          </h2>

          <div
            data-reveal
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/12 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45 md:mt-12 md:gap-x-12"
          >
            <span>
              LAT <strong className="ml-2 font-semibold text-[#9fe8d0]">{COORDS.lat}</strong>
            </span>
            <span>
              LNG <strong className="ml-2 font-semibold text-[#d7a35b]">{COORDS.lng}</strong>
            </span>
            <span className="text-white/55">East China · 华东</span>
          </div>
        </div>
      </div>
    </section>
  );
}
