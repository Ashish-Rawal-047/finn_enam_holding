import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useAlertSettings, usePortfolio, useSignals } from '../lib/queries';
import { inr, relativeTime } from '../lib/format';
import type { Holding } from '../lib/types';
import { Sparkline } from '../components/common/Sparkline';
import { Rise, Stagger } from '../components/motion';
import { Change, Chips, DemoPill, EmptyState, ErrorState, LoadingBlock, PriorityBadge, ScreenTitle, SecondaryButton, Segmented, Ticker, cx, inputCls } from '../components/ui';
import { CompanyLogo } from '../components/company/CompanyLogo';

type Filter = 'all' | 'gainers' | 'losers' | 'volume' | 'alerts';
type View = 'companies' | 'feed';

interface Props {
  onOpenCompany: (companyId: string) => void;
  onInspectSignal: (signalId: string) => void;
  onGoToSettings: () => void;
}


export const SignalsScreen: React.FC<Props> = ({ onOpenCompany, onInspectSignal, onGoToSettings }) => {
  const [view, setView] = useState<View>('companies');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const portfolio = usePortfolio();
  const alerts = useAlertSettings();
  const volumeThreshold = alerts.data?.volumeSurgeMultiple ?? 2;

  const counts = useMemo(() => {
    const items = portfolio.data ?? [];
    return {
      all: items.length,
      gainers: items.filter((h) => (h.quote?.changePercent ?? 0) > 0).length,
      losers: items.filter((h) => (h.quote?.changePercent ?? 0) < 0).length,
      volume: items.filter((h) => (h.quote?.volumeRatio ?? 0) >= volumeThreshold).length,
      alerts: items.filter((h) => h.activeSignalCount > 0).length,
    };
  }, [portfolio.data, volumeThreshold]);

  const rows = useMemo(() => {
    let items = [...(portfolio.data ?? [])];
    if (filter === 'gainers') items = items.filter((h) => (h.quote?.changePercent ?? 0) > 0).sort((a, b) => b.quote!.changePercent - a.quote!.changePercent);
    if (filter === 'losers') items = items.filter((h) => (h.quote?.changePercent ?? 0) < 0).sort((a, b) => a.quote!.changePercent - b.quote!.changePercent);
    if (filter === 'volume') items = items.filter((h) => (h.quote?.volumeRatio ?? 0) >= volumeThreshold).sort((a, b) => (b.quote!.volumeRatio ?? 0) - (a.quote!.volumeRatio ?? 0));
    if (filter === 'alerts') items = items.filter((h) => h.activeSignalCount > 0).sort((a, b) => b.activeSignalCount - a.activeSignalCount);
    const term = q.trim().toLowerCase();
    if (term) items = items.filter((h) => h.name.toLowerCase().includes(term) || (h.nseSymbol ?? '').toLowerCase().includes(term));
    return items;
  }, [portfolio.data, filter, q, volumeThreshold]);

  return (
    <div className="space-y-5 pt-5">
      <ScreenTitle title="Signals" lede="Price, volume against the 20-session norm, and raised signals." />
      <Segmented<View>
        ariaLabel="Signals view"
        value={view}
        onChange={setView}
        options={[
          { id: 'companies', label: 'Companies' },
          { id: 'feed', label: 'Signal feed' },
        ]}
      />

      {view === 'companies' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input className={cx(inputCls, 'pl-10')} placeholder="Filter by name or symbol" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter tracked companies" />
          </div>
          <Chips<Filter>
            ariaLabel="Company filter"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'gainers', label: 'Gainers', count: counts.gainers },
              { id: 'losers', label: 'Losers', count: counts.losers },
              { id: 'volume', label: `Volume ≥ ${volumeThreshold}×`, count: counts.volume },
              { id: 'alerts', label: 'With alerts', count: counts.alerts },
            ]}
          />
          {portfolio.isLoading ? (
            <LoadingBlock rows={6} />
          ) : portfolio.isError ? (
            <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} />
          ) : (portfolio.data ?? []).length === 0 ? (
            <EmptyState title="No tracked companies" body="Add companies to your portfolio to monitor them here." action={<SecondaryButton onClick={onGoToSettings}>Manage portfolio</SecondaryButton>} />
          ) : rows.length === 0 ? (
            <EmptyState title="No companies match this filter" />
          ) : (
            <div className="overflow-hidden rounded-card border border-divider bg-paper dark:border-ink-border dark:bg-ink-surface">
              <Stagger as="ul" className="divide-y divide-divider dark:divide-ink-border">
                {rows.map((h) => (
                  <Rise as="li" key={h.id}>
                    <CompanyRow h={h} volumeThreshold={volumeThreshold} onClick={() => onOpenCompany(h.id)} />
                  </Rise>
                ))}
              </Stagger>
            </div>
          )}
          {portfolio.data?.some((h) => h.quote?.isDemo) && (
            <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-muted">
              <DemoPill /> Prices are a synthetic demonstration series, not live NSE quotes.
            </p>
          )}
        </div>
      ) : (
        <SignalFeed onInspectSignal={onInspectSignal} />
      )}
    </div>
  );
};

