import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check, FileText, History, Star } from 'lucide-react';
import { useMarkRead, useToggleFavourite } from '../../lib/queries';
import { useToast } from '../common/Toast';
import { dateTime, relativeTime, shortDate, signedPct } from '../../lib/format';
import type { HistoricalMatch, NotificationItem, OutcomeLabel } from '../../lib/types';
import { DemoPill, PriorityBadge, Ticker, cx } from '../ui';
import { CompanyLogo } from '../company/CompanyLogo';

const METRIC_LABELS: Record<string, (v: number | string) => string> = {
  changePercent: (v) => `${signedPct(Number(v))} 1D`,
  volumeRatio: (v) => `${Number(v).toFixed(2)}× vol`,
  amountCr: (v) => `₹${Number(v).toLocaleString('en-IN')} Cr`,
  revenueCr: (v) => `Rev ₹${Number(v).toLocaleString('en-IN')} Cr`,
  patCr: (v) => `PAT ₹${Number(v).toLocaleString('en-IN')} Cr`,
  similarity: (v) => `${(Number(v) * 100).toFixed(0)}% match`,
  priorDelayDays: (v) => `Prior delay ${Math.round(Number(v) / 30.44)} mo`,
};

export function metricChips(metrics: Record<string, number | string | null> | undefined) {
  if (!metrics) return [];
  return Object.entries(metrics)
    .filter(([k, v]) => v !== null && v !== undefined && METRIC_LABELS[k])
    // An amount parsed from the filing text that equals reported revenue is the same figure.
    .filter(([k, v]) => !(k === 'amountCr' && metrics.revenueCr !== null && Number(v) === Number(metrics.revenueCr)))
    .map(([k, v]) => ({ key: k, label: METRIC_LABELS[k](v as number | string), tone: k === 'changePercent' ? (Number(v) >= 0 ? 'up' : 'down') : null }))
    .slice(0, 3);
}

const OUTCOME_TONE: Record<OutcomeLabel, string> = {
  'Delivered on time': 'text-fin-up dark:text-emerald',
  'Delivered early': 'text-fin-up dark:text-emerald',
  'Delivered late': 'text-fin-amber',
  'Delivered — timing unverified': 'text-forest dark:text-emerald',
  Delayed: 'text-fin-amber',
  Abandoned: 'text-fin-red',
  'In progress': 'text-ink-muted',
  'Outcome unverified': 'text-ink-muted',
};

