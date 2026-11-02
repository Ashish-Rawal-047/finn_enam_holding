import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, GitCompareArrows, Plus, Search } from 'lucide-react';
import { useEvents } from '../lib/queries';
import { crore, humanize, shortDate } from '../lib/format';
import type { CorporateEvent, EventStatus } from '../lib/types';
import { Rise, Stagger } from '../components/motion';
import { Chips, DemoPill, EmptyState, ErrorState, LoadingBlock, PrimaryButton, ScreenTitle, Segmented, Ticker, cx, inputCls } from '../components/ui';
import { Pager } from './SignalsScreen';
import { CompanyLogo } from '../components/company/CompanyLogo';

const STATUS_STYLE: Record<EventStatus, { dot: string; text: string }> = {
  announced: { dot: 'bg-ink-subtle', text: 'text-ink-muted' },
  initiated: { dot: 'bg-forest/60 dark:bg-emerald/60', text: 'text-forest dark:text-emerald' },
  in_progress: { dot: 'bg-forest dark:bg-emerald', text: 'text-forest dark:text-emerald' },
  on_track: { dot: 'bg-fin-up', text: 'text-fin-up dark:text-emerald' },
  delayed: { dot: 'bg-fin-amber', text: 'text-fin-amber' },
  completed: { dot: 'bg-forest-dark dark:bg-emerald', text: 'text-forest-dark dark:text-emerald' },
  abandoned: { dot: 'bg-fin-red', text: 'text-fin-red' },
  outcome_unverified: { dot: 'bg-ink-subtle', text: 'text-ink-muted' },
};

export const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => (
  <span className={cx('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.08em]', STATUS_STYLE[status].text)}>
    <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_STYLE[status].dot)} aria-hidden />
    {humanize(status)}
  </span>
);

/**
 * Execution bar: announcement → target. Fill shows elapsed time (or full when completed);
 * time past the target is drawn as an amber overrun; the tick marks today.
 */
export const ExecutionBar: React.FC<{ event: Pick<CorporateEvent, 'announcedAt' | 'expectedCompletionDate' | 'status'> & { delayDays?: number | null } }> = ({ event }) => {
  const start = Date.parse(`${event.announcedAt}T00:00:00Z`);
  const target = event.expectedCompletionDate ? Date.parse(`${event.expectedCompletionDate}T00:00:00Z`) : null;
  const now = Date.now();
  if (!target || target <= start) {
    return (
      <div className="h-1 w-full rounded-full border border-dashed border-divider dark:border-ink-border" title="No completion target disclosed" />
    );
  }
  const done = event.status === 'completed';
  const knownDelay = event.delayDays !== null && event.delayDays !== undefined;
  // A completed event only shows an overrun when an actual delay is recorded — never infer one.
  const end = done ? (knownDelay ? target + event.delayDays! * 86_400_000 : target) : now;
  const span = Math.max(target, end) - start;
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - start) / span) * 100));
  const targetPct = pct(target);
  const fill = done ? 100 : pct(Math.min(now, target));
  const overrun = !done && now > target ? pct(now) - targetPct : done && end > target ? pct(end) - targetPct : 0;
  return (
    <div className="relative h-1 w-full rounded-full bg-cream-dark dark:bg-ink-surfaceSubtle" role="img" aria-label={`Elapsed ${Math.round(fill)}% of planned timeline${overrun ? ', past target' : ''}`}>
      <div className={cx('absolute inset-y-0 left-0 rounded-full', done ? 'bg-forest dark:bg-emerald' : 'bg-forest/70 dark:bg-emerald/70')} style={{ width: `${Math.min(fill, targetPct)}%` }} />
      {overrun > 0 && <div className="absolute inset-y-0 rounded-r-full bg-fin-amber" style={{ left: `${targetPct}%`, width: `${overrun}%` }} />}
      <div className="absolute -top-1 -bottom-1 w-px bg-ink-muted/70" style={{ left: `${targetPct}%` }} title="Target" />
    </div>
  );
};

interface Props {
  onOpenEvent: (id: string) => void;
  onCreateEvent: () => void;
  /** Company symbol to pre-select when arriving from an alert's historical match. */
  focusQuery?: string | null;
}

