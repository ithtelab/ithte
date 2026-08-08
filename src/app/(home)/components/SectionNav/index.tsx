'use client';

import { useEffect, useRef, useState } from 'react';

const sections = [
  { id: 'top', label: '首页' },
  { id: 'location', label: '坐标' },
  { id: 'story', label: '故事' },
  { id: 'freedom', label: '远方' },
  { id: 'travel-gallery', label: '风景' },
  { id: 'open-source', label: '照片墙' },
  { id: 'sponsor', label: '同行者' },
  { id: 'wall', label: '留言' },
  { id: 'quote', label: '向往' },
  { id: 'milestone', label: '节点' },
] as const;

type SectionId = (typeof sections)[number]['id'];

export function SectionNav() {
  const [activeId, setActiveId] = useState<SectionId>('top');
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const update = () => {
      frameRef.current = 0;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setProgress(Math.min(1, Math.max(0, window.scrollY / maxScroll)));

      const focusLine = window.innerHeight * 0.42;
      let closest: SectionId = sections[0].id;
      let closestDistance = Number.POSITIVE_INFINITY;
      sections.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const distance = rect.top <= focusLine && rect.bottom >= focusLine
          ? 0
          : Math.min(Math.abs(rect.top - focusLine), Math.abs(rect.bottom - focusLine));
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = id;
        }
      });
      setActiveId(closest);
    };

    const onScroll = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <>
      <nav aria-label="页面章节" className="fixed inset-x-0 top-0 z-50 h-1 bg-black/25 backdrop-blur-sm md:hidden">
        <span className="absolute inset-y-0 left-0 bg-[#9fe8d0] shadow-[0_0_12px_rgba(159,232,208,0.7)]" style={{ width: `${progress * 100}%` }} />
        <div className="absolute inset-x-0 top-0 grid h-4" style={{ gridTemplateColumns: `repeat(${sections.length},1fr)` }}>
          {sections.map(({ id, label }) => <a key={id} href={`#${id}`} aria-label={`前往${label}`} />)}
        </div>
      </nav>

      <nav aria-label="页面章节" className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-1.5 md:flex">
        {sections.map(({ id, label }) => {
          const active = id === activeId;
          return (
            <a key={id} href={`#${id}`} aria-current={active ? 'location' : undefined} className="group relative flex h-7 w-7 items-center justify-center">
              <span className={`block rounded-full transition-all ${active ? 'h-2.5 w-2.5 bg-[#9fe8d0] shadow-[0_0_14px_rgba(159,232,208,0.72)]' : 'h-1.5 w-1.5 bg-white/28 group-hover:bg-white/65'}`} />
              <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded bg-[#10141b]/95 px-2 py-1 text-[10px] text-white/72 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {label}
              </span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
