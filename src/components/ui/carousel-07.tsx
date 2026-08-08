"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from "motion/react";
import { Expand, MousePointer2, MoveHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Slide {
  image: string;
  title: string;
  description: string;
  badge: string;
}

interface CarouselConfig {
  distanceDivisor: number;
  velocityDivisor: number;
  sensitivity: number;
  xMultiplier: number;
  yMultiplier: number;
  rotationMultiplier: number;
  scaleReduction: number;
}

const getCarouselConfig = (width: number): CarouselConfig => {
  if (width < 640) {
    return {
      distanceDivisor: 120,
      velocityDivisor: 500,
      sensitivity: 180,
      xMultiplier: 90,
      yMultiplier: 20,
      rotationMultiplier: 8,
      scaleReduction: 0.06,
    };
  }
  if (width < 1024) {
    return {
      distanceDivisor: 160,
      velocityDivisor: 650,
      sensitivity: 220,
      xMultiplier: 130,
      yMultiplier: 30,
      rotationMultiplier: 10,
      scaleReduction: 0.09,
    };
  }
  return {
    distanceDivisor: 200,
    velocityDivisor: 800,
    sensitivity: 250,
    xMultiplier: 170,
    yMultiplier: 40,
    rotationMultiplier: 12,
    scaleReduction: 0.12,
  };
};

interface CarouselStackedProps {
  slides: Slide[];
}

const CarouselStacked = ({ slides }: CarouselStackedProps) => {
  const scrollProgress = useMotionValue(0);
  const startProgress = React.useRef(0);
  const didDragRef = React.useRef(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const total = slides.length;
  const activeSlide = slides[activeIndex];

  React.useEffect(() => scrollProgress.on("change", (value) => {
    if (!total) return;
    const normalized = ((Math.round(value) % total) + total) % total;
    setActiveIndex(normalized);
  }), [scrollProgress, total]);

  React.useEffect(() => {
    if (!detailOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [detailOpen]);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setWindowWidth(window.innerWidth);
    });
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const config = React.useMemo(
    () => getCarouselConfig(windowWidth),
    [windowWidth],
  );

  const handleDragStart = () => {
    didDragRef.current = false;
    startProgress.current = scrollProgress.get();
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const dragDistance = info.offset.x;
    const velocity = info.velocity.x;

    const distanceShift = -dragDistance / config.distanceDivisor;
    const velocityShift = -velocity / config.velocityDivisor;

    let totalShift = Math.round(distanceShift + velocityShift);
    totalShift = Math.max(-3, Math.min(3, totalShift));

    const target = Math.round(startProgress.current) + totalShift;

    animate(scrollProgress, target, {
      type: "spring",
      stiffness: 200,
      damping: 30,
      mass: 1,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-10 bg-background overflow-hidden select-none">
      <div className="relative w-full max-w-7xl h-80 sm:h-112 lg:h-128 flex items-center justify-center">
        {/* Transparent Drag Surface */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onPointerDown={() => {
            didDragRef.current = false;
          }}
          onDragStart={handleDragStart}
          onDrag={(_, info) => {
            if (Math.abs(info.offset.x) > 8) didDragRef.current = true;
            const delta = -info.delta.x / config.sensitivity;
            scrollProgress.set(scrollProgress.get() + delta);
          }}
          onDragEnd={handleDragEnd}
          role="slider"
          aria-label="成长时间线，按住并左右拖动切换卡片"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={activeIndex + 1}
          tabIndex={0}
          onTap={() => {
            if (!didDragRef.current) setDetailOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setDetailOpen(true);
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              animate(scrollProgress, scrollProgress.get() + (event.key === "ArrowRight" ? 1 : -1), {
                type: "spring",
                stiffness: 200,
                damping: 30,
              });
            }
          }}
          className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
        />

        {slides.map((slide, i) => (
          <Card
            key={i}
            slide={slide}
            index={i}
            total={total}
            progress={scrollProgress}
            config={config}
          />
        ))}
      </div>

      <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38 md:mt-5">
        <MousePointer2 className="h-3.5 w-3.5 text-[#d7a35b]/70" aria-hidden />
        <span>按住卡片左右拖动</span>
        <MoveHorizontal className="h-4 w-4 text-[#d7a35b]/70" aria-hidden />
        <span className="mx-1 h-3 w-px bg-white/12" aria-hidden />
        <Expand className="h-3.5 w-3.5 text-[#d7a35b]/70" aria-hidden />
        <span>点按查看详情</span>
      </div>

      {mounted ? createPortal(<AnimatePresence>
        {detailOpen && activeSlide ? (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="milestone-detail-title"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8"
          >
            <button type="button" tabIndex={-1} aria-label="关闭节点详情" onClick={() => setDetailOpen(false)} className="absolute inset-0 cursor-default bg-black/78 backdrop-blur-md" />
            <motion.div
              initial={{ y: 24, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative z-10 max-h-[92svh] w-fit min-w-[min(88vw,320px)] max-w-[92vw] overflow-y-auto rounded-lg border border-white/12 bg-[#0b0d12] shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
            >
              <div className="relative flex max-h-[66svh] items-center justify-center overflow-hidden bg-black">
                <img
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  className="h-auto max-h-[66svh] w-auto max-w-[92vw] object-contain"
                />
                <button type="button" aria-label="关闭" onClick={() => setDetailOpen(false)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/45 text-white/70 backdrop-blur-md hover:text-white">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="max-w-2xl p-6 md:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d7a35b]">{activeSlide.badge}</p>
                <h3 id="milestone-detail-title" className="mt-3 text-2xl font-black text-white md:text-4xl">{activeSlide.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/62 md:text-base md:leading-8">{activeSlide.description}</p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>, document.body) : null}
    </div>
  );
};

interface CardProps {
  slide: Slide;
  index: number;
  total: number;
  progress: MotionValue<number>;
  config: CarouselConfig;
}

const Card = ({ slide, index, total, progress, config }: CardProps) => {
  const offset = useTransform(progress, (p) => {
    let diff = (index - p) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  });

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return o * config.rotationMultiplier;
  });
  const y = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return absO * config.yMultiplier;
  });
  const scale = useTransform(
    offset,
    (o) => 1 - Math.abs(o) * config.scaleReduction,
  );
  const opacity = useTransform(
    offset,
    [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2],
    [0, 1, 1, 1, 0],
  );
  const zIndex = useTransform(offset, (o) =>
    Math.round(100 - Math.abs(o) * 10),
  );

  return (
    <motion.div
      style={{
        x,
        rotate,
        y,
        scale,
        opacity,
        zIndex,
      }}
      className={cn(
        "absolute rounded-2xl overflow-hidden bg-muted group pointer-events-none",
        "w-44 h-56 sm:w-56 sm:h-80 lg:w-64 lg:h-96",
      )}
    >
      <img
        src={slide.image}
        alt={slide.title}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-700 group-hover:scale-110"
      />

      <motion.div
        style={{
          opacity: useTransform(
            offset,
            [-2, -0.5, 0, 0.5, 2],
            [0.5, 0.2, 0, 0.2, 0.5],
          ),
        }}
        className="absolute inset-0 bg-black pointer-events-none"
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

      <Badge className="absolute top-3 right-3 sm:top-5 sm:right-5 lg:top-6 lg:right-6 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/95 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-black">
        {slide.badge}
      </Badge>

      <div className="absolute bottom-5 left-3 right-3 sm:bottom-8 sm:left-5 sm:right-5 lg:bottom-10 lg:left-6 lg:right-6 text-white text-center sm:text-left">
        <motion.p
          style={{
            opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
          }}
          className="text-sm sm:text-lg lg:text-xl font-bold leading-tight mb-0.5 sm:mb-1 drop-shadow-md"
        >
          {slide.title}
        </motion.p>
        <motion.p
          style={{
            opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
          }}
          className="hidden sm:block text-xs text-white/70 line-clamp-2 italic font-medium"
        >
          {slide.description}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default CarouselStacked;
