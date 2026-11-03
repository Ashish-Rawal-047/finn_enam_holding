/**
 * The five research charts, from the stored statements only. One annual/quarterly switch applies to
 * all charts so periods are never mixed. Each chart carries a title and an interpretation computed
 * from the same figures it plots.
 */
import React, { useState } from 'react';
import type { FinancialAnalysis, PeriodPoint } from '../../lib/types';
import { Segmented } from '../ui';
import { TrendChart, type PanelSpec } from './TrendChart';
import { axisPct, axisTimes, compact, money, pct, pp, times } from './format';

type Period = 'annual' | 'quarterly';

const reported = (data: PeriodPoint[], key: keyof PeriodPoint) => data.filter((d) => !d.missing && d[key] !== null && d[key] !== undefined);
const last2 = (data: PeriodPoint[], key: keyof PeriodPoint) => {
  const r = reported(data, key);
  return [r[r.length - 2], r[r.length - 1]] as const;
};

export const ResearchCharts: React.FC<{ analysis: FinancialAnalysis }> = ({ analysis: a }) => {
  const [period, setPeriod] = useState<Period>(a.annual.length >= 2 ? 'annual' : 'quarterly');
  const data = period === 'annual' ? a.annual : a.quarterly;
  const m = (v: number) => money(v, a.currency, a.unit);
  const unitName = `${a.currency === 'INR' ? '₹' : a.currency} ${a.unit === 'crore' ? 'crore' : 'million'}`;
  const growthNote = (p: PeriodPoint) =>
    p.comparedWith ? `Growth vs ${p.comparedWith}` : period === 'quarterly' ? 'No year-on-year growth: the same quarter last year is not available.' : 'No growth: the previous year is not available.';

  if (a.annual.length === 0 && a.quarterly.length === 0) {
    return <p className="text-[12.5px] text-ink-muted">No financial statements are stored for this company, so there is nothing to chart.</p>;
  }

  const charts: Array<{ id: string; title: string; text: string | null; panels: PanelSpec[]; note?: (p: PeriodPoint) => string | null; caveat?: string }> = [
    {
      id: 'income',
      title: 'Revenue and net profit',
      text: incomeText(data, m, period),
      panels: [
        { id: 'abs', caption: unitName, series: [{ key: 'revenue', label: 'Revenue', slot: 0, kind: 'bar' }, { key: 'pat', label: 'Net profit', slot: 1, kind: 'bar' }], format: m, axis: compact, height: 150 },
        { id: 'g', caption: period === 'annual' ? 'Revenue growth, year on year' : 'Revenue growth vs same quarter last year', series: [{ key: 'revenueGrowth', label: 'Revenue growth', slot: 'ink', kind: 'line' }], format: (v) => pct(v), axis: axisPct, height: 90, zero: true },
      ],
      note: growthNote,
    },
    {
      id: 'margins',
      title: 'Profitability',
      text: marginText(data),
      panels: [
        {
          id: 'm',
          series: [
            ...(data.some((d) => d.ebitdaMargin !== null) ? [{ key: 'ebitdaMargin' as const, label: 'EBITDA margin', slot: 0 as const, kind: 'line' as const }] : []),
            ...(data.some((d) => d.operatingMargin !== null) ? [{ key: 'operatingMargin' as const, label: 'Operating margin', slot: 1 as const, kind: 'line' as const }] : []),
            { key: 'netMargin', label: 'Net margin', slot: 2, kind: 'line' },
          ],
          format: (v) => pct(v),
          axis: axisPct,
          height: 170,
          zero: true,
        },
      ],
      caveat: a.isFinancialSector ? 'Lenders do not report EBITDA or operating margin in this data; net margin is shown.' : undefined,
    },
    {
      id: 'cash',
      title: 'Cash flow quality',
      text: a.isFinancialSector ? 'For a lender, new loans are paid out of operating cash flow, so it turns negative as the loan book grows; profit-to-cash conversion does not apply.' : cashText(data, m),
      panels: [
        {
          id: 'cf',
          caption: unitName,
          series: [
            { key: 'operatingCashFlow', label: 'Operating cash flow', slot: 0, kind: 'bar' },
            { key: 'capex', label: 'Capex', slot: 2, kind: 'bar' },
            { key: 'freeCashFlow', label: 'Free cash flow', slot: 1, kind: 'bar' },
          ],
          format: m,
          axis: compact,
          height: 150,
        },
        ...(a.isFinancialSector
          ? []
          : [
              {
                id: 'conv',
                caption: 'Operating cash flow ÷ net profit',
                series: [{ key: 'cfoToPat' as const, label: 'Cash conversion', slot: 'ink' as const, kind: 'line' as const }],
                format: (v: number) => times(v),
                axis: axisTimes,
                height: 100,
                zero: true,
                reference: { value: 1, label: 'cash = profit' },
                flag: divergence,
              },
            ]),
      ],
      caveat: period === 'quarterly' && data.every((d) => d.operatingCashFlow === null) ? 'The source does not report quarterly cash-flow statements; switch to annual.' : undefined,
    },
    {
      id: 'balance',
      title: 'Balance sheet health',
      text: balanceText(data, m, a.isFinancialSector),
      panels: [
        {
          id: 'bs',
          caption: unitName,
          series: [
            { key: 'borrowings', label: 'Total debt', slot: 2, kind: 'bar' },
            { key: 'cash', label: 'Cash', slot: 0, kind: 'bar' },
            { key: 'netDebt', label: 'Net debt (below zero = net cash)', slot: 1, kind: 'bar' },
          ],
          format: m,
          axis: compact,
          height: 150,
        },
        { id: 'de', caption: 'Debt ÷ equity', series: [{ key: 'debtToEquity', label: 'Debt to equity', slot: 'ink', kind: 'line' }], format: (v) => times(v), axis: axisTimes, height: 90, zero: true },
        ...(a.isFinancialSector
          ? []
          : [{ id: 'ic', caption: 'Interest cover (EBIT ÷ interest)', series: [{ key: 'interestCoverage' as const, label: 'Interest cover', slot: 'ink' as const, kind: 'line' as const }], format: (v: number) => times(v, 1), axis: axisTimes, height: 90, zero: true }]),
      ],
      caveat: a.isFinancialSector ? 'For a lender, borrowing funds the loan book; leverage is structural and not comparable with non-financial companies.' : undefined,
    },
    {
      id: 'growth',
      title: 'Growth and momentum',
      text: growthText(data, period),
      panels: [
        {
          id: 'g',
          series: [
            { key: 'revenueGrowth', label: 'Revenue', slot: 0, kind: 'line' },
            { key: 'profitGrowth', label: 'Net profit', slot: 1, kind: 'line' },
            { key: 'epsGrowth', label: 'EPS', slot: 2, kind: 'line' },
          ],
          format: (v) => pct(v),
          axis: axisPct,
          height: 170,
          zero: true,
        },
      ],
      note: growthNote,
      caveat: period === 'quarterly' ? 'Quarterly growth is year on year (same quarter last year), shown only where that quarter is available.' : 'Growth is not shown for a year whose previous year is missing, or where the earlier profit was a loss.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-ink-muted">{period === 'annual' ? 'Fiscal years' : 'Quarters'} as labelled by the source</span>
        <div className="w-[190px] shrink-0">
          <Segmented<Period>
            ariaLabel="Chart period"
            value={period}
            onChange={setPeriod}
            options={[
              { id: 'annual', label: 'Annual' },
              { id: 'quarterly', label: 'Quarterly' },
            ]}
          />
        </div>
      </div>
      {charts.map((ch) => (
        <figure key={ch.id} className="space-y-2" aria-labelledby={`chart-${ch.id}`}>
          <figcaption className="space-y-1">
            <h4 id={`chart-${ch.id}`} className="font-serif text-[18px] leading-tight text-forest-dark dark:text-white">
              {ch.title}
            </h4>
            {ch.text && <p className="text-[12.5px] leading-relaxed text-ink-muted">{ch.text}</p>}
          </figcaption>
          <TrendChart data={data} panels={ch.panels} label={`${ch.title}, ${period}`} tooltipNote={ch.note} />
          {ch.caveat && <p className="text-[11px] leading-snug text-ink-subtle">{ch.caveat}</p>}
        </figure>
      ))}
    </div>
  );
};

/** Profit and operating cash diverging: cash well below or well above profit. */
function divergence(p: PeriodPoint): string | null {
  if (p.cfoToPat === null) return null;
  if (p.cfoToPat < 0.7) return `Operating cash flow was only ${times(p.cfoToPat)} net profit.`;
  if (p.cfoToPat > 1.5) return `Operating cash flow was ${times(p.cfoToPat)} net profit (working-capital release or non-cash charges).`;
  return null;
}

function incomeText(data: PeriodPoint[], m: (v: number) => string, period: Period): string | null {
  const r = reported(data, 'revenue');
  if (!r.length) return null;
  const first = r[0];
  const last = r[r.length - 1];
  const head = r.length > 1 ? `Revenue went from ${m(first.revenue!)} in ${first.period} to ${m(last.revenue!)} in ${last.period}` : `Revenue was ${m(last.revenue!)} in ${last.period}`;
  const profit = last.pat !== null ? `, with net profit of ${m(last.pat)}` : '';
  const [g0, g1] = last2(data, 'revenueGrowth');
  const growth =
    g1 && g0
      ? ` Growth ${g1.revenueGrowth! > g0.revenueGrowth! ? 'picked up' : 'slowed'} to ${pct(g1.revenueGrowth)} in ${g1.period} from ${pct(g0.revenueGrowth)} in ${g0.period}.`
      : g1
        ? ` Growth was ${pct(g1.revenueGrowth)} in ${g1.period} vs ${g1.comparedWith}.`
        : period === 'quarterly'
          ? ' Year-on-year growth needs the same quarter a year earlier, which is not available here.'
          : '';
  return `${head}${profit}.${growth}`;
}

function marginText(data: PeriodPoint[]): string | null {
  const parts: string[] = [];
  let biggest: { name: string; d: number } | null = null;
  for (const [key, name] of [
    ['ebitdaMargin', 'EBITDA margin'],
    ['operatingMargin', 'operating margin'],
    ['netMargin', 'net margin'],
  ] as const) {
    const [p0, p1] = last2(data, key);
    if (!p1) continue;
    if (p0) {
      const d = Math.round((p1[key]! - p0[key]!) * 10) / 10;
      parts.push(`${name} ${pct(p1[key])} (${pp(d)})`);
      if (!biggest || Math.abs(d) > Math.abs(biggest.d)) biggest = { name, d };
    } else parts.push(`${name} ${pct(p1[key])}`);
  }
  if (!parts.length) return null;
  const latest = reported(data, 'netMargin').pop() ?? reported(data, 'ebitdaMargin').pop();
  const lead = `In ${latest?.period}: ${parts.join(', ')}${parts.some((x) => x.includes('pp')) ? ' vs the previous period' : ''}.`;
  return biggest && Math.abs(biggest.d) >= 2 ? `${lead} The largest move was ${biggest.name} (${pp(biggest.d)}), worth explaining in the next results.` : lead;
}

function cashText(data: PeriodPoint[], m: (v: number) => string): string | null {
  const r = reported(data, 'operatingCashFlow');
  if (!r.length) return null;
  const last = r[r.length - 1];
  const conv = last.cfoToPat !== null ? `Operating cash flow was ${times(last.cfoToPat)} net profit in ${last.period}` : `Operating cash flow was ${m(last.operatingCashFlow!)} in ${last.period}`;
  const fcf = last.freeCashFlow !== null && last.capex !== null ? `, leaving free cash flow of ${m(last.freeCashFlow)} after ${m(last.capex)} of capex` : '';
  const flagged = r.filter((p) => divergence(p));
  const flags = flagged.length ? ` Profit and cash diverged in ${flagged.map((p) => p.period).join(', ')} (marked).` : ' Profit and operating cash moved together in every period shown.';
  return `${conv}${fcf}.${flags}`;
}

function balanceText(data: PeriodPoint[], m: (v: number) => string, lender: boolean): string | null {
  const r = reported(data, 'borrowings');
  if (!r.length) return null;
  const last = r[r.length - 1];
  if (lender) return `Borrowings were ${m(last.borrowings!)} in ${last.period}${last.debtToEquity !== null ? `, ${times(last.debtToEquity)} equity` : ''}.`;
  const net = last.netDebt !== null ? (last.netDebt <= 0 ? `net cash of ${m(-last.netDebt)}` : `net debt of ${m(last.netDebt)}`) : null;
  const [d0, d1] = last2(data, 'debtToEquity');
  const trend =
    d0 && d1
      ? d1.debtToEquity === d0.debtToEquity
        ? `; debt to equity held at ${times(d1.debtToEquity)}`
        : `; debt to equity ${d1.debtToEquity! > d0.debtToEquity! ? 'rose' : 'fell'} to ${times(d1.debtToEquity)} from ${times(d0.debtToEquity)}`
      : '';
  const cover = last.interestCoverage !== null ? `. Operating profit covered interest ${times(last.interestCoverage, 1)}` : '';
  return `In ${last.period}: debt ${m(last.borrowings!)}${last.cash !== null ? `, cash ${m(last.cash)}` : ''}${net ? `, ${net}` : ''}${trend}${cover}.`;
}

function growthText(data: PeriodPoint[], period: Period): string | null {
  const [g0, g1] = last2(data, 'revenueGrowth');
  if (!g1) return period === 'quarterly' ? 'Too few comparable quarters for year-on-year growth.' : 'At least two consecutive years are needed for growth.';
  const momentum = g0 ? (g1.revenueGrowth! - g0.revenueGrowth! >= 2 ? 'accelerating' : g0.revenueGrowth! - g1.revenueGrowth! >= 2 ? 'decelerating' : 'broadly steady') : null;
  const profit = g1.profitGrowth !== null ? `, net profit ${pct(g1.profitGrowth)}` : '';
  const eps = g1.epsGrowth !== null ? `, EPS ${pct(g1.epsGrowth)}` : '';
  return `${g1.period} vs ${g1.comparedWith}: revenue ${pct(g1.revenueGrowth)}${profit}${eps}.${momentum ? ` Revenue growth is ${momentum} (${pct(g0!.revenueGrowth)} the period before).` : ''}`;
}