export const HistoricalMatchBlock: React.FC<{ match: HistoricalMatch; onView: () => void }> = ({ match, onView }) => {
  const e = match.event;
  const delay = match.delayDays !== null ? (match.delayDays > 30 ? `${Math.round(match.delayDays / 30.44)} months late` : match.delayDays < -15 ? `${Math.round(-match.delayDays / 30.44)} months early` : 'on schedule') : null;
  return (
    <section className="rounded-lg border border-forest/20 bg-sage/50 p-3 dark:border-emerald/25 dark:bg-emerald-subtle/40" aria-label="Historical event match">
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-eyebrow text-forest dark:text-emerald">
        <History size={13} strokeWidth={2} /> Historical event match found
        <span className="ml-auto font-mono normal-case tracking-normal text-forest/70 dark:text-emerald/70">{Math.round(match.similarity * 100)}% match</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-ink dark:text-ink-light">
        {match.sameCompany ? `${e.company.name} previously announced a similar project` : `${e.company.name} (a comparable company) announced a similar project`} in {e.announcedAt.slice(0, 4)}.
      </p>
      <div className="mt-2.5 rounded-lg bg-paper/80 p-3 dark:bg-ink-surface/70">
        <div className="text-[13px] font-medium leading-snug text-ink dark:text-white">{e.title}</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div>
            <dt className="text-ink-subtle">Announced</dt>
            <dd className="font-mono text-ink dark:text-ink-light">{shortDate(e.announcedAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Expected completion</dt>
            <dd className="font-mono text-ink dark:text-ink-light">{e.expectedCompletionDate ? shortDate(e.expectedCompletionDate) : 'Not disclosed'}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Actual completion</dt>
            <dd className="font-mono text-ink dark:text-ink-light">{e.actualCompletionDate ? shortDate(e.actualCompletionDate) : 'Not reported'}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Outcome</dt>
            <dd className={cx('font-semibold', OUTCOME_TONE[match.outcome])}>
              {match.outcome}
              {delay && match.outcome !== 'Delivered on time' ? <span className="font-normal text-ink-muted"> · {delay}</span> : null}
            </dd>
          </div>
        </dl>
        <p className="mt-2 line-clamp-2 text-[11.5px] italic leading-snug text-ink-muted">Original commitment: {e.originalAnnouncement}</p>
        {match.evidence && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-ink-muted">
            <FileText size={11} strokeWidth={1.75} className="mt-[2px] shrink-0" /> {match.evidence.title}
            {e.isDemo && <DemoPill className="ml-1" />}
          </p>
        )}
      </div>
      <button
        onClick={onView}
        className="group mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-forest/30 bg-paper px-3 text-[12.5px] font-semibold text-forest transition-colors hover:bg-forest hover:text-white dark:border-emerald/30 dark:bg-ink-surface dark:text-emerald"
      >
        View historical event <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </section>
  );
};

/**
 * Bookmark toggle: outlined when off, filled forest green when on. Never touches read state.
 * `labelled` is the alert-card action ("Save" / "Saved"); the icon-only form suits dense lists.
 */
export const FavouriteButton: React.FC<{ alertId: string; favourited: boolean; labelled?: boolean; className?: string }> = ({ alertId, favourited, labelled, className }) => {
  const toggle = useToggleFavourite();
  const toast = useToast();
  const label = favourited ? 'Remove from favourites' : 'Add to favourites';
  return (
    <button
      type="button"
      onClick={() =>
        toggle.mutate(
          { id: alertId, favourite: !favourited },
          {
            onSuccess: () => toast(favourited ? 'Removed from favourites' : 'Added to favourites'),
            onError: () => toast('Could not update favourites — please try again', 'info'),
          },
        )
      }
      aria-pressed={favourited}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 transition-colors duration-200',
        labelled ? 'min-h-[44px] text-[12px] font-medium' : 'h-9 w-9 rounded-md',
        favourited ? 'text-forest dark:text-emerald' : 'text-ink-muted hover:text-ink dark:hover:text-white',
        !labelled && (favourited ? 'hover:bg-sage dark:hover:bg-emerald-subtle' : 'hover:bg-cream-dark dark:hover:bg-ink-surfaceSubtle'),
        className,
      )}
    >
      <motion.span
        key={favourited ? 'on' : 'off'}
        initial={favourited ? { scale: 0.55 } : { scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={favourited ? { type: 'spring', stiffness: 520, damping: 14 } : { duration: 0.15 }}
        className="inline-flex"
      >
        <Star size={labelled ? 15 : 16} strokeWidth={favourited ? 2 : 1.75} fill={favourited ? 'currentColor' : 'none'} />
      </motion.span>
      {labelled && <span aria-hidden>{favourited ? 'Saved' : 'Save'}</span>}
    </button>
  );
};

/**
 * A Portfolio Alert laid out for a phone: company identity and priority on one row, what
 * happened and its figures below, the source in one line, and three equal touch targets
 * (save, read, evidence) across the foot of the card.
 */
export const AlertCard: React.FC<{
  alert: NotificationItem;
  onInspect: () => void;
  onOpenCompany: () => void;
  onViewHistoricalEvent: (historicalEventId: string, newEventId: string, companySymbol?: string | null) => void;
}> = ({ alert, onInspect, onOpenCompany, onViewHistoricalEvent }) => {
  const markRead = useMarkRead();
  const evidence = alert.signal.evidence?.[0];
  const chips = metricChips(alert.signal.metrics);
  const isRead = Boolean(alert.readAt);
  const urgent = !isRead && (alert.priority === 'critical' || alert.priority === 'high');
  // Filing signals carry a generic "Company: Category" title; lead with the development itself.
  const generic = alert.title.startsWith(`${alert.company.name}:`);
  const headline = generic ? alert.body : alert.title;
  const detail = generic ? null : alert.body;
  const action = 'flex min-h-[44px] items-center justify-center gap-1.5 text-[12px] font-medium transition-colors duration-200';

  return (
    <article
      className={cx(
        'group relative overflow-hidden rounded-card border bg-paper dark:bg-ink-surface',
        'before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
        isRead ? 'border-divider/70 dark:border-ink-border/70 before:bg-transparent' : 'border-divider dark:border-ink-border',
        !isRead && alert.priority === 'critical' && 'before:bg-fin-red',
        !isRead && alert.priority === 'high' && 'before:bg-fin-amber',
      )}
      aria-label={`${isRead ? 'Read' : 'Unread'} alert: ${headline}`}
    >
      <div className={cx('space-y-2.5 px-4 pb-3 pt-3.5', isRead && 'opacity-[0.86]')}>
        <header className="flex items-start gap-3">
          <button onClick={onOpenCompany} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Open ${alert.company.name}`}>
            <CompanyLogo name={alert.company.name} nseSymbol={alert.company.nseSymbol} size="sm" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                {!isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest dark:bg-emerald" aria-label="Unread" />}
                <Ticker symbol={alert.company.nseSymbol} />
              </span>
              <span className="block truncate text-[11.5px] text-ink-muted">{alert.company.name}</span>
            </span>
          </button>
          <PriorityBadge priority={alert.priority} className="mt-1" />
        </header>

        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="truncate rounded bg-cream-dark/70 px-1.5 py-px font-medium text-ink dark:bg-ink-surfaceSubtle dark:text-ink-light">{alert.signal.categoryLabel ?? alert.signal.category}</span>
          <span aria-hidden>·</span>
          <time className="shrink-0 font-mono text-[10.5px]" title={`Detected ${dateTime(alert.signal.detectedAt ?? alert.createdAt)}`}>
            {relativeTime(alert.signal.occurredAt)}
          </time>
          {alert.signal.isDemo && <DemoPill className="ml-auto" />}
        </div>

        <div>
          <h3 className={cx('text-[14px] leading-snug tracking-[-0.01em] text-ink dark:text-white', urgent ? 'font-semibold' : 'font-medium')}>{headline}</h3>
          {detail && <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">{detail}</p>}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <span
                key={c.key}
                className={cx(
                  'rounded-md bg-cream-dark/70 px-2 py-0.5 font-mono text-[11px] dark:bg-ink-surfaceSubtle',
                  c.tone === 'up' ? 'text-fin-up dark:text-emerald' : c.tone === 'down' ? 'text-fin-red' : 'text-ink dark:text-ink-light',
                )}
              >
                {c.label}
              </span>
            ))}
          </div>
        )}

        {evidence && (
          <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-muted">
            <FileText size={12} strokeWidth={1.75} className="mt-[2px] shrink-0 text-ink-subtle" />
            <span className="line-clamp-2">
              <span className="font-medium text-ink dark:text-ink-light">{evidence.label}</span> — {evidence.detail}
            </span>
          </p>
        )}

        {alert.historicalMatch && (
          <HistoricalMatchBlock match={alert.historicalMatch} onView={() => onViewHistoricalEvent(alert.historicalMatch!.event.id, alert.historicalMatch!.newEventId, alert.historicalMatch!.event.company.nseSymbol)} />
        )}
      </div>

      <footer className="grid grid-cols-3 divide-x divide-divider border-t border-divider dark:divide-ink-border dark:border-ink-border">
        <FavouriteButton alertId={alert.id} favourited={Boolean(alert.favourited ?? alert.favouritedAt)} labelled />
        <button
          onClick={() => markRead.mutate({ id: alert.id, read: !isRead })}
          aria-pressed={isRead}
          aria-label={isRead ? 'Marked as read — mark as unread' : 'Mark as read'}
          className={cx(action, isRead ? 'text-forest dark:text-emerald' : 'text-ink-muted hover:text-ink dark:hover:text-white')}
        >
          <Check size={14} strokeWidth={isRead ? 2.5 : 2} /> {isRead ? 'Read' : 'Mark read'}
        </button>
        <button onClick={onInspect} className={cx(action, 'font-semibold text-forest hover:text-forest-light dark:text-emerald')}>
          Evidence <ArrowUpRight size={14} strokeWidth={2} />
        </button>
      </footer>
    </article>
  );
};
