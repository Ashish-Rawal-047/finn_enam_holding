/**
 * Restrained motion primitives. Durations stay under ~450 ms and content is interactive
 * immediately; everything is disabled under prefers-reduced-motion (MotionConfig "user").
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Container that staggers its <Rise> children into view. */
export const Stagger: React.FC<{ children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'ul' }> = ({ children, className, as = 'div' }) => {
  const Comp = motion[as];
  return (
    <Comp variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </Comp>
  );
};

export const Rise: React.FC<{ children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'li' | 'figure' }> = ({ children, className, as = 'div' }) => {
  const Comp = motion[as];
  return (
    <Comp variants={riseItem} className={className}>
      {children}
    </Comp>
  );
};

/**
 * Counts from 0 to `value` once, on first render with a value. Later updates snap
 * (financial numbers should not appear to "move" during normal refreshes).
 */
export function useCountUp(value: number | null | undefined, durationMs = 700): number | null {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<number | null>(value ?? null);
  const animated = useRef(false);

  useEffect(() => {
    if (value === null || value === undefined) {
      setShown(null);
      return;
    }
    if (reduce || animated.current) {
      setShown(value);
      return;
    }
    animated.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reduce]);

  return shown;
}

export const CountUp: React.FC<{ value: number | null | undefined; format: (n: number) => string; className?: string }> = ({ value, format, className }) => {
  const shown = useCountUp(value);
  return <span className={className}>{shown === null ? '—' : format(shown)}</span>;
};
