import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'forest'
  | 'emerald'
  | 'sage'
  | 'amber'
  | 'red'
  | 'neutral'
  | 'teal'
  | 'sky'
  | 'rose';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2',
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
  };

  const variantClasses: Record<BadgeVariant, { bg: string; dotColor?: string }> = {
    default: {
      bg: 'bg-sage text-forest font-semibold border border-divider',
      dotColor: 'bg-forest',
    },
    forest: {
      bg: 'bg-forest text-white font-medium shadow-sm',
      dotColor: 'bg-emerald-300',
    },
    emerald: {
      bg: 'bg-sage text-forest font-semibold border border-sage-dark',
      dotColor: 'bg-emerald',
    },
    sage: {
      bg: 'bg-sage text-forest font-medium border border-divider',
      dotColor: 'bg-forest',
    },
    amber: {
      bg: 'bg-fin-amberBg text-fin-amber font-semibold border border-fin-amber/30 dark:bg-fin-amberBgDark',
      dotColor: 'bg-fin-amber',
    },
    red: {
      bg: 'bg-fin-redBg text-fin-red font-semibold border border-fin-red/30 dark:bg-fin-redBgDark',
      dotColor: 'bg-fin-red',
    },
    rose: {
      bg: 'bg-fin-redBg text-fin-red font-semibold border border-fin-red/30 dark:bg-fin-redBgDark',
      dotColor: 'bg-fin-red',
    },
    teal: {
      bg: 'bg-sage text-forest font-semibold border border-sage-dark',
      dotColor: 'bg-forest',
    },
    sky: {
      bg: 'bg-sage text-forest font-medium border border-divider',
      dotColor: 'bg-forest',
    },
    neutral: {
      bg: 'bg-cream-dark text-ink-muted border border-divider',
      dotColor: 'bg-ink-muted',
    },
  };

  const currentVariant = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-sans tracking-tight transition-colors ${sizeClasses[size]} ${currentVariant.bg} ${className}`}
    >
      {dot && currentVariant.dotColor && (
        <span className={`h-1.5 w-1.5 rounded-full ${currentVariant.dotColor} shrink-0`} />
      )}
      <span>{children}</span>
    </span>
  );
};
