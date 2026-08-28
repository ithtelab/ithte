'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

import type { Wall } from '@/types/wall';

import { SectionTitle } from '../../SectionTitle';

const wallTrackConfig = [
  { duration: 42, reverse: false },
  { duration: 50, reverse: true },
  { duration: 38, reverse: false },
  { duration: 46, reverse: true },
  { duration: 44, reverse: false },
  { duration: 52, reverse: true },
  { duration: 40, reverse: false },
] as const;

const getWallRows = (walls: Wall[]) => wallTrackConfig.map((_, rowIndex) => walls.filter((_, itemIndex) => itemIndex % wallTrackConfig.length === rowIndex));

const padWallRow = (row: Wall[], minCount = 4) => {
  if (!row.length) return [];
  const padded = [...row];
  while (padded.length < minCount) padded.push(...row);
  return padded;
};

const wallColors = ['#9fe8d0', '#d7a35b', '#8ec5ff', '#f2a7b8', '#c4b5fd', '#f4f0e8'] as const;

export function Wall({ walls }: { walls: Wall[] }) {
  const [items, setItems] = useState(walls);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<(typeof wallColors)[number]>(wallColors[0]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const wallRows = getWallRows(items);
  const useMarquee = items.length >= 14;

  const submitWall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatus('');
    setIsError(false);
    try {
      const res = await fetch('/api/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, color }),
      });
      const body = await res.json() as { message?: string; data?: Wall };
      if (!res.ok || !body.data) throw new Error(body.message || '留言提交失败');

      setItems((current) => [body.data as Wall, ...current].slice(0, 42));
      setContent('');
      setStatus('留言已发布');
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : '留言提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="wall" data-section className="px-4 py-20 md:px-8 md:py-28">
      <SectionTitle
        title={
          <>
            一些<em className="font-normal text-[#d7a35b]">留言</em>
          </>
        }
      />

      <form
        data-reveal
        onSubmit={submitWall}
        className="mx-auto mt-8 grid max-w-7xl gap-4 border-y border-white/10 py-6 md:grid-cols-[180px_1fr_auto] md:items-end"
      >
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">昵称</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            required
            placeholder="怎么称呼你"
            className="h-11 border-b border-white/15 bg-transparent px-1 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#9fe8d0]/70"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">留言</span>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={180}
            required
            placeholder="路过的话，就留下一句话吧"
            className="h-11 border-b border-white/15 bg-transparent px-1 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#9fe8d0]/70"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-[#9fe8d0]/35 bg-[#9fe8d0]/10 px-5 text-sm font-semibold text-[#b7ffe8] transition-colors hover:bg-[#9fe8d0]/18 disabled:cursor-wait disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
          {submitting ? '发布中' : '发布留言'}
        </button>

        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <span className="mr-1 text-[11px] uppercase tracking-[0.18em] text-white/30">名字颜色</span>
          {wallColors.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`选择颜色 ${item}`}
              aria-pressed={color === item}
              onClick={() => setColor(item)}
              className={`h-5 w-5 cursor-pointer rounded-full border transition-transform ${color === item ? 'scale-110 border-white' : 'border-white/20 hover:scale-105'}`}
              style={{ backgroundColor: item }}
            />
          ))}
        </div>

        <p
          aria-live="polite"
          className={`min-h-5 text-xs md:text-right ${isError ? 'text-red-300' : 'text-[#9fe8d0]'}`}
        >
          {status}
        </p>
      </form>

      <div data-reveal className="w-full py-5 md:py-6">
        {items.length > 0 && useMarquee ? (
          <div className="relative h-[min(64vh,660px)] min-h-[440px] w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div className="flex h-full w-full flex-col justify-between py-1">
              {wallRows.map((row, rowIndex) => {
                const { duration, reverse } = wallTrackConfig[rowIndex];
                const baseRow = padWallRow(row);
                const rowWalls = baseRow.length ? [...baseRow, ...baseRow] : [];

                return rowWalls.length ? (
                  <div key={`wall-row-${rowIndex}`} className="overflow-hidden">
                    <div
                      className="wall-marquee-track flex w-max items-stretch gap-3"
                      style={{
                        animation: `marquee ${duration}s linear infinite${reverse ? ' reverse' : ''}`,
                      }}
                    >
                      {rowWalls.map((wall, itemIndex) => (
                        <article key={`${wall.id}-${rowIndex}-${itemIndex}`} className="flex w-[min(300px,78vw)] shrink-0 items-start gap-2 px-1 py-1 text-sm md:w-[340px]">
                          <span className="shrink-0 text-xs font-semibold md:text-sm" style={{ color: wall.color || '#9fe8d0' }}>
                            {wall.name}
                          </span>
                          <span className="shrink-0 text-white/22">：</span>
                          <span className="line-clamp-3 min-w-0 flex-1 text-xs leading-relaxed text-white/68 md:text-sm">{wall.content}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        ) : items.length ? (
          <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((wall) => (
              <article key={wall.id} className="flex min-h-14 items-start gap-2 border-b border-white/8 py-4 text-sm">
                <span className="shrink-0 text-xs font-semibold md:text-sm" style={{ color: wall.color || '#9fe8d0' }}>
                  {wall.name}
                </span>
                <span className="shrink-0 text-white/22">：</span>
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/68 md:text-sm">{wall.content}</span>
              </article>
            ))}
          </div>
        ) : (
          <article data-reveal className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/58">
            暂无留言数据
          </article>
        )}
      </div>
    </section>
  );
}
