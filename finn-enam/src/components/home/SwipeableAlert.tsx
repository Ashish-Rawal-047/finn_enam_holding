import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { cx } from '../ui';

/** Horizontal distance (px) a swipe must travel before its action fires on release. */
export const SWIPE_THRESHOLD = 96;

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  /** Classes for the strip revealed beneath the card. */
  tone: string;
  onAction: () => void;
}

/**
 * WhatsApp-style swipe for one alert card: the card follows the finger (or mouse) horizontally,
 * revealing what will happen; past the threshold the action fires on release and the card
 * springs back. Vertical movement stays with the page (touch-action: pan-y, direction lock), so
 * scrolling the feed never triggers an action. A tap that ends a drag is swallowed, so swiping
 * over a button cannot press it. Every action is also available without swiping (card menu).
 */
export const SwipeableAlert: React.FC<{ right: SwipeAction; left: SwipeAction; children: React.ReactNode }> = ({ right, left, children }) => {
  const x = useMotionValue(0);
  const rightOpacity = useTransform(x, [0, 24, SWIPE_THRESHOLD], [0, 0.55, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24, 0], [1, 0.55, 0]);
  const [armed, setArmed] = useState<'left' | 'right' | null>(null);
  const armedRef = useRef<'left' | 'right' | null>(null);
  const dragged = useRef(false);

  useMotionValueEvent(x, 'change', (v) => {
    if (Math.abs(v) > 6) dragged.current = true;
    const next = v >= SWIPE_THRESHOLD ? 'right' : v <= -SWIPE_THRESHOLD ? 'left' : null;
    if (next !== armedRef.current) {
      armedRef.current = next;
      setArmed(next);
      // A short tick where supported (Android); silently ignored elsewhere.
      if (next) navigator.vibrate?.(8);
    }
  });

  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-card">
        <motion.div style={{ opacity: rightOpacity }} className={cx('absolute inset-0 flex items-center gap-2 pl-5 text-[13px] font-semibold', right.tone)}>
          <motion.span animate={{ scale: armed === 'right' ? 1.12 : 1 }} transition={{ duration: 0.15 }} className="inline-flex">
            {right.icon}
          </motion.span>
          {right.label}
        </motion.div>
        <motion.div style={{ opacity: leftOpacity }} className={cx('absolute inset-0 flex items-center justify-end gap-2 pr-5 text-[13px] font-semibold', left.tone)}>
          {left.label}
          <motion.span animate={{ scale: armed === 'left' ? 1.12 : 1 }} transition={{ duration: 0.15 }} className="inline-flex">
            {left.icon}
          </motion.span>
        </motion.div>
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragSnapToOrigin
        dragMomentum={false}
        style={{ x, touchAction: 'pan-y' }}
        onDragStart={() => {
          dragged.current = false;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x >= SWIPE_THRESHOLD) right.onAction();
          else if (info.offset.x <= -SWIPE_THRESHOLD) left.onAction();
          // Let the click that ends this gesture be swallowed, then accept taps again.
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
};
