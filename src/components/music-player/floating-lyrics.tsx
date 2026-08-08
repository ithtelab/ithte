'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { useMusic } from './music-context';
import type { LyricLine } from './netease';

const CREDIT_LINE_PATTERN = /^(?:作词|作曲|编曲|制作人|监制|混音|母带|录音|吉他|贝斯|鼓|和声|弦乐|人声编辑|制作|出品|发行|统筹|艺术总监|特别鸣谢|OP|SP|lyrics?\s+by|composed\s+by|arranged\s+by|produc(?:er|ed\s+by)|mixed\s+by|mastered\s+by)\s*[:：]/i;

function findCurrentIndex(lyrics: { time: number }[], time: number) {
  let index = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= time) index = i;
    else break;
  }
  return index;
}

function getTimedCharacters(line: LyricLine, lineEnd: number) {
  if (line.words?.length) {
    return line.words.flatMap((word) => {
      const characters = Array.from(word.text);
      const duration = Math.max(word.duration, 0.01);
      return characters.map((char, index) => ({
        char,
        start: word.time + duration * (index / characters.length),
        end: word.time + duration * ((index + 1) / characters.length),
      }));
    });
  }

  const characters = Array.from(line.text);
  const duration = Math.max(lineEnd - line.time, 0.25);
  return characters.map((char, index) => ({
    char,
    start: line.time + duration * (index / characters.length),
    end: line.time + duration * ((index + 1) / characters.length),
  }));
}

