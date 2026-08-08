'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';

/**
 * 翻转文字
 * - 默认模式：循环切换 words 里的词（Aceternity FlipWords）
 * - text 模式（传 text 时）：整句显示，text 变化触发翻转动画（用于歌词等外部驱动场景）
 */
export const FlipWords = ({
  words,
  duration = 3000,
  className,
  text,
}: {
  words: string[];
  duration?: number;
  className?: string;
  text?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(text ?? words[0]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (isAnimating) return;
    if (text !== undefined) return; // 外部控制，不循环
    const timer = setTimeout(() => startAnimation(), duration);
    return () => clearTimeout(timer);
  }, [isAnimating, duration, startAnimation, text]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsAnimating(false);
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 10,
        }}
        exit={{
          opacity: 0,
          y: -40,
          x: 40,
          filter: 'blur(8px)',
          scale: 2,
          position: 'absolute',
        }}
        className={cn(
          'relative z-10 inline-block px-2 text-left text-foreground',
          className,
        )}
        // key 绑 text：外部模式下行切换时 AnimatePresence 自动翻转，无需额外 state
        key={text ?? currentWord}
      >
        {text !== undefined ? (
          text
        ) : (
          currentWord.split(' ').map((word, wordIndex) => (
            <motion.span
              key={word + wordIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                delay: wordIndex * 0.3,
                duration: 0.3,
              }}
              className="inline-block whitespace-nowrap"
            >
              {word.split('').map((letter, letterIndex) => (
                <motion.span
                  key={word + letterIndex}
                  initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: wordIndex * 0.3 + letterIndex * 0.05,
                    duration: 0.2,
                  }}
                  className="inline-block"
                >
                  {letter}
                </motion.span>
              ))}
              <span className="inline-block">&nbsp;</span>
            </motion.span>
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};
