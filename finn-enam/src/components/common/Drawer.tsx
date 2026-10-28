import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer / Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] sm:max-h-[85vh] w-full sm:max-w-xl flex-col rounded-t-2xl sm:rounded-2xl bg-dark-surface border-t sm:border border-dark-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-700/80" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-dark-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-dark-textMuted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 text-sm text-slate-300">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="border-t border-dark-border px-5 py-3.5 bg-dark-bg/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