/**
 * One tracked company as a phone list row: logo, ticker and name, volume against its 20-session
 * norm (amber at or above the user's surge threshold), a 30-session sparkline, then price and move.
 */
const CompanyRow: React.FC<{ h: Holding; volumeThreshold: number; onClick: () => void }> = ({ h, volumeThreshold, onClick }) => {
  const q = h.quote;
  const ratio = q?.volumeRatio ?? null;
  const hot = ratio !== null && ratio >= volumeThreshold;
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
      <CompanyLogo {...h} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Ticker symbol={h.nseSymbol} />
          {h.activeSignalCount > 0 && (
            <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-forest px-1 font-mono text-[9px] font-semibold text-white dark:bg-emerald dark:text-ink-bg" title={`${h.activeSignalCount} unread signal(s)`}>
              {h.activeSignalCount}
            </span>
          )}
        </div>
        <div className="truncate text-[11.5px] text-ink-muted">{h.name}</div>
        <div className={cx('mt-0.5 font-mono text-[10.5px]', hot ? 'font-medium text-fin-amber' : 'text-ink-subtle')} title={`Your surge threshold: ${volumeThreshold}×`}>
          Vol {ratio !== null ? `${ratio.toFixed(2)}×` : '—'} 20D avg{hot && <span className="sr-only"> (above your threshold)</span>}
        </div>
      </div>
      <div className="shrink-0 text-ink-muted">{q && q.sparkline.length > 1 ? <Sparkline data={q.sparkline} width={56} height={24} positive={q.sparkline[q.sparkline.length - 1] >= q.sparkline[0]} /> : null}</div>
      <div className="w-[78px] shrink-0 text-right">
        <div className="font-mono text-[13px] font-medium text-ink dark:text-white">{q ? inr(q.lastPrice) : '—'}</div>
        <Change value={q?.changePercent} className="text-[11px]" />
      </div>
    </button>
  );
};

const SignalFeed: React.FC<{ onInspectSignal: (id: string) => void }> = ({ onInspectSignal }) => {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('all');
  const signals = useSignals(page, type === 'all' ? undefined : type);
  return (
    <div className="space-y-4">
      <Chips
        ariaLabel="Signal type"
        value={type}
        onChange={(t) => {
          setType(t);
          setPage(1);
        }}
        options={[
          { id: 'all', label: 'All' },
          { id: 'price_move', label: 'Price' },
          { id: 'volume_spike', label: 'Volume' },
          { id: 'management_change', label: 'Management' },
          { id: 'financial_result', label: 'Results' },
          { id: 'corporate_announcement', label: 'Announcements' },
          { id: 'historical_precedent', label: 'Precedents' },
        ]}
      />
      <p className="text-[11.5px] text-ink-muted">Only signals that pass your alert thresholds are shown. Select one to inspect its evidence.</p>
      {signals.isLoading ? (
        <LoadingBlock rows={5} />
      ) : signals.isError ? (
        <ErrorState error={signals.error} onRetry={() => signals.refetch()} />
      ) : !signals.data || signals.data.items.length === 0 ? (
        <EmptyState title="No signals" body="Nothing in your portfolio crosses your thresholds for this filter." />
      ) : (
        <>
          <Stagger as="ul" className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
            {signals.data.items.map((s) => (
              <Rise as="li" key={s.id}>
                <button onClick={() => onInspectSignal(s.id)} className="group grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.company && <CompanyLogo {...s.company} size="xs" />}
                    <Ticker symbol={s.company?.nseSymbol} />
                    <span className="truncate text-[11.5px] text-ink-muted">{s.categoryLabel}</span>
                  </div>
                  <PriorityBadge priority={s.priority} />
                  <div className="text-[13.5px] font-medium leading-snug text-ink dark:text-white">{s.title}</div>
                  <ArrowUpRight size={15} strokeWidth={1.75} className="self-center justify-self-end text-ink-subtle transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                  <div className="flex items-center gap-2 font-mono text-[10.5px] text-ink-subtle">
                    {relativeTime(s.occurredAt)}
                    {s.isDemo && <DemoPill />}
                  </div>
                </button>
              </Rise>
            ))}
          </Stagger>
          <Pager page={page} totalPages={signals.data.pagination.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export const Pager: React.FC<{ page: number; totalPages: number; onPage: (p: number) => void }> = ({ page, totalPages, onPage }) =>
  totalPages <= 1 ? null : (
    <div className="flex items-center justify-between">
      <SecondaryButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </SecondaryButton>
      <span className="font-mono text-xs text-ink-muted">
        {page} / {totalPages}
      </span>
      <SecondaryButton disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </SecondaryButton>
    </div>
  );
