'use client';

import {
  forwardRef,
  useEffect,
  useRef,
  type ForwardedRef,
  type ReactNode,
} from 'react';

/**
 * 毛玻璃滚动条容器
 * 隐藏浏览器原生滚动条，右侧自绘半透明毛玻璃 thumb（backdrop-blur），跨浏览器（含 Firefox）观感一致。
 * 支持拖动 / 点按滚动，内容与容器尺寸变化时自动重算。
 */
interface GlassScrollProps {
  children: ReactNode;
  /** 外层容器类（负责高度/定位，如 h-52 max-h-*） */
  className?: string;
  /** 内部滚动内容的类（如间距 space-y-*） */
  contentClassName?: string;
  /** 转发内部滚动容器 ref（供外部 scrollTo 等） */
  scrollRef?: ForwardedRef<HTMLDivElement>;
  /** 容器尺寸变化也强制重算（内容可能更高） */
  trackContent?: boolean;
}

export const GlassScroll = forwardRef<HTMLDivElement, GlassScrollProps>(function GlassScroll(
  { children, className = '', contentClassName = '', scrollRef, trackContent = true },
  forwardedRef,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const setInnerRef = (el: HTMLDivElement | null) => {
    innerRef.current = el;
    // 合并外部转发 ref 与内部 ref
    if (typeof scrollRef === 'function') scrollRef(el);
    else if (scrollRef && 'current' in scrollRef) scrollRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef && 'current' in forwardedRef) forwardedRef.current = el;
  };

  /** 根据滚动位置/尺寸更新 thumb */
  const updateThumb = () => {
    const inner = innerRef.current;
    const thumb = thumbRef.current;
    if (!inner || !thumb) return;
    const visible = inner.clientHeight;
    const content = inner.scrollHeight;
    if (content <= visible + 1) {
      thumb.style.opacity = '0';
      thumb.style.transform = 'translateY(0)';
      return;
    }
    thumb.style.opacity = '1';
    const thumbH = Math.max(24, (visible / content) * visible);
    thumb.style.height = `${thumbH}px`;
    const maxScroll = content - visible;
    const maxThumb = visible - thumbH;
    const top = maxThumb ? (inner.scrollTop / maxScroll) * maxThumb : 0;
    thumb.style.transform = `translateY(${top.toFixed(1)}px)`;
  };

  useEffect(() => {
    const inner = innerRef.current;
    const content = contentRef.current;
    if (!inner) return;
    updateThumb();
    inner.addEventListener('scroll', updateThumb, { passive: true });

    // 容器或内容尺寸变化（歌单加载完、歌词切行）都重算
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      const targets: Element[] = [inner];
      if (trackContent && content) targets.push(content);
      ro = new ResizeObserver(updateThumb);
      targets.forEach((t) => ro?.observe(t));
    }
    return () => {
      inner.removeEventListener('scroll', updateThumb);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const inner = innerRef.current;
    const thumb = thumbRef.current;
    if (!inner || !thumb || e.button !== 0) return;
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startScroll: inner.scrollTop };
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const inner = innerRef.current;
    const thumb = thumbRef.current;
    const drag = dragRef.current;
    if (!inner || !thumb || !drag) return;
    const visible = inner.clientHeight;
    const content = inner.scrollHeight;
    if (content <= visible + 1) return;
    const thumbH = thumb.clientHeight;
    const maxScroll = content - visible;
    const maxThumb = visible - thumbH;
    const dy = e.clientY - drag.startY;
    inner.scrollTop = drag.startScroll + (maxThumb ? (dy * maxScroll) / maxThumb : 0);
  };

  const onThumbPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className={`relative ${className}`}>
      {/* 隐藏原生滚动条 */}
      <div
        ref={setInnerRef}
        className="scrollbar-none h-full overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>

      {/* 毛玻璃 thumb */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-2.5">
        <div
          ref={thumbRef}
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          onPointerCancel={onThumbPointerUp}
          className="pointer-events-auto absolute right-0 w-2 cursor-grab rounded-full border border-white/20 bg-gradient-to-b from-[#9fe8d0]/70 via-[#9fe8d0]/35 to-[#9fe8d0]/20 shadow-[0_0_12px_rgba(159,232,208,0.35)] backdrop-blur-md transition-[height,opacity] duration-150 active:cursor-grabbing"
          style={{ opacity: 0 }}
        />
      </div>
    </div>
  );
});
