import React from 'react';

export type BadgeVariant = 'emerald' | 'teal' | 'rose' | 'amber' | 'sky' | 'neutral' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
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
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
    teal: 'bg-teal-950/40 text-teal-400 border-teal-800/40',
    rose: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    sky: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    neutral: 'bg-slate-900/60 text-slate-300 border-slate-800',
    outline: 'bg-transparent text-slate-400 border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 leading-tight font-medium',
    md: 'text-xs px-2.5 py-1 leading-normal font-medium',
  };

  const dotColors: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-400',
    teal: 'bg-teal-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-sans tracking-wide uppercase transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />}
      {children}
    </span>
  );
};
