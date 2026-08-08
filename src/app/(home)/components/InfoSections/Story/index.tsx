'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

const KEYWORDS = ['热爱', '全局', '全栈', '架构师'] as const;

const PARAGRAPHS = [
  {
    lead: '01',
    body: (
      <>
        对于很多人来说写代码是一件 <em>痛苦不堪</em> 的事情，
        <br className="hidden md:block" />
        而我不一样，这正是我的 <em>爱好</em>。
      </>
    ),
  },
  {
    lead: '02',
    body: (
      <>
        所谓：
        <strong>&ldquo;不谋全局者，不足谋一域&rdquo;</strong>
        <br className="hidden md:block" />
        只专注一个领域，是无法做出一个完整的项目。
      </>
    ),
  },
  {
    lead: '03',
    body: (
      <>
        如果只会前端，做出来的项目是 <em>没有灵魂</em> 的项目；
        <br className="hidden md:block" />
        只会后端，连界面都看不到又能有什么意义。
      </>
    ),
  },
  {
    lead: '04',
    body: (
      <>
        我想具备的是能够 <em>一个人完成整个项目研发</em> 的能力，
        <br className="hidden md:block" />
        因此，我踏入了 <strong>全栈工程师</strong> 的探索之路。
      </>
    ),
  },
] as const;

const STEP_COUNT = PARAGRAPHS.length;
const LAST_STEP = STEP_COUNT - 1;
/** 四段内容共占约两屏滚动距离，避免在长页面中形成滚动陷阱。 */
const SCROLL_SCREENS = 2.2;

function progressToStep(progress: number) {
  return Math.min(LAST_STEP, Math.max(0, Math.round(progress * LAST_STEP)));
}

function stepToProgress(step: number) {
  return step / LAST_STEP;
}

