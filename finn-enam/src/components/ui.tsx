/**
 * FINN design-system primitives.
 * Paper surfaces on a warm canvas, hairline dividers instead of heavy cards, mono figures,
 * one restrained green accent. Shadows appear only on interaction or floating layers.
 */
import React from 'react';
import { AlertTriangle, FlaskConical, Inbox, Loader2, RefreshCw } from 'lucide-react';
import type { ClaimType, Priority } from '../lib/types';
import { ApiRequestError } from '../lib/api';

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** Standard icon sizing/stroke so every glyph shares one visual weight. */
export const ICON = { sm: 14, md: 16, lg: 18, stroke: 1.75 } as const;

// ---------------------------------------------------------------------------
// Surfaces & typography
// ---------------------------------------------------------------------------

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  interactive?: boolean;
  as?: 'div' | 'section';
}> = ({ children, className, padded = true, interactive, as: Tag = 'div' }) => (
  <Tag
    className={cx(
      'rounded-card border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface',
      padded && 'p-4',
      interactive && 'lift cursor-pointer hover:border-divider-dark/20 dark:hover:border-emerald/30',
      className,
    )}
  >
    {children}
  </Tag>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cx('text-2xs font-medium uppercase tracking-eyebrow text-ink-muted dark:text-ink-subtle', className)}>{children}</span>
);

/** Screen heading: a compact serif title (the app bar already names the tab) with an optional one-line lede. */
export const ScreenTitle: React.FC<{ title: React.ReactNode; lede?: React.ReactNode; action?: React.ReactNode }> = ({ title, lede, action }) => (
  <header className="space-y-1">
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-serif text-[26px] leading-[1.1] text-forest-dark dark:text-white">{title}</h1>
      {action}
    </div>
    {lede && <p className="text-[12.5px] leading-snug text-ink-muted">{lede}</p>}
  </header>
);

export const SectionTitle: React.FC<{ title: string; meta?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, meta, action, icon }) => (
  <div className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-ink dark:text-white">
        {icon && <span className="text-forest dark:text-emerald">{icon}</span>}
        {title}
      </h2>
      {meta && <div className="mt-0.5 text-[11.5px] text-ink-muted">{meta}</div>}
    </div>
    {action}
  </div>
);

export const Hairline: React.FC<{ className?: string }> = ({ className }) => <div className={cx('h-px w-full bg-divider dark:bg-ink-border', className)} />;

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

export const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg';
}> = ({ label, value, sub, tone = 'neutral', icon, className, size = 'md' }) => (
  <div className={cx('min-w-0', className)}>
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-ink-subtle">{icon}</span>}
      <Eyebrow>{label}</Eyebrow>
    </div>
    <div
      className={cx(
        'mt-1.5 font-mono font-medium tabular-nums leading-none',
        size === 'lg' ? 'text-[28px]' : 'text-[19px]',
        tone === 'up' ? 'text-fin-up dark:text-emerald' : tone === 'down' ? 'text-fin-red' : 'text-ink dark:text-white',
      )}
    >
      {value}
    </div>
    {sub && <div className="mt-1 text-[11px] text-ink-muted">{sub}</div>}
  </div>
);

export const DemoPill: React.FC<{ className?: string; label?: string }> = ({ className, label = 'Demo data' }) => (
  <span
    title="Demonstration data — not live market or filing data"
    className={cx(
      'inline-flex items-center gap-1 rounded-full border border-fin-amber/30 bg-fin-amberBg/80 dark:bg-fin-amberBgDark px-2 py-px text-[10px] font-medium text-fin-amber whitespace-nowrap',
      className,
    )}
  >
    <FlaskConical size={10} strokeWidth={2} /> {label}
  </span>
);

const PRIORITY_STYLE: Record<Priority, { dot: string; text: string }> = {
  critical: { dot: 'bg-fin-red', text: 'text-fin-red' },
  high: { dot: 'bg-fin-amber', text: 'text-fin-amber' },
  medium: { dot: 'bg-forest dark:bg-emerald', text: 'text-forest dark:text-emerald' },
  low: { dot: 'bg-ink-subtle', text: 'text-ink-muted' },
};

export const PriorityBadge: React.FC<{ priority: Priority; className?: string }> = ({ priority, className }) => (
  <span className={cx('inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]', PRIORITY_STYLE[priority].text, className)}>
    <span className={cx('h-1.5 w-1.5 rounded-full', PRIORITY_STYLE[priority].dot, priority === 'critical' && 'animate-pulse')} aria-hidden />
    {priority}
  </span>
);

export const priorityRail = (p: Priority) =>
  p === 'critical' ? 'before:bg-fin-red' : p === 'high' ? 'before:bg-fin-amber' : 'before:bg-transparent';

const CLAIM_STYLE: Record<ClaimType, { label: string; cls: string }> = {
  reported_fact: { label: 'Reported', cls: 'text-forest dark:text-emerald border-forest/25 dark:border-emerald/30' },
  calculated_metric: { label: 'Calculated', cls: 'text-ink dark:text-ink-light border-divider dark:border-ink-border' },
  ai_interpretation: { label: 'AI interpretation', cls: 'text-[#3A6FB0] dark:text-[#8FB0EA] border-[#3A6FB0]/30 dark:border-[#5B8BDD]/30' },
  analyst_note: { label: 'Analyst note · demo', cls: 'text-fin-amber border-fin-amber/30' },
};