export const EventMemoryScreen: React.FC<Props> = ({ onOpenEvent, onCreateEvent, focusQuery }) => {
  const [scope, setScope] = useState<'portfolio' | 'all'>(focusQuery ? 'all' : 'portfolio');
  const [status, setStatus] = useState<string>('all');
  const [q, setQ] = useState(focusQuery ?? '');
  useEffect(() => {
    if (focusQuery) {
      setQ(focusQuery);
      setScope('all');
    }
  }, [focusQuery]);
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [scope, status, debounced]);

  const events = useEvents({ scope, status: status === 'all' ? undefined : status, q: debounced || undefined, page });
  const items = events.data?.items ?? [];

  const byYear = useMemo(() => {
    const groups = new Map<string, CorporateEvent[]>();
    for (const e of items) {
      const y = e.announcedAt.slice(0, 4);
      groups.set(y, [...(groups.get(y) ?? []), e]);
    }
    return [...groups.entries()];
  }, [items]);

  // Summary is exact only when every matching event is on this page.
  const complete = events.data && events.data.pagination.total === items.length;
  const summary = useMemo(() => {
    const inFlight = items.filter((e) => ['announced', 'initiated', 'in_progress', 'on_track'].includes(e.status)).length;
    const delayed = items.filter((e) => e.status === 'delayed' || (e.delayDays ?? 0) > 30).length;
    const completed = items.filter((e) => e.status === 'completed').length;
    const withPrecedent = items.filter((e) => (e.precedentCount ?? 0) > 0).length;
    return { inFlight, delayed, completed, withPrecedent };
  }, [items]);

  return (
    <div className="space-y-5 pt-5">
      <ScreenTitle
        title="Event Memory"
        lede="Commitments tracked to evidenced outcomes, and compared with precedents."
        action={
          <PrimaryButton onClick={onCreateEvent} aria-label="Record a new event" className="min-h-[38px] shrink-0 px-3 text-[12.5px]">
            <Plus size={15} strokeWidth={2} /> Record
          </PrimaryButton>
        }
      />

      {complete && items.length > 0 && (
        <div className="grid grid-cols-4 divide-x divide-divider rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
          {[
            { label: 'In flight', value: summary.inFlight },
            { label: 'Delayed', value: summary.delayed, tone: summary.delayed ? 'text-fin-amber' : '' },
            { label: 'Completed', value: summary.completed },
            { label: 'Precedents', value: summary.withPrecedent },
          ].map((m) => (
            <div key={m.label} className="min-w-0 px-1 py-3 text-center">
              <div className={cx('font-mono text-[19px] font-medium leading-none text-ink dark:text-white', m.tone)}>{m.value}</div>
              <div className="mt-1.5 truncate text-[10.5px] text-ink-muted">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input className={cx(inputCls, 'pl-10')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commitments or companies" aria-label="Search events" />
        </div>
        <Segmented<'portfolio' | 'all'>
          ariaLabel="Scope"
          value={scope}
          onChange={setScope}
          options={[
            { id: 'portfolio', label: 'My portfolio' },
            { id: 'all', label: 'All companies' },
          ]}
        />
        <Chips
          ariaLabel="Status"
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: 'Any status' },
            { id: 'announced', label: 'Announced' },
            { id: 'in_progress', label: 'In progress' },
            { id: 'on_track', label: 'On track' },
            { id: 'delayed', label: 'Delayed' },
            { id: 'completed', label: 'Completed' },
            { id: 'abandoned', label: 'Abandoned' },
            { id: 'outcome_unverified', label: 'Unverified' },
          ]}
        />
      </div>

      {events.isLoading ? (
        <LoadingBlock rows={4} />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No commitments found"
          body={scope === 'portfolio' ? 'No recorded events for your tracked companies match. Try “All companies”.' : 'Nothing matches these filters.'}
        />
      ) : (
        <>
          <div className="space-y-8">
            {byYear.map(([year, group]) => (
              <section key={year} className="relative">
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-[22px] leading-none text-forest-dark dark:text-white">{year}</span>
                  <span className="h-px flex-1 bg-divider dark:bg-ink-border" />
                  <span className="font-mono text-[11px] text-ink-subtle">{group.length}</span>
                </div>
                <Stagger as="ul" className="relative ml-[5px] space-y-0 border-l border-divider pl-5 dark:border-ink-border">
                  {group.map((e) => (
                    <Rise as="li" key={e.id} className="relative pb-5 last:pb-0">
                      <span className={cx('absolute -left-[26px] top-[18px] h-2.5 w-2.5 rounded-full ring-4 ring-cream dark:ring-ink-bg', STATUS_STYLE[e.status].dot)} aria-hidden />
                      <EventRow event={e} onOpen={() => onOpenEvent(e.id)} />
                    </Rise>
                  ))}
                </Stagger>
              </section>
            ))}
          </div>
          <Pager page={page} totalPages={events.data!.pagination.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
};

const EventRow: React.FC<{ event: CorporateEvent; onOpen: () => void }> = ({ event: e, onOpen }) => (
  <button onClick={onOpen} className="lift group block w-full rounded-card border border-divider bg-paper p-4 text-left dark:border-ink-border dark:bg-ink-surface">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyLogo {...e.company} size="sm" />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <Ticker symbol={e.company.nseSymbol} />
            <span className="truncate text-[11.5px] text-ink-muted">{humanize(e.category)}</span>
          </span>
          <span className="block truncate text-[11.5px] text-ink-muted">{e.company.name}</span>
        </span>
      </div>
      <StatusBadge status={e.status} />
    </div>
    <h3 className="mt-1.5 text-[14.5px] font-medium leading-snug tracking-[-0.01em] text-ink dark:text-white">{e.title}</h3>

    <div className="mt-4">
      <ExecutionBar event={e} />
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-muted">
        <span>{shortDate(e.announcedAt)}</span>
        <span>{e.expectedCompletionDate ? `Target ${shortDate(e.expectedCompletionDate)}` : 'No target disclosed'}</span>
      </div>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-divider pt-3 text-[11.5px] dark:border-ink-border">
      <span className="text-ink-muted">
        Outlay <span className="font-mono text-ink dark:text-ink-light">{crore(e.expectedCapexCr)}</span>
      </span>
      {(e.precedentCount ?? 0) > 0 && (
        <span className="inline-flex items-center gap-1 font-medium text-forest dark:text-emerald">
          <GitCompareArrows size={13} strokeWidth={1.75} /> {e.precedentCount} precedent{e.precedentCount === 1 ? '' : 's'}
        </span>
      )}
      {e.delayDays !== null && e.delayDays !== undefined && e.delayDays > 30 && <span className="font-mono font-medium text-fin-amber">+{Math.round(e.delayDays / 30.44)} mo late</span>}
      {e.isDemo && <DemoPill />}
      <ChevronRight size={16} strokeWidth={1.75} className="ml-auto text-ink-subtle transition-transform group-hover:translate-x-0.5" />
    </div>
  </button>
);
