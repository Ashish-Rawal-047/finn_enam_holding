import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Shown before the title, e.g. a company logo. */
  leading?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Bottom sheet over the current screen, inside the app frame (portalled into #app-overlays).
 * The dimmed, blurred backdrop and the opaque panel are siblings, so the panel never
 * inherits the backdrop's opacity or blur.
 */
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, subtitle, leading, children, footer }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-surface sheet-enter relative flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-[20px] border-t border-divider shadow-sheet dark:border-ink-border"
      >
        <div className="modal-surface flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-sage-dark dark:bg-ink-border" />
        </div>

        <header className="modal-surface flex items-start justify-between gap-3 border-b border-divider px-5 py-3 dark:border-ink-border">
          <div className="flex min-w-0 items-center gap-3 pt-1">
            {leading}
            <div className="min-w-0">
              <h3 className="font-serif text-[22px] leading-tight text-forest-dark dark:text-white">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-dark hover:text-ink dark:hover:bg-ink-surfaceSubtle dark:hover:text-white"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </header>

        <div className={`modal-surface flex-1 overflow-y-auto overscroll-contain px-5 py-4 ${footer ? '' : 'safe-pb'}`}>{children}</div>

        {footer && <footer className="modal-surface-subtle border-t border-divider px-5 py-3 safe-pb dark:border-ink-border">{footer}</footer>}
      </div>
    </div>,
    document.getElementById('app-overlays') ?? document.body,
  );
};
