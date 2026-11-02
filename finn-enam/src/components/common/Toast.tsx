import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { EASE_OUT } from '../motion';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info';
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

/** Subtle, self-dismissing confirmations ("Added to favourites"). Announced politely to screen readers. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++next.current;
    // One at a time: a newer confirmation replaces the previous one.
    setToasts([{ id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[80] flex justify-center px-4"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                role="status"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-forest-dark px-4 py-2.5 text-[12.5px] font-medium text-white shadow-lg dark:bg-ink-surface dark:text-ink-light dark:ring-1 dark:ring-ink-border"
              >
                {t.tone === 'success' ? <Check size={14} strokeWidth={2.25} className="text-sage dark:text-emerald" /> : <Info size={14} strokeWidth={2} />}
                {t.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
