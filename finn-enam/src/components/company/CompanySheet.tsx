import React, { useMemo, useState } from 'react';
import { BookOpen, Minus, Plus } from 'lucide-react';
import { FullScreenSheet } from '../common/FullScreenSheet';
import { PriceChart } from '../charts/PriceChart';
import {
  useAddToPortfolio,
  useAlertSettings,
  useCompanyOverview,
  useCompanySignals,
  useHistory,
  useRemoveFromPortfolio,
} from '../../lib/queries';
import { compact, inr, relativeTime, shortDate, signedPct } from '../../lib/format';
import type { Range } from '../../lib/types';
import { Change, Chips, DemoPill, EmptyState, ErrorState, Eyebrow, LoadingBlock, Panel, PriorityBadge, SecondaryButton, SectionTitle, Skeleton, Spinner, cx } from '../ui';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  companyId: string | null;
  theme: 'light' | 'dark';
  onClose: () => void;
  onInspectSignal: (id: string) => void;
  onOpenResearch: (companyId: string) => void;
}

const RANGES: Range[] = ['1W', '1M', '3M', '6M', '1Y', 'MAX'];

export const CompanySheet: React.FC<Props> = ({ companyId, theme, onClose, onInspectSignal, onOpenResearch }) => {
  const [range, setRange] = useState<Range>('3M');
  const overview = useCompanyOverview(companyId);
  const history = useHistory(companyId, range);
  const signals = useCompanySignals(companyId);
  const alerts = useAlertSettings();
  const add = useAddToPortfolio();
  const remove = useRemoveFromPortfolio();
  const volumeThreshold = alerts.data?.volumeSurgeMultiple ?? 2;

  const company = overview.data?.company;
  const quote = overview.data?.quote;

  const stats = useMemo(() => {
    const c = history.data?.candles ?? [];
    if (c.length < 2) return null;
    const first = c[0];
    const last = c[c.length - 1];
    const highs = Math.max(...c.map((k) => k.high));
    const lows = Math.min(...c.map((k) => k.low));
    const bigMoves = c.filter((k) => Math.abs(k.changePercent ?? 0) >= (alerts.data?.priceMoveThresholdPct ?? 2.5));
    return {
      periodChange: ((last.close - first.close) / first.close) * 100,
      high: highs,
      low: lows,
      anomalies: c.filter((k) => (k.volumeRatio ?? 0) >= volumeThreshold),
      bigMoves,
      aboveSma50: last.sma50 !== null ? last.close > last.sma50 : null,
    };
  }, [history.data, volumeThreshold, alerts.data?.priceMoveThresholdPct]);

  if (!companyId) return null;

  return (
    <FullScreenSheet
      open={Boolean(companyId)}
      onClose={onClose}
      title={company?.name ?? 'Company'}
      leading={company && <CompanyLogo {...company} size="md" />}
      subtitle={company ? `${company.nseSymbol ?? ''}${company.bseCode ? ` · BSE ${company.bseCode}` : ''}${company.sector ? ` · ${company.sector}` : ''}` : undefined}
      actions={
        company && (
          <button
            onClick={() => (company.inPortfolio ? remove.mutate(company.id) : add.mutate({ companyId: company.id }))}
            disabled={add.isPending || remove.isPending}
            className={cx(
              'inline-flex min-h-[40px] items-center gap-1 rounded-xl border px-3 text-xs font-semibold',
              company.inPortfolio ? 'border-divider dark:border-ink-border text-ink-muted' : 'border-forest bg-forest text-white',
            )}
          >
            {add.isPending || remove.isPending ? <Spinner size={13} /> : company.inPortfolio ? <Minus size={13} /> : <Plus size={13} />}
            {company.inPortfolio ? 'Untrack' : 'Track'}
          </button>
        )
      }
    >
      {overview.isLoading ? (
        <LoadingBlock rows={4} />
      ) : overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="space-y-5">
          {/* Quote header */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-3xl font-semibold tabular-nums text-ink dark:text-white">{quote ? inr(quote.lastPrice) : '—'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <Change value={quote?.changePercent} />
                <span className="text-ink-muted">{quote ? `on ${shortDate(quote.tradeDate)}` : 'No market data'}</span>
                {quote?.isDemo && <DemoPill />}
              </div>
            </div>
            <button onClick={() => company && onOpenResearch(company.id)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface px-3 text-xs font-semibold text-forest dark:text-emerald">
              <BookOpen size={14} /> Research
            </button>
          </div>

          {/* Chart */}
          <Panel className="space-y-3">
            <Chips<Range> ariaLabel="Chart range" value={range} onChange={setRange} options={RANGES.map((r) => ({ id: r, label: r }))} />
            {history.isLoading ? (
              <Skeleton className="h-[290px] w-full" />
            ) : history.isError ? (
              <ErrorState error={history.error} onRetry={() => history.refetch()} />
            ) : (history.data?.candles.length ?? 0) < 2 ? (
              <EmptyState title="No price history" body="No market-data provider has supplied history for this company yet." />
            ) : (
              <>
                <PriceChart candles={history.data!.candles} theme={theme} volumeThreshold={volumeThreshold} />
                <p className="text-[10.5px] text-ink-muted">
                  Source: {history.data!.provider}
                  {history.data!.isDemo ? ' — synthetic demonstration series shaped to fixture prices; not live NSE data.' : ''}
                </p>
              </>
            )}
          </Panel>

          {/* Period statistics */}
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label={`${range} change`} value={signedPct(stats.periodChange)} tone={stats.periodChange >= 0 ? 'up' : 'down'} />
              <MiniStat label={`${range} high / low`} value={`${stats.high.toFixed(0)} / ${stats.low.toFixed(0)}`} />
              <MiniStat label="Volume anomalies" value={`${stats.anomalies.length}`} hint={`≥ ${volumeThreshold}× 20-day avg`} />
              <MiniStat label="Vs 50-day MA" value={stats.aboveSma50 === null ? '—' : stats.aboveSma50 ? 'Above' : 'Below'} tone={stats.aboveSma50 ? 'up' : stats.aboveSma50 === false ? 'down' : undefined} />
            </div>
          )}
          {quote && (
            <p className="text-[11px] text-ink-muted">
              Latest volume {compact(quote.volume)} vs 20-day average {compact(quote.avgVolume20d)} ({quote.volumeRatio?.toFixed(2) ?? '—'}×).
            </p>
          )}

          {/* Historical moves */}
          {stats && stats.bigMoves.length > 0 && (
            <section className="space-y-2">
              <SectionTitle title="Significant sessions" meta={`Moves ≥ ±${alerts.data?.priceMoveThresholdPct ?? 2.5}% in this range`} />
              <Panel padded={false} className="divide-y divide-divider/70 dark:divide-ink-border">
                {stats.bigMoves
                  .slice(-6)
                  .reverse()
                  .map((k) => (
                    <div key={k.tradeDate} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="font-mono text-ink-muted">{shortDate(k.tradeDate)}</span>
                      <span className="font-mono text-ink-muted">{k.volumeRatio?.toFixed(2) ?? '—'}× vol</span>
                      <Change value={k.changePercent} />
                    </div>
                  ))}
              </Panel>
            </section>
          )}

          {/* Signals */}
          <section className="space-y-2">
            <SectionTitle title="Signal history" />
            {signals.isLoading ? (
              <LoadingBlock rows={2} />
            ) : (signals.data?.items.length ?? 0) === 0 ? (
              <EmptyState title="No signals detected yet" />
            ) : (
              <ol className="relative space-y-0 border-l-2 border-divider dark:border-ink-border ml-2">
                {signals.data!.items.map((s) => (
                  <li key={s.id} className="relative pl-4 pb-3">
                    <span className="absolute -left-[7px] top-2 h-3 w-3 rounded-full border-2 border-cream dark:border-ink-bg bg-forest dark:bg-emerald" />
                    <button onClick={() => onInspectSignal(s.id)} className="w-full rounded-xl px-2 py-1.5 text-left hover:bg-paper dark:hover:bg-ink-surface">
                      <div className="flex items-center justify-between gap-2">
                        <Eyebrow>{s.categoryLabel}</Eyebrow>
                        <PriorityBadge priority={s.priority} />
                      </div>
                      <div className="text-sm font-medium leading-snug text-ink dark:text-white">{s.title}</div>
                      <div className="font-mono text-[10px] text-ink-muted">{shortDate(s.occurredAt)} · {relativeTime(s.occurredAt)}</div>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Announcements */}
          <section className="space-y-2">
            <SectionTitle title="Corporate announcements" />
            {(overview.data?.announcements.length ?? 0) === 0 ? (
              <EmptyState title="No announcements stored" body="No announcements provider has returned filings for this company." />
            ) : (
              <Panel padded={false} className="divide-y divide-divider/70 dark:divide-ink-border">
                {overview.data!.announcements.slice(0, 8).map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Eyebrow>{a.categoryLabel}</Eyebrow>
                      <span className="font-mono text-[10px] text-ink-muted">{shortDate(a.announcedAt)} · score {a.materialityScore}</span>
                    </div>
                    <div className="mt-0.5 text-sm text-ink dark:text-white leading-snug">{a.title}</div>
                    {a.summary && <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{a.summary}</p>}
                  </div>
                ))}
              </Panel>
            )}
          </section>

          {/* Management + reliability */}
          {(overview.data?.managementChanges.length ?? 0) > 0 && (
            <section className="space-y-2">
              <SectionTitle title="Management changes" />
              <Panel padded={false} className="divide-y divide-divider/70 dark:divide-ink-border">
                {overview.data!.managementChanges.map((m) => (
                  <div key={m.id} className="px-4 py-3 text-xs">
                    <div className="font-semibold text-ink dark:text-white">
                      {m.personName} — {m.role}
                    </div>
                    <div className="text-ink-muted capitalize">
                      {m.changeType} {m.effectiveDate ? `· effective ${shortDate(m.effectiveDate)}` : ''}
                    </div>
                    {m.background && <p className="mt-1 text-ink-muted">{m.background}</p>}
                  </div>
                ))}
              </Panel>
            </section>
          )}

          {overview.data && overview.data.executionReliability.eventsWithOutcome > 0 && (
            <Panel className="space-y-1">
              <SectionTitle title="Execution track record" />
              <p className="text-sm text-ink dark:text-white">
                {overview.data.executionReliability.completed} completed · {overview.data.executionReliability.delayed} delayed · {overview.data.executionReliability.abandoned} abandoned
                {overview.data.executionReliability.onTimeRate !== null && ` · ${overview.data.executionReliability.onTimeRate}% on time`}
              </p>
            </Panel>
          )}
          <SecondaryButton className="w-full" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
      )}
    </FullScreenSheet>
  );
};

const MiniStat: React.FC<{ label: string; value: string; tone?: 'up' | 'down'; hint?: string }> = ({ label, value, tone, hint }) => (
  <div className="rounded-xl border border-divider dark:border-ink-border bg-paper dark:bg-ink-surface p-3">
    <Eyebrow>{label}</Eyebrow>
    <div className={cx('mt-1 font-mono text-sm font-semibold tabular-nums', tone === 'up' ? 'text-forest dark:text-emerald' : tone === 'down' ? 'text-fin-red' : 'text-ink dark:text-white')}>{value}</div>
    {hint && <div className="text-[10px] text-ink-subtle">{hint}</div>}
  </div>
);
