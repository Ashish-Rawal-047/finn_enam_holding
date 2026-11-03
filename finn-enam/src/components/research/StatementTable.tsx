/** Multi-period financial table (Financials tab): statements, margins, growth, cash and leverage. */
import React, { useState } from 'react';
import type { FinancialAnalysis, PeriodPoint } from '../../lib/types';
import { cx, Segmented } from '../ui';
import { money, pct, times } from './format';

type Row = { label: string; get: (p: PeriodPoint) => string; group?: string; derived?: boolean };

export const StatementTable: React.FC<{ analysis: FinancialAnalysis }> = ({ analysis: a }) => {
  const [period, setPeriod] = useState<'annual' | 'quarterly'>(a.annual.length ? 'annual' : 'quarterly');
  const data = period === 'annual' ? a.annual : a.quarterly;
  const m = (v: number | null) => (v === null ? 'n/a' : money(v, a.currency, a.unit).replace(/ (Cr|M)$/, ''));
  const rows: Row[] = [
    { group: 'Income statement', label: 'Revenue', get: (p) => m(p.revenue) },
    { label: 'EBITDA', get: (p) => m(p.ebitda) },
    { label: 'Operating income', get: (p) => m(p.operatingIncome) },
    { label: 'Net profit', get: (p) => m(p.pat) },
    { label: 'Diluted EPS', get: (p) => (p.eps === null ? 'n/a' : p.eps.toFixed(2)) },
    { group: 'Margins', label: 'EBITDA margin', get: (p) => pct(p.ebitdaMargin), derived: true },
    { label: 'Operating margin', get: (p) => pct(p.operatingMargin), derived: true },
    { label: 'Net margin', get: (p) => pct(p.netMargin), derived: true },
    { group: period === 'annual' ? 'Growth, year on year' : 'Growth vs same quarter last year', label: 'Revenue', get: (p) => pct(p.revenueGrowth), derived: true },
    { label: 'Net profit', get: (p) => pct(p.profitGrowth), derived: true },
    { label: 'EPS', get: (p) => pct(p.epsGrowth), derived: true },
    { group: 'Cash flow', label: 'Operating cash flow', get: (p) => m(p.operatingCashFlow) },
    { label: 'Capital expenditure', get: (p) => m(p.capex) },
    { label: 'Free cash flow', get: (p) => m(p.freeCashFlow), derived: true },
    { label: 'Cash ÷ net profit', get: (p) => times(p.cfoToPat), derived: true },
    { group: 'Balance sheet', label: 'Total debt', get: (p) => m(p.borrowings) },
    { label: 'Cash & equivalents', get: (p) => m(p.cash) },
    { label: 'Net debt', get: (p) => m(p.netDebt), derived: true },
    { label: 'Debt to equity', get: (p) => times(p.debtToEquity), derived: true },
    { label: 'Interest cover', get: (p) => times(p.interestCoverage, 1), derived: true },
  ];
  if (!data.length) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-ink-muted">
          {a.currency} {a.unit === 'crore' ? 'crore' : 'millions'} except per-share, % and ×
        </span>
        <div className="w-[190px] shrink-0">
          <Segmented
            ariaLabel="Table period"
            value={period}
            onChange={setPeriod}
            options={[
              { id: 'annual', label: 'Annual' },
              { id: 'quarterly', label: 'Quarterly' },
            ]}
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-divider dark:border-ink-border">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-cream-light text-ink-muted dark:bg-ink-surfaceSubtle">
              <th className="sticky left-0 z-[1] bg-cream-light px-2.5 py-2 text-left font-sans font-medium dark:bg-ink-surfaceSubtle">Period</th>
              {data.map((p) => (
                <th key={p.period} className={cx('whitespace-nowrap px-2.5 py-2 text-right font-medium', p.missing && 'text-ink-subtle')}>
                  {p.period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <React.Fragment key={`${r.group ?? ''}${r.label}${i}`}>
                {r.group && (
                  <tr>
                    <td colSpan={data.length + 1} className="sticky left-0 bg-paper px-2.5 pb-1 pt-2.5 font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle dark:bg-ink-surface">
                      {r.group}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-divider/70 dark:border-ink-border/70">
                  <td className={cx('sticky left-0 z-[1] whitespace-nowrap bg-paper px-2.5 py-1.5 font-sans text-ink dark:bg-ink-surface dark:text-ink-light', r.derived && 'text-ink-muted')}>{r.label}</td>
                  {data.map((p) => (
                    <td key={p.period} className="whitespace-nowrap px-2.5 py-1.5 text-right text-ink dark:text-ink-light">
                      {p.missing ? <span className="text-ink-subtle">—</span> : r.get(p)}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10.5px] leading-snug text-ink-subtle">
        Muted rows are calculated by FINN from the reported figures; “—” marks a period the source did not report; n/a means the figure is not in the data.
      </p>
    </div>
  );
};