export const ClaimTag: React.FC<{ type: ClaimType }> = ({ type }) => (
  <span className={cx('inline-flex shrink-0 rounded-full border px-2 py-px text-[9.5px] font-semibold uppercase tracking-[0.08em]', CLAIM_STYLE[type].cls)}>{CLAIM_STYLE[type].label}</span>
);

export const Change: React.FC<{ value: number | null | undefined; className?: string; digits?: number }> = ({ value, className, digits = 2 }) => {
  if (value === null || value === undefined) return <span className={cx('font-mono text-ink-muted', className)}>—</span>;
  const tone = value > 0 ? 'text-fin-up dark:text-emerald' : value < 0 ? 'text-fin-red' : 'text-ink-muted';
  return (
    <span className={cx('font-mono tabular-nums font-medium', tone, className)}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {Math.abs(value).toFixed(digits)}%
    </span>
  );
};

export const Ticker: React.FC<{ symbol: string | null | undefined; className?: string }> = ({ symbol, className }) => (
  <span className={cx('font-mono text-[12px] font-semibold tracking-[0.02em] text-ink dark:text-white', className)}>{symbol ?? '—'}</span>
);

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('animate-pulse rounded-lg bg-cream-dark dark:bg-ink-surfaceSubtle', className)} aria-hidden />
);

export const LoadingBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-2.5" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-[72px] w-full" />
    ))}
  </div>
);

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => <Loader2 size={size} className={cx('animate-spin', className)} />;

export const EmptyState: React.FC<{ title: string; body?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, body, action, icon }) => (
  <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-divider dark:border-ink-border px-6 py-10 text-center">
    <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-cream-dark dark:bg-ink-surfaceSubtle text-ink-muted">{icon ?? <Inbox size={ICON.lg} strokeWidth={ICON.stroke} />}</div>
    <p className="text-sm font-semibold text-ink dark:text-white">{title}</p>
    {body && <div className="max-w-sm text-[12.5px] leading-relaxed text-ink-muted">{body}</div>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => {
  const message = error instanceof ApiRequestError || error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-card border border-fin-red/25 bg-fin-redBg/60 dark:bg-fin-redBgDark px-5 py-6 text-center">
      <AlertTriangle size={ICON.lg} strokeWidth={ICON.stroke} className="text-fin-red" />
      <p className="text-sm font-semibold text-ink dark:text-white">Couldn’t load this</p>
      <p className="max-w-sm text-xs text-ink-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-divider bg-paper dark:bg-ink-surface px-3 text-xs font-semibold text-forest dark:text-emerald">
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Chips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: string; count?: number; icon?: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scrollbar-none">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={(e) => {
              onChange(o.id);
              // In a sideways-scrolling row, bring the chosen chip fully into view.
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }}
            className={cx(
              'inline-flex shrink-0 min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200',
              active
                ? 'border-forest bg-forest text-white dark:border-emerald dark:bg-emerald dark:text-ink-bg'
                : 'border-divider dark:border-ink-border bg-paper dark:bg-ink-surface text-ink-muted hover:border-ink-subtle hover:text-ink dark:hover:text-white',
            )}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && <span className={cx('font-mono text-[10.5px]', active ? 'opacity-80' : 'text-ink-subtle')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Two-to-four option segmented control (settings sections, view switches). */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: { options: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="grid rounded-xl bg-cream-dark dark:bg-ink-surfaceSubtle p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'min-h-[38px] rounded-lg text-[13px] font-medium transition-all duration-200',
            value === o.id ? 'bg-paper dark:bg-ink-surface text-ink dark:text-white shadow-card' : 'text-ink-muted hover:text-ink dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }> = ({ busy, children, className, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled || busy}
    className={cx(
      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-forest px-4 text-[13.5px] font-semibold text-white transition-all duration-200 hover:bg-forest-light active:scale-[0.98] disabled:opacity-55 dark:bg-emerald dark:text-ink-bg dark:hover:bg-emerald-light',
      className,
    )}
  >
    {busy && <Spinner size={14} />}
    {children}
  </button>
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...rest }) => (
  <button
    {...rest}
    className={cx(
      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface px-4 text-[13.5px] font-medium text-ink dark:text-white transition-all duration-200 hover:border-ink-subtle active:scale-[0.98] disabled:opacity-55',
      className,
    )}
  >
    {children}
  </button>
);

export const TextButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...rest }) => (
  <button
    {...rest}
    className={cx(
      'group inline-flex min-h-[40px] shrink-0 items-center gap-1 whitespace-nowrap text-[12.5px] font-semibold text-forest transition-colors hover:text-forest-light dark:text-emerald',
      className,
    )}
  >
    {children}
  </button>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <Eyebrow>{label}</Eyebrow>
    {children}
    {hint && <span className="block text-[11.5px] leading-snug text-ink-muted">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full min-h-[44px] rounded-lg border border-divider dark:border-ink-border bg-paper dark:bg-ink-surfaceSubtle px-3.5 py-2.5 text-[13.5px] text-ink dark:text-white placeholder:text-ink-subtle transition-colors focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 dark:focus:border-emerald';
