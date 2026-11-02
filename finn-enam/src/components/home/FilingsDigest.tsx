import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown, FileSearch, FileText } from 'lucide-react';
import { useDigest } from '../../lib/queries';
import { dateTime, relativeTime, shortDate } from '../../lib/format';
import type { DigestItem, DigestResponse, DigestWindow } from '../../lib/types';
import { EASE_OUT } from '../motion';
import { Chips, DemoPill, ErrorState, Field, LoadingBlock, PriorityBadge, SecondaryButton, SectionTitle, Ticker, cx, inputCls } from '../ui';
import { CompanyLogo } from '../company/CompanyLogo';

const WINDOWS: Array<{ id: DigestWindow; label: string }> = [
  { id: '24h', label: '24 hours' },
  { id: '48h', label: '48 hours' },
  { id: '7d', label: '7 days' },
  { id: 'custom', label: 'Custom' },
];

const STORE_KEY = 'finn-digest-window';
const localDate = (d = new Date()) => d.toLocaleDateString('en-CA');
const daysAgo = (n: number) => localDate(new Date(Date.now() - n * 86_400_000));

interface Selection {
  window: DigestWindow;
  from: string;
  to: string;
}

// The chosen window survives tab switches and reloads within the session; a new session starts at 24 hours.
function loadSelection(): Selection {
  const fallback: Selection = { window: '24h', from: daysAgo(6), to: localDate() };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as Selection | null;
    return saved && WINDOWS.some((w) => w.id === saved.window) ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

function windowPhrase({ id, fromDate, toDate }: DigestResponse['window']) {
  if (id === '24h') return 'in the last 24 hours';
  if (id === '48h') return 'in the last 48 hours';
  if (id === '7d') return 'in the last 7 days';
  return fromDate === toDate ? `on ${shortDate(fromDate)}` : `between ${shortDate(fromDate)} and ${shortDate(toDate)}`;
}

/**
 * Windowed digest of corporate filings across the portfolio. The window defaults to the last 24
 * hours; 48 hours, 7 days or a custom date range can be chosen. Material filings are ranked by
 * materiality, routine paperwork is collapsed below them.
 */
export const FilingsDigest: React.FC<{ onInspectSignal: (signalId: string) => void }> = ({ onInspectSignal }) => {
  const [sel, setSel] = useState<Selection>(loadSelection);
  const [routineOpen, setRoutineOpen] = useState(false);
  const routineId = useId();
  const customInvalid = sel.window === 'custom' && (!sel.from || !sel.to || sel.from > sel.to);
  const digest = useDigest(sel.window, sel.from, sel.to);
  const data = digest.data;

  const update = (patch: Partial<Selection>) => {
    const next = { ...sel, ...patch };
    setSel(next);
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: the choice lasts for this view only */
    }
  };

  return (
    <section className="space-y-4" aria-label="Recent Filings">
      <SectionTitle title="Recent Filings" meta="Every filing across your portfolio — what matters first, routine paperwork folded away" />

      <Chips<DigestWindow> ariaLabel="Digest window" value={sel.window} onChange={(window) => update({ window })} options={WINDOWS} />

      {sel.window === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <input type="date" className={inputCls} value={sel.from} max={sel.to || localDate()} onChange={(e) => update({ from: e.target.value })} aria-label="Digest from date" />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={sel.to} min={sel.from} max={localDate()} onChange={(e) => update({ to: e.target.value })} aria-label="Digest to date" />
          </Field>
          {customInvalid && <p className="col-span-2 text-[12px] text-fin-red">Choose a start date on or before the end date.</p>}
        </div>
      )}

      {customInvalid ? null : digest.isError ? (
        <ErrorState error={digest.error} onRetry={() => digest.refetch()} />
      ) : !data ? (
        <LoadingBlock rows={3} />
      ) : data.total === 0 ? (
        <EmptyDigest data={data} onSelect={update} />
      ) : (
        <div className={cx('space-y-3 transition-opacity', digest.isFetching && digest.isPlaceholderData && 'opacity-60')}>
          <p className="text-[12px] text-ink-muted">
            <span className="font-mono text-ink dark:text-white">{data.total}</span> {data.total === 1 ? 'filing' : 'filings'} {windowPhrase(data.window)}
            {data.window.id !== 'custom' && <> · since {dateTime(data.window.start)}</>}
            {data.byPriority.critical + data.byPriority.high > 0 && (
              <>
                {' '}· <span className="font-medium text-fin-amber">{data.byPriority.critical + data.byPriority.high} high priority</span>
              </>
            )}
          </p>

          {data.material.length > 0 ? (
            <ul className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
              {data.material.map((item) => (
                <li key={item.id}>
                  <MaterialRow item={item} onInspectSignal={onInspectSignal} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-card border border-dashed border-divider px-4 py-4 text-center text-[12.5px] text-ink-muted dark:border-ink-border">Only routine paperwork was filed {windowPhrase(data.window)}.</p>
          )}
          {data.materialCount > data.material.length && <p className="text-[11.5px] text-ink-muted">Showing the {data.material.length} most material of {data.materialCount}. Narrow the window to see the rest.</p>}

          {data.routineCount > 0 && (
            <div className="overflow-hidden rounded-card border border-divider dark:border-ink-border">
              <button
                onClick={() => setRoutineOpen((o) => !o)}
                aria-expanded={routineOpen}
                aria-controls={routineId}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] text-ink-muted transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle"
              >
                <FileText size={14} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
                <span className="flex-1">
                  Routine paperwork <span className="font-mono text-[11px] text-ink-subtle">{data.routineCount}</span>
                  <span className="hidden"> · shareholding patterns, allotments, postal ballots and similar</span>
                </span>
                <ChevronDown size={16} strokeWidth={1.75} className={cx('shrink-0 transition-transform duration-200', routineOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {routineOpen && (
                  <motion.ul
                    id={routineId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="divide-y divide-divider border-t border-divider dark:divide-ink-border dark:border-ink-border"
                  >
                    {data.routine.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex w-[104px] shrink-0 items-center gap-2">
                          <CompanyLogo {...item.company} size="xs" />
                          <Ticker symbol={item.company.nseSymbol} className="text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink dark:text-ink-light">{item.title}</span>
                        <span className="shrink-0 font-mono text-[10.5px] text-ink-subtle">{relativeTime(item.announcedAt)}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          {data.isDemo && (
            <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-muted">
              <DemoPill /> These filings are demonstration fixtures; no licensed exchange filings feed is connected.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

const MaterialRow: React.FC<{ item: DigestItem; onInspectSignal: (id: string) => void }> = ({ item, onInspectSignal }) => {
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <CompanyLogo {...item.company} size="xs" />
        <Ticker symbol={item.company.nseSymbol} />
        <span className="truncate text-[11.5px] text-ink-muted">{item.categoryLabel}</span>
      </div>
      <PriorityBadge priority={item.priority} />
      <div className="text-[13.5px] font-medium leading-snug text-ink dark:text-white">{item.title}</div>
      {item.signalId ? <ArrowUpRight size={15} strokeWidth={1.75} className="self-center justify-self-end text-ink-subtle transition-transform group-hover:-translate-y-px group-hover:translate-x-px" /> : <span />}
      {item.summary && item.summary !== item.title && <p className="col-span-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">{item.summary}</p>}
      <div className="col-span-2 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-ink-subtle">
        <time dateTime={item.announcedAt} title={dateTime(item.announcedAt)}>
          {relativeTime(item.announcedAt)}
        </time>
        {item.exchange && <span>· {item.exchange}</span>}
        {item.isDemo && <DemoPill />}
      </div>
    </>
  );
  const cls = 'group grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3.5 text-left';
  return item.signalId ? (
    <button onClick={() => onInspectSignal(item.signalId!)} className={cx(cls, 'transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const fullDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Compact empty window: what is missing, when the last filing was, and one way to widen the window. */
const EmptyDigest: React.FC<{ data: DigestResponse; onSelect: (patch: Partial<Selection>) => void }> = ({ data, onSelect }) => {
  const latest = data.latestFilingAt;
  const withinWeek = latest !== null && Date.now() - new Date(latest).getTime() < 7 * 86_400_000;
  const action = !latest ? null : withinWeek && (data.window.id === '24h' || data.window.id === '48h') ? (
    <SecondaryButton className="min-h-[38px] px-3.5 text-[12.5px]" onClick={() => onSelect({ window: '7d' })}>
      Show the last 7 days
    </SecondaryButton>
  ) : (
    <SecondaryButton className="min-h-[38px] px-3.5 text-[12.5px]" onClick={() => onSelect({ window: 'custom', from: localDate(new Date(latest)), to: localDate() })}>
      Show filings since {shortDate(localDate(new Date(latest)))}
    </SecondaryButton>
  );
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 rounded-card border border-dashed border-divider px-4 py-3.5 dark:border-ink-border">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-dark text-ink-muted dark:bg-ink-surfaceSubtle" aria-hidden>
        <FileSearch size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink dark:text-white">{latest ? `No filings ${windowPhrase(data.window)}` : 'No filings yet'}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
          {latest ? (
            <>
              Most recent filing on your portfolio: <time dateTime={latest}>{fullDateTime(latest)}</time> ({relativeTime(latest)})
            </>
          ) : (
            'No filings are stored for the companies in your portfolio yet.'
          )}
        </p>
      </div>
      {action && <div className="col-start-2">{action}</div>}
    </div>
  );
};
