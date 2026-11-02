import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

/**
 * A detail screen pushed over the current tab, filling the app frame, with a back button.
 */
export const FullScreenSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  /** Shown before the title, e.g. a company logo. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, leading, actions, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-enter relative flex h-full w-full flex-col bg-cream dark:bg-ink-bg [background-color:#F7F5ED] dark:[background-color:#0E1B16] overflow-hidden"
      >
        <header className="safe-pt border-b border-divider bg-cream dark:border-ink-border dark:bg-ink-bg">
          <div className="flex min-h-[56px] items-center gap-2 px-2">
            <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink dark:text-white hover:bg-paper dark:hover:bg-ink-surface" aria-label="Back">
              <ChevronLeft size={22} />
            </button>
            {leading}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-[19px] leading-tight text-forest-dark dark:text-white">{title}</h2>
              {subtitle && <div className="truncate text-[11px] text-ink-muted">{subtitle}</div>}
            </div>
            {actions}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-4 safe-pb">{children}</div>
      </div>
    </div>
  );
};
