import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Building2, CalendarClock } from 'lucide-react';
import type { Holding, HomeResponse } from '../../lib/types';
import { dateTime } from '../../lib/format';
import { CountUp, EASE_OUT, Rise, Stagger } from '../motion';
import { Change, DemoPill, Eyebrow, Metric, Panel, Ticker, cx } from '../ui';
import { CompanyLogo } from '../company/CompanyLogo';

/** Equal-weighted index (base 100) across holdings' trailing closes. */
export function equalWeightedIndex(holdings: Holding[]): number[] {
  const series = holdings.map((h) => h.quote?.sparkline ?? []).filter((s) => s.length >= 2);
  if (series.length === 0) return [];
  const len = Math.min(...series.map((s) => s.length));
  const trimmed = series.map((s) => s.slice(s.length - len));
  return Array.from({ length: len }, (_, i) => trimmed.reduce((sum, s) => sum + (s[i] / s[0]) * 100, 0) / trimmed.length);
}

const IndexLine: React.FC<{ values: number[] }> = ({ values }) => {
  const w = 220;
  const h = 56;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, h - 4 - ((v - min) / range) * (h - 10)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const up = values[values.length - 1] >= values[0];
  const [lx, ly] = pts[pts.length - 1];
  const color = up ? '#25835D' : '#C85B57';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full max-w-[240px]" role="img" aria-label={`Equal-weighted portfolio index, ${up ? 'up' : 'down'} ${Math.abs(values[values.length - 1] - 100).toFixed(1)}% over ${values.length} sessions`}>
      <line x1="3" x2={w - 3} y1={h - 4 - ((100 - min) / range) * (h - 10)} y2={h - 4 - ((100 - min) / range) * (h - 10)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="draw-in" style={{ ['--len' as string]: 1 }} />
      <circle cx={lx} cy={ly} r="3" fill={color} />
      <circle cx={lx} cy={ly} r="6" fill={color} opacity="0.15" />
    </svg>
  );
};

const Breadth: React.FC<{ up: number; down: number; flat: number }> = ({ up, down, flat }) => {
  const total = up + down + flat || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex h-1.5 w-full gap-[3px] overflow-hidden rounded-full" role="img" aria-label={`${up} advancing, ${flat} unchanged, ${down} declining`}>
        <motion.div initial={{ width: 0 }} animate={{ width: seg(up) }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }} className="h-full rounded-full bg-fin-up" />
        {flat > 0 && <div className="h-full rounded-full bg-ink-subtle/50" style={{ width: seg(flat) }} />}
        <motion.div initial={{ width: 0 }} animate={{ width: seg(down) }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }} className="h-full rounded-full bg-fin-red" />
      </div>
      <div className="flex justify-between font-mono text-[11px]">
        <span className="text-fin-up dark:text-emerald">
          {up} advancing
        </span>
        {flat > 0 && <span className="text-ink-muted">{flat} unchanged</span>}
        <span className="text-fin-red">{down} declining</span>
      </div>
    </div>
  );
};

const Leader: React.FC<{ label: string; h: Holding | undefined; onOpen: (id: string) => void }> = ({ label, h, onOpen }) =>
  !h || !h.quote ? null : (
    <button onClick={() => onOpen(h.id)} className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:text-forest dark:hover:text-emerald">
      <span className="flex min-w-0 items-center gap-2.5">
        <CompanyLogo {...h} size="sm" />
        <span className="min-w-0">
          <span className="block text-2xs font-medium uppercase tracking-eyebrow text-ink-subtle">{label}</span>
          <span className="mt-0.5 flex items-baseline gap-2">
            <Ticker symbol={h.nseSymbol} />
            <span className="truncate text-[11.5px] text-ink-muted">{h.name}</span>
          </span>
        </span>
      </span>
      <Change value={h.quote.changePercent} className="text-[13px]" />
    </button>
  );

export const PortfolioPanel: React.FC<{ overview: HomeResponse['overview']; holdings: Holding[]; onOpenCompany: (id: string) => void }> = ({ overview, holdings, onOpenCompany }) => {
  const index = useMemo(() => equalWeightedIndex(holdings), [holdings]);
  const ranked = useMemo(() => holdings.filter((h) => h.quote).sort((a, b) => b.quote!.changePercent - a.quote!.changePercent), [holdings]);
  const avg = overview.averageChangePercent;
  const tone = avg === null ? 'neutral' : avg >= 0 ? 'up' : 'down';
  return (
    <Panel padded={false} as="section" className="overflow-hidden">
      {/* Market overview: today's equal-weighted move, its 30-session line, breadth and leaders. */}
      <div className="space-y-3.5 p-4">
        <div className="flex items-center gap-2">
          <Eyebrow>Market overview · today</Eyebrow>
          {overview.isDemo && <DemoPill label={overview.demoCompanies && overview.demoCompanies < overview.withMarketData ? `${overview.demoCompanies} demo` : 'Demo data'} />}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className={cx('font-mono text-[32px] font-medium leading-none tracking-[-0.03em]', tone === 'up' ? 'text-fin-up dark:text-emerald' : tone === 'down' ? 'text-fin-red' : 'text-ink dark:text-white')}>
              <CountUp value={avg} format={(n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`} />
            </div>
            <div className="mt-1.5 text-[11px] text-ink-muted">Average daily move, equal-weighted</div>
          </div>
          {index.length > 1 && (
            <div className="w-[128px] shrink-0 text-forest-dark dark:text-ink-light">
              <IndexLine values={index} />
              <div className="text-right text-[10px] text-ink-muted">Index · {index.length} sessions</div>
            </div>
          )}
        </div>
        <Breadth up={overview.advancing} down={overview.declining} flat={overview.unchanged} />
        {ranked.length > 1 && (
          <div className="divide-y divide-divider border-t border-divider dark:divide-ink-border dark:border-ink-border">
            <Leader label="Top gainer" h={ranked[0]} onOpen={onOpenCompany} />
            <Leader label="Top decliner" h={ranked[ranked.length - 1]} onOpen={onOpenCompany} />
          </div>
        )}
      </div>
      {/* Portfolio summary. */}
      <Stagger className="grid grid-cols-3 divide-x divide-divider border-t border-divider bg-cream-light/60 dark:divide-ink-border dark:border-ink-border dark:bg-ink-surfaceSubtle/40">
        <Rise className="px-3.5 py-3">
          <Metric label="Companies" icon={<Building2 size={13} strokeWidth={1.75} />} value={<CountUp value={overview.trackedCompanies} format={(n) => Math.round(n).toString()} />} />
        </Rise>
        <Rise className="px-3.5 py-3">
          <Metric label="Alerts" icon={<BellRing size={13} strokeWidth={1.75} />} value={<CountUp value={overview.activeAlerts} format={(n) => Math.round(n).toString()} />} />
        </Rise>
        <Rise className="px-3.5 py-3">
          <Metric label="Open events" icon={<CalendarClock size={13} strokeWidth={1.75} />} value={<CountUp value={overview.openEvents} format={(n) => Math.round(n).toString()} />} />
        </Rise>
      </Stagger>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider px-4 py-2.5 text-[11px] text-ink-muted dark:border-ink-border">
        <span>Close of {overview.lastUpdated ? dateTime(overview.lastUpdated) : '—'}</span>
        <span className="font-mono">{overview.withMarketData}/{overview.trackedCompanies} priced · {overview.provider ?? 'no provider'}</span>
      </div>
    </Panel>
  );
};