export function FloatingLyrics() {
  const {
    lyrics,
    currentTime,
    duration,
    currentTrack,
    isPlaying,
    lyricsEnabled,
    getPlaybackTime,
    audioAnalyser,
  } = useMusic();
  const reduceMotion = useReducedMotion();
  const [lyricTime, setLyricTime] = useState(currentTime);
  const lyricRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let previousFrame = 0;
    let previousColorFrame = 0;
    let energyEnvelope = 0;
    let warmthEnvelope = 0;
    let previousEnergy = 0;
    const frequencyData = audioAnalyser
      ? new Uint8Array(audioAnalyser.frequencyBinCount)
      : null;

    const averageRange = (start: number, end: number) => {
      if (!frequencyData) return 0;
      const safeEnd = Math.min(end, frequencyData.length);
      let sum = 0;
      for (let index = start; index < safeEnd; index++) sum += frequencyData[index];
      return safeEnd > start ? sum / (safeEnd - start) / 255 : 0;
    };

    const sync = (timestamp: number) => {
      if (timestamp - previousFrame >= 30) {
        previousFrame = timestamp;
        setLyricTime(getPlaybackTime());
      }

      if (audioAnalyser && frequencyData && timestamp - previousColorFrame >= 66) {
        previousColorFrame = timestamp;
        audioAnalyser.getByteFrequencyData(frequencyData);
        const bass = Math.min(1, Math.max(0, (averageRange(1, 10) - 0.04) / 0.62));
        const mid = Math.min(1, Math.max(0, (averageRange(10, 68) - 0.035) / 0.52));
        const high = Math.min(1, Math.max(0, (averageRange(68, 260) - 0.025) / 0.42));
        const targetEnergy = Math.min(1, bass * 0.38 + mid * 0.32 + high * 0.46);
        energyEnvelope += (targetEnergy - energyEnvelope) * (targetEnergy > energyEnvelope ? 0.24 : 0.08);
        const energyAttack = Math.max(0, targetEnergy - previousEnergy);
        previousEnergy = targetEnergy;
        const warmthTarget = Math.min(1, Math.max(0,
          (energyEnvelope - 0.66) / 0.26 + energyAttack * 2.4 + Math.max(0, high - 0.76) * 0.7,
        ));
        warmthEnvelope += (warmthTarget - warmthEnvelope) * (warmthTarget > warmthEnvelope ? 0.16 : 0.045);
        const mix = (calm: number, wild: number) => Math.round(calm + (wild - calm) * warmthEnvelope);
        lyricRootRef.current?.style.setProperty('--lyric-energy', energyEnvelope.toFixed(3));
        lyricRootRef.current?.style.setProperty('--lyric-primary-rgb', `${mix(159, 255)}, ${mix(232, 126)}, ${mix(208, 86)}`);
        lyricRootRef.current?.style.setProperty('--lyric-secondary-rgb', `${mix(83, 255)}, ${mix(166, 205)}, ${mix(253, 74)}`);
      }
      frame = requestAnimationFrame(sync);
    };
    frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [audioAnalyser, getPlaybackTime, isPlaying, currentTrack?.id]);

  const displayLyrics = useMemo(
    () => lyrics.filter((line) => !CREDIT_LINE_PATTERN.test(line.text.trim())),
    [lyrics],
  );
  const currentIndex = useMemo(
    () => findCurrentIndex(displayLyrics, lyricTime),
    [displayLyrics, lyricTime],
  );
  const current = displayLyrics[currentIndex];
  const next = displayLyrics[currentIndex + 1];

  if (!isPlaying || !currentTrack || !lyricsEnabled) {
    return <AnimatePresence mode="wait" />;
  }

  const positionClass = 'floating-lyric-stage pointer-events-none fixed inset-x-5 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[70] text-center md:inset-x-auto md:bottom-8 md:right-24 md:w-[min(520px,44vw)] md:text-right';

  if (!current) {
    return (
      <AnimatePresence mode="wait">
        <motion.aside
          ref={lyricRootRef}
          key={`${currentTrack.id}-intro`}
          aria-label={`正在播放：${currentTrack.title}，${currentTrack.artist}`}
          initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(7px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(5px)' }}
          transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          className={positionClass}
        >
          <p className="lyric-wave-text truncate text-xl font-medium leading-[1.35] text-white/90 md:text-[2rem]">
            {currentTrack.title}
          </p>
          <p className="lyric-second-line mt-1.5 truncate text-xs font-normal leading-5 text-[#9fe8d0]/70 md:text-sm">
            {currentTrack.artist}
          </p>
        </motion.aside>
      </AnimatePresence>
    );
  }

  const lineEnd = next?.time ?? (duration > current.time ? duration : current.time + 5);
  const secondLine = current.translation || next?.text || '';
  const lineKey = `${currentTrack.id}-${currentIndex}-${current.text}`;
  const characters = getTimedCharacters(current, lineEnd);

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        ref={lyricRootRef}
        key={lineKey}
        aria-label={secondLine ? `${current.text}。${secondLine}` : current.text}
        initial={reduceMotion ? false : { opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
        transition={{ duration: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
        className={positionClass}
      >
        <p className="lyric-wave-text flex flex-wrap justify-center text-xl font-medium leading-[1.35] md:justify-end md:text-[2rem]">
          {characters.map(({ char, start, end }, index) => {
            const state = lyricTime >= end ? 'past' : lyricTime >= start ? 'current' : 'upcoming';
            return (
              <span
                key={`${char}-${index}`}
                aria-hidden="true"
                className={`lyric-wave-char lyric-wave-char--${state}`}
                style={{ '--lyric-delay': `${index * 58}ms` } as CSSProperties}
              >
                {char === ' ' ? '\u00a0' : char}
                {state === 'current' && char.trim() && (
                  <motion.span
                    layoutId={`lyric-playhead-${currentTrack.id}`}
                    aria-hidden="true"
                    className="lyric-playhead"
                    transition={{ type: 'spring', stiffness: 430, damping: 38, mass: 0.52 }}
                  />
                )}
              </span>
            );
          })}
        </p>

        {secondLine && (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.1, duration: reduceMotion ? 0 : 0.28 }}
            className="lyric-second-line mt-1.5 text-xs font-normal leading-5 text-white/46 md:text-sm"
          >
            {secondLine}
          </motion.p>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
