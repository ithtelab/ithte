'use client';

import { ReactNode, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function Motion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduceMotion) {
        gsap.set('[data-hero-word], [data-reveal], [data-section-title], [data-orbit-tag], [data-orbit-avatar]', {
          autoAlpha: 1,
          y: 0,
          x: 0,
          scaleY: 1,
          clearProps: 'clipPath,filter',
        });
        return;
      }

      gsap.set('[data-hero-word]', { yPercent: 120, scaleY: 0.55, rotateX: 18, transformOrigin: '50% 100%', autoAlpha: 0 });
      gsap.set('[data-hero-meta], [data-hero-visual]', { y: 44, autoAlpha: 0, filter: 'blur(16px)' });
      gsap.set('[data-orbit-avatar]', { scale: 0.86, rotate: -4, autoAlpha: 0, filter: 'blur(10px)' });
      gsap.set('[data-orbit-tag]', { y: 34, scale: 0.92, autoAlpha: 0, filter: 'blur(8px)' });
      // 清掉 HMR / 旧动画残留的裁切样式，避免文字被切一半
      gsap.set('[data-reveal], [data-section-title]', { clearProps: 'clipPath,filter' });

      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .to('[data-hero-word]', { yPercent: 0, scaleY: 1, rotateX: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12 })
        .to('[data-hero-meta], [data-hero-visual]', { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.95, stagger: 0.1 }, '-=0.72')
        .to('[data-orbit-avatar]', { scale: 1, rotate: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.95 }, '-=0.65')
        .to('[data-orbit-tag]', { y: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.09 }, '-=0.55');

      gsap.utils.toArray<HTMLElement>('[data-section]').forEach((section) => {
        const title = section.querySelectorAll('[data-section-title]');
        const reveals = section.querySelectorAll('[data-reveal]');
        const images = section.querySelectorAll('[data-parallax]');

        // 不用 clip-path / blur：二者都会裁切中文字形溢出的墨水区域
        gsap.fromTo(
          title,
          { y: 56, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: section, start: 'top 74%' },
            clearProps: 'clipPath,filter',
          },
        );

        gsap.fromTo(
          reveals,
          { y: 40, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: section, start: 'top 68%' },
            clearProps: 'clipPath,filter',
          },
        );

        images.forEach((image) => {
          gsap.fromTo(
            image,
            { yPercent: -7, scale: 1.08 },
            {
              yPercent: 7,
              scale: 1.02,
              ease: 'none',
              scrollTrigger: { trigger: image, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
            },
          );
        });
      });
    }, rootRef);

    const sections = rootRef.current?.querySelectorAll<HTMLElement>('[data-section]') ?? [];
    const activityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          (entry.target as HTMLElement).dataset.sectionActive = entry.isIntersecting ? 'true' : 'false';
        });
      },
      { rootMargin: '18% 0px', threshold: 0.01 },
    );
    sections.forEach((section) => activityObserver.observe(section));

    return () => {
      activityObserver.disconnect();
      ctx.revert();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
