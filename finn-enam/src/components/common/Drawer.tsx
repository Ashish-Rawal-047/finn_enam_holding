import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[92vh] sm:max-h-[88vh] w-full ${widthClasses[maxWidth]} flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-ink-surface border-t sm:border border-stone-200/90 dark:border-ink-border shadow-float overflow-hidden transition-all`}
      >
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-stone-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 dark:border-ink-border px-5 py-4">
          <div className="pr-3">
            <h3 className="text-base font-semibold text-stone-900 dark:text-white tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 text-sm text-stone-700 dark:text-slate-300">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="border-t border-stone-100 dark:border-ink-border px-5 py-3.5 bg-stone-50/70 dark:bg-ink-bg/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
