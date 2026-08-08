'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './index.scss';

export function Sponsor() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = section.querySelector<HTMLElement>('[data-sponsor-stage]');
    const slots = section.querySelectorAll<HTMLElement>('[data-sponsor-slot]');
    const beam = section.querySelectorAll<HTMLElement>('[data-sponsor-beam]');

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set([stage, ...slots, ...beam], { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          toggleActions: 'play none none none',
          once: true,
        },
      });

      tl.from(stage, { autoAlpha: 0, y: 64, scale: 0.92, ease: 'power3.out', duration: 0.85 }, 0)
        .from(slots, { autoAlpha: 0, y: 38, scale: 0.96, stagger: 0.08, ease: 'power3.out', duration: 0.65 }, 0.12)
        .from(beam, { scaleX: 0, autoAlpha: 0, stagger: 0.06, ease: 'power2.out', duration: 0.5 }, 0.28);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="sponsor"
      data-section
      className="sponsor relative overflow-hidden px-4 py-20 md:min-h-[100svh] md:px-8 md:py-28"
    >
      <div className="sponsor-aurora pointer-events-none absolute inset-0" />
      <div className="sponsor-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(83,157,253,0.22),transparent_68%)] blur-3xl" />

      <p
        aria-hidden
        className="sponsor-watermark pointer-events-none absolute left-1/2 top-[6%] z-0 -translate-x-1/2 select-none whitespace-nowrap font-black leading-none tracking-[-0.08em] text-[24vw] text-white/[0.045] md:top-[2%] md:text-[18vw]"
      >
        FORWARD
      </p>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center text-center">
        <p data-reveal className="mb-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#539dfd]">
          Exclusive Partners
        </p>

        <h2
          data-section-title
          className="text-balance text-5xl font-black leading-[1.05] tracking-[-0.06em] text-white md:text-7xl lg:text-[6.5rem]"
        >
          一路<em className="font-normal not-italic text-[#539dfd]">前行</em>
        </h2>

        <p data-reveal className="mt-6 max-w-xl text-sm leading-7 text-white/62 md:text-base md:leading-8">
          感谢每一位同行者
        </p>

        <div className="relative mt-12 w-full max-w-6xl md:mt-16 lg:mt-20">
          <div
            data-sponsor-beam
            aria-hidden
            className="sponsor-beam pointer-events-none absolute left-[8%] right-[8%] top-[46%] hidden h-px origin-left bg-[linear-gradient(90deg,transparent,rgba(83,157,253,0.55),transparent)] lg:block"
          />

          <div className="grid items-center gap-6 lg:grid-cols-[0.85fr_1.3fr_0.85fr] lg:gap-4">
            <VacantSlot label="同行者席位" />

            <div
              data-sponsor-stage
              className="sponsor-stage relative rounded-[32px] border border-[#539dfd]/35 bg-[linear-gradient(160deg,rgba(16,28,48,0.95),rgba(8,12,20,0.92))] px-6 py-10 shadow-[0_0_0_1px_rgba(83,157,253,0.12),0_30px_100px_rgba(0,0,0,0.55),0_0_80px_rgba(83,157,253,0.22)] md:px-10 md:py-12"
            >
              <div aria-hidden className="sponsor-ring sponsor-ring--outer" />
              <div aria-hidden className="sponsor-ring sponsor-ring--inner" />
              <div aria-hidden className="sponsor-flare" />

              <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-[#539dfd]/35 bg-[#539dfd]/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#8ec5ff]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7a35b]" />
                合作伙伴占位
              </span>

              <div className="relative z-10 mx-auto mt-8 flex h-[100px] w-full max-w-[360px] items-center justify-center px-6">
                <strong className="text-5xl font-black tracking-[0.08em] text-white md:text-6xl">
                  黑天鹅
                </strong>
              </div>

              <p className="relative z-10 mt-5 text-sm font-medium tracking-wide text-white/52 md:text-base">
                品牌资料待补充
              </p>

              <span className="relative z-10 mt-8 inline-flex text-[11px] font-bold uppercase tracking-[0.32em] text-white/28">
                Coming Soon
              </span>
            </div>

            <VacantSlot label="同行者席位" />
          </div>
        </div>
      </div>
    </section>
  );
}

function VacantSlot({ label }: { label: string }) {
  return (
    <div
      data-sponsor-slot
      className="sponsor-slot relative flex min-h-[180px] flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-dashed border-white/18 bg-white/[0.02] px-5 py-8 lg:min-h-[320px] lg:rounded-[28px] lg:py-10"
    >
      <div aria-hidden className="sponsor-slot-shimmer pointer-events-none absolute inset-0" />
      <span className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">{label}</span>
      <span className="sponsor-vacant relative z-10 text-2xl font-light tracking-[0.2em] text-white/25 md:text-3xl">
        虚位以待
      </span>
      <span className="relative z-10 text-[10px] font-bold uppercase tracking-[0.32em] text-white/18">Coming Soon</span>
    </div>
  );
}
