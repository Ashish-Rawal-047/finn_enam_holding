import React from 'react';

export type BadgeVariant = 'emerald' | 'teal' | 'rose' | 'amber' | 'sky' | 'neutral' | 'subtle';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
    teal: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
    sky: 'bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/60',
    subtle: 'bg-transparent text-stone-600 border-stone-200/70 dark:text-slate-400 dark:border-slate-700/50',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.2 leading-tight font-medium',
    sm: 'text-[11px] px-2 py-0.5 leading-tight font-medium',
    md: 'text-xs px-2.5 py-1 leading-normal font-medium',
  };

  const dotColors: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    neutral: 'bg-stone-400 dark:bg-slate-400',
    subtle: 'bg-stone-400 dark:bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-normal transition-colors font-sans ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