export function Story() {
  const [active, setActive] = useState(0);
  const [kwHover, setKwHover] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const parasRef = useRef<(HTMLParagraphElement | null)[]>([]);
  const keywordsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const watermarkRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pinRef = useRef<ScrollTrigger | null>(null);
  const activeRef = useRef(0);
  const scrollingToRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reduceMotionRef.current = reduced;
      setReduceMotion(reduced);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paras = parasRef.current.filter(Boolean) as HTMLParagraphElement[];

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set(paras, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.set(paras, { autoAlpha: 0, y: 24, pointerEvents: 'none' });
      gsap.set(paras[0], { autoAlpha: 1, y: 0, pointerEvents: 'auto' });

      // (n-1) 屏切页 + 少量缓冲，末页后顺畅松手
      const st = ScrollTrigger.create({
        id: 'story-pin',
        trigger: section,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * SCROLL_SCREENS)}`,
        pin: true,
        scrub: 0.45,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const index = progressToStep(self.progress);
          if (progressRef.current) {
            gsap.set(progressRef.current, { scaleY: self.progress });
          }
          if (scrollingToRef.current !== null) {
            if (index === scrollingToRef.current) {
              scrollingToRef.current = null;
            } else {
              return;
            }
          }
          if (activeRef.current === index) return;
          activeRef.current = index;
          setActive(index);
        },
      });

      pinRef.current = st;
    }, section);

    return () => {
      pinRef.current = null;
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const paras = parasRef.current.filter(Boolean) as HTMLParagraphElement[];
    const keywords = keywordsRef.current.filter(Boolean) as HTMLButtonElement[];
    const watermark = watermarkRef.current;
    const isLg = window.matchMedia('(min-width: 1024px)').matches;

    paras.forEach((para, index) => {
      const on = index === active;
      gsap.to(para, {
        autoAlpha: on ? 1 : 0,
        y: on ? 0 : index < active ? -18 : 24,
        pointerEvents: on ? 'auto' : 'none',
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });

    keywords.forEach((kw, index) => {
      const on = index === active;
      const soft = kwHover === index && !on;
      gsap.to(kw, {
        x: on && isLg ? -14 : 0,
        scale: on ? 1.08 : soft ? 1.02 : 0.94,
        opacity: on ? 1 : soft ? 0.55 : 0.28,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      kw.classList.toggle('story-keyword--active', on);
    });

    if (watermark) {
      watermark.textContent = KEYWORDS[active];
      gsap.to(watermark, {
        autoAlpha: 1,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  }, [active, kwHover, reduceMotion]);

  const goToStep = (index: number) => {
    const next = Math.min(LAST_STEP, Math.max(0, index));
    setActive(next);
    activeRef.current = next;
    setKwHover(null);

    if (reduceMotionRef.current) return;

    const st = pinRef.current ?? ScrollTrigger.getById('story-pin');
    if (!st) return;

    scrollingToRef.current = next;
    const progress = LAST_STEP === 0 ? 0 : stepToProgress(next);
    const top = st.start + (st.end - st.start) * progress;

    gsap.to(window, {
      scrollTo: { y: top, autoKill: true },
      duration: 0.7,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => {
        scrollingToRef.current = null;
      },
    });
  };

  useEffect(() => {
    if (reduceMotion) return;

    const onKey = (e: KeyboardEvent) => {
      const st = pinRef.current;
      if (!st?.isActive) return;
      const cur = activeRef.current;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (cur >= LAST_STEP) return;
        e.preventDefault();
        goToStep(cur + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (cur <= 0) return;
        e.preventDefault();
        goToStep(cur - 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="story"
      data-section
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        goToStep(activeRef.current + (dx < 0 ? 1 : -1));
      }}
      className="relative flex min-h-[100svh] items-center overflow-hidden px-4 py-20 md:px-8 md:py-24"
    >
      <div className="pointer-events-none absolute -left-1/4 top-0 h-[70%] w-[80%] bg-[radial-gradient(ellipse_at_center,rgba(215,163,91,0.16),transparent_62%)]" />
      <div className="pointer-events-none absolute -right-1/4 bottom-0 h-[55%] w-[70%] bg-[radial-gradient(ellipse_at_center,rgba(83,157,253,0.12),transparent_65%)]" />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[10%] z-0 -translate-x-1/2 select-none md:top-[6%]"
      >
        <p
          ref={watermarkRef}
          className="whitespace-nowrap font-black leading-none tracking-[-0.08em] text-[28vw] text-white/[0.04] md:text-[20vw]"
        >
          {KEYWORDS[0]}
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 xl:gap-16">
          <div
            className={
              reduceMotion
                ? 'relative space-y-12'
                : 'relative min-h-[220px] md:min-h-[280px] lg:min-h-[320px]'
            }
          >
            {!reduceMotion ? (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-2 left-0 top-2 hidden w-px overflow-hidden bg-white/10 md:block"
              >
                <span
                  ref={progressRef}
                  className="absolute inset-x-0 top-0 h-full origin-top scale-y-0 bg-[linear-gradient(180deg,#d7a35b,rgba(83,157,253,0.8))]"
                />
              </span>
            ) : null}

            {PARAGRAPHS.map((item, index) => (
              <p
                key={item.lead}
                ref={(el) => {
                  parasRef.current[index] = el;
                }}
                aria-hidden={reduceMotion ? undefined : index !== active}
                className={`story-para max-w-3xl pl-0 text-[clamp(1.4rem,2.7vw,2.4rem)] font-light leading-[1.4] tracking-[-0.02em] text-white/85 md:pl-8 ${
                  reduceMotion ? 'relative' : 'absolute inset-x-0 top-0'
                }`}
              >
                <span
                  aria-hidden
                  className="mb-4 block font-mono text-[11px] font-semibold tracking-[0.28em] text-[#d7a35b]"
                >
                  {item.lead} / {String(STEP_COUNT).padStart(2, '0')}
                </span>
                {item.body}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-x-5 gap-y-1 lg:flex-col lg:items-start lg:gap-1">
            {KEYWORDS.map((word, index) => (
              <button
                key={word}
                type="button"
                ref={(el) => {
                  keywordsRef.current[index] = el;
                }}
                onClick={() => goToStep(index)}
                onMouseEnter={() => setKwHover(index)}
                onMouseLeave={() => setKwHover(null)}
                onFocus={() => setKwHover(index)}
                onBlur={() => setKwHover(null)}
                aria-current={active === index ? 'step' : undefined}
                aria-label={`第 ${index + 1} 段：${word}`}
                className="story-keyword origin-left cursor-pointer border-0 bg-transparent p-0 text-left font-light italic leading-[0.92] tracking-[-0.05em]"
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center gap-4 md:mt-14">
          <div className="flex items-center gap-2" role="tablist" aria-label="故事进度">
            {KEYWORDS.map((word, index) => (
              <button
                key={word}
                type="button"
                role="tab"
                aria-selected={active === index}
                aria-label={word}
                onClick={() => goToStep(index)}
                className={`h-1.5 cursor-pointer rounded-full ${
                  active === index ? 'w-7 bg-[#d7a35b]' : 'w-1.5 bg-white/25 hover:bg-white/45'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
            滚动或左右滑动 · {active + 1}/{STEP_COUNT} · {KEYWORDS[active]}
          </p>
        </div>
      </div>
    </section>
  );
}
