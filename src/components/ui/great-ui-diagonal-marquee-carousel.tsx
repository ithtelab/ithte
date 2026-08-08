'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';

export interface CardItem {
  id: string | number;
  url: string;
  title: string;
}

export interface DiagonalMarqueeCarouselProps {
  cards: CardItem[];
  angle?: number;
  baseSpeed?: number;
  alternateDirections?: boolean;
  className?: string;
  cardClassName?: string;
  fadeClassName?: string;
}

function Card({ card, className }: { card: CardItem; className?: string }) {
  return (
    <div
      className={cn(
        'group relative h-[300px] w-[400px] shrink-0 overflow-hidden rounded-xl shadow-2xl',
        className,
      )}
    >
      <img
        src={card.url}
        alt={card.title}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-black/28" />
    </div>
  );
}

function MarqueeRow({
  cards,
  speed,
  direction,
  cardClassName,
  paused,
}: {
  cards: CardItem[];
  speed: number;
  direction: 1 | -1;
  cardClassName?: string;
  paused: boolean;
}) {
  const animationClass = direction === -1 ? 'animate-travel-marquee-left' : 'animate-travel-marquee-right';

  return (
    <div className="flex w-full overflow-hidden">
      <div
        className={cn('flex shrink-0 cursor-pointer hover:[animation-play-state:paused]', animationClass)}
        style={{ '--speed': `${speed}s`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
            {cards.map((card, index) => (
              <div key={`${card.id}-${copy}-${index}`} className="shrink-0 pr-5 md:pr-8">
                <Card card={card} className={cardClassName} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiagonalMarqueeCarousel({
  cards,
  angle = -25,
  baseSpeed = 120,
  alternateDirections = true,
  className,
  cardClassName,
  fadeClassName,
}: DiagonalMarqueeCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(true);
  const reverseCards = [...cards].reverse();
  const rows = [
    { cards, speed: baseSpeed, direction: -1 as const },
    { cards: reverseCards, speed: Math.max(baseSpeed - 15, 30), direction: alternateDirections ? 1 as const : -1 as const },
    { cards, speed: baseSpeed + 15, direction: -1 as const },
    { cards: reverseCards, speed: Math.max(baseSpeed - 6, 35), direction: alternateDirections ? 1 as const : -1 as const },
  ];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry?.isIntersecting),
      { threshold: 0.03 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  if (!cards.length) return null;

  return (
    <div ref={rootRef} className={cn('relative flex h-screen w-full items-center justify-center overflow-hidden', className)}>
      <div
        className="absolute z-0 flex w-[200vw] flex-col gap-5 md:gap-8"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        {rows.map((row, index) => (
          <div key={index} className={index === 3 ? 'hidden md:block' : undefined}>
            <MarqueeRow
              cards={row.cards}
              speed={row.speed}
              direction={row.direction}
              cardClassName={cardClassName}
              paused={paused}
            />
          </div>
        ))}
      </div>

      <div className={cn('pointer-events-none absolute inset-x-0 top-0 z-10 h-1/4 bg-gradient-to-b from-[#050608] to-transparent', fadeClassName)} />
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 bg-gradient-to-t from-[#050608] to-transparent', fadeClassName)} />
    </div>
  );
}
