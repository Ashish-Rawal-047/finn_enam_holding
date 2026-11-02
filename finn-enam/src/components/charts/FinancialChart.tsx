/**
 * Annual / quarterly financial trajectory chart (inline SVG).
 * Views: revenue & profit (grouped bars), margins (lines), cash flow (grouped bars), debt (bars).
 * Two categorical series max, from the validated palette (dataviz validate_palette.js: pass).
 * One y-axis per view; negative values render below a zero baseline; hover tooltip + table view.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chips } from '../ui';

export interface FinancialPoint {
  period: string;
  revenue: number | null;
  pat: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  netMargin: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  borrowings: number | null;
}

type View = 'income' | 'margins' | 'cash' | 'debt';

const PALETTE = {
  light: { a: '#1F7A55', b: '#3A6FB0', grid: '#EFECE3', axis: '#7A8780', zero: '#C9C5B8' },
  dark: { a: '#3AA876', b: '#5B8BDD', grid: '#1D3229', axis: '#A2ACA5', zero: '#355246' },
};

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const FinancialChart: React.FC<{ annual: FinancialPoint[]; quarterly: FinancialPoint[]; currency: string; unit: string }> = ({ annual, quarterly, currency, unit }) => {
  const [period, setPeriod] = useState<'annual' | 'quarterly'>(annual.length >= 2 ? 'annual' : 'quarterly');
  const [view, setView] = useState<View>('income');
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [ref, width] = useWidth();
  const c = PALETTE[useIsDark() ? 'dark' : 'light'];
  const data = period === 'annual' ? annual : quarterly;
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? 'US$' : `${currency} `;
  const unitLabel = unit === 'crore' ? 'Cr' : 'M';
  const money = (v: number | null) => (v === null ? '—' : `${sym}${v.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 })} ${unitLabel}`);

  const spec = useMemo(() => {
    switch (view) {
      case 'income':
        return { kind: 'bars' as const, a: { key: 'revenue' as const, label: 'Revenue' }, b: { key: 'pat' as const, label: 'Net income' }, fmt: money };
      case 'margins':
        return { kind: 'lines' as const, a: { key: 'ebitdaMargin' as const, label: 'EBITDA margin' }, b: { key: 'netMargin' as const, label: 'Net margin' }, fmt: (v: number | null) => (v === null ? '—' : `${v}%`) };
      case 'cash':
        return { kind: 'bars' as const, a: { key: 'operatingCashFlow' as const, label: 'Operating cash flow' }, b: { key: 'freeCashFlow' as const, label: 'Free cash flow' }, fmt: money };
      default:
        return { kind: 'bars' as const, a: { key: 'borrowings' as const, label: 'Total debt' }, b: null, fmt: money };
    }
  }, [view, currency, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const values = data.flatMap((d) => [d[spec.a.key], spec.b ? d[spec.b.key] : null]).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const H = 200;
  const PAD = { top: 12, bottom: 24, left: 4, right: 54 };
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const y = (v: number) => PAD.top + ((max - v) / span) * (H - PAD.top - PAD.bottom);
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(4, Math.min(28, slot / (spec.b ? 3 : 2)));
  const ticks = [max, (max + min) / 2, min].filter((v, i, arr) => arr.indexOf(v) === i);
  const xCenter = (i: number) => PAD.left + slot * i + slot / 2;

  /** Line through available points; a missing period breaks the line instead of interpolating. */
  const linePath = (key: keyof FinancialPoint) => {
    let d = '';
    let pen = false;
    data.forEach((p, i) => {
      const v = p[key];
      if (v === null || typeof v !== 'number') {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${xCenter(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chips<View>
          ariaLabel="Financial chart"
          value={view}
          onChange={setView}
          options={[
            { id: 'income', label: 'Revenue & profit' },
            { id: 'margins', label: 'Margins' },
            { id: 'cash', label: 'Cash flow' },
            { id: 'debt', label: 'Debt' },
          ]}
        />
        <div className="flex rounded-lg bg-cream-dark p-0.5 text-[11.5px] dark:bg-ink-surfaceSubtle">
          {(['annual', 'quarterly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              disabled={(p === 'annual' ? annual : quarterly).length === 0}
              className={`min-h-[30px] rounded-md px-2.5 capitalize disabled:opacity-40 ${period === p ? 'bg-paper font-semibold text-ink shadow-card dark:bg-ink-surface dark:text-white' : 'text-ink-muted'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.a }} /> {spec.a.label}
        </span>
        {spec.b && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.b }} /> {spec.b.label}
          </span>
        )}
      </div>

      <div ref={ref} className="relative w-full">
        {!hasData ? (
          <p className="py-10 text-center text-xs text-ink-muted">Data unavailable for this view.</p>
        ) : (
          width > 0 && (
            <svg width={width} height={H} role="img" aria-label={`${spec.a.label}${spec.b ? ` and ${spec.b.label}` : ''}, ${period}`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={c.grid} />
                  <text x={width - PAD.right + 6} y={y(t) + 3.5} fontSize={10} fill={c.axis} fontFamily="IBM Plex Mono, monospace">
                    {view === 'margins' ? `${Math.round(t)}%` : Math.abs(t) >= 1000 ? `${Math.round(t / 1000)}k` : Math.round(t)}
                  </text>
                </g>
              ))}
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(0)} y2={y(0)} stroke={c.zero} />
              {spec.kind === 'bars'
                ? data.map((d, i) => {
                    const series = [spec.a, spec.b].filter(Boolean) as Array<{ key: keyof FinancialPoint; label: string }>;
                    return series.map((s, j) => {
                      const v = d[s.key] as number | null;
                      if (v === null) return null;
                      const x = xCenter(i) - (series.length * barW + (series.length - 1) * 2) / 2 + j * (barW + 2);
                      const top = Math.min(y(v), y(0));
                      return <rect key={`${i}-${j}`} x={x} y={top} width={barW} height={Math.max(1, Math.abs(y(v) - y(0)))} rx={2} fill={j === 0 ? c.a : c.b} opacity={hover === null || hover === i ? 1 : 0.45} />;
                    });
                  })
                : [spec.a, spec.b].filter(Boolean).map((s, j) => (
                    <g key={s!.key}>
                      <path d={linePath(s!.key)} fill="none" stroke={j === 0 ? c.a : c.b} strokeWidth={2} strokeLinejoin="round" />
                      {data.map((d, i) => (d[s!.key] === null ? null : <circle key={i} cx={xCenter(i)} cy={y(d[s!.key] as number)} r={3.5} fill={j === 0 ? c.a : c.b} />))}
                    </g>
                  ))}
              {data.map((d, i) => (
                <text key={d.period} x={xCenter(i)} y={H - 6} fontSize={10} fill={c.axis} textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
                  {d.period}
                </text>
              ))}
              {data.map((_, i) => (
                <rect key={`hit-${i}`} x={PAD.left + slot * i} y={0} width={slot} height={H - PAD.bottom} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)} />
              ))}
            </svg>
          )
        )}
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute top-1 z-10 min-w-[170px] rounded-xl border border-divider bg-paper p-2.5 text-[11px] shadow-lift dark:border-ink-border dark:bg-ink-surface" style={{ left: Math.min(Math.max(xCenter(hover) - 85, 0), Math.max(0, width - 175)) }}>
            <div className="font-mono font-semibold text-ink dark:text-white">{data[hover].period}</div>
            <div className="mt-1 flex justify-between gap-3 text-ink-muted">
              <span>{spec.a.label}</span>
              <span className="font-mono text-ink dark:text-white">{spec.fmt(data[hover][spec.a.key] as number | null)}</span>
            </div>
            {spec.b && (
              <div className="flex justify-between gap-3 text-ink-muted">
                <span>{spec.b.label}</span>
                <span className="font-mono text-ink dark:text-white">{spec.fmt(data[hover][spec.b.key] as number | null)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10.5px] text-ink-subtle">
        <span>
          {currency} {unit === 'crore' ? 'crore' : 'millions'} · source: Yahoo Finance statements
        </span>
        <button onClick={() => setTable((t) => !t)} className="min-h-[32px] font-semibold text-forest hover:underline dark:text-emerald">
          {table ? 'Hide table' : 'View as table'}
        </button>
      </div>
      {table && (
        <div className="overflow-x-auto rounded-xl border border-divider dark:border-ink-border">
          <table className="w-full font-mono text-[11px]">
            <thead className="bg-cream-light text-ink-muted dark:bg-ink-surfaceSubtle">
              <tr>
                {['Period', 'Revenue', 'EBITDA', 'Net income', 'EBITDA %', 'Net %', 'CFO', 'FCF', 'Debt'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-1.5 text-right font-medium first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.period} className="border-t border-divider dark:border-ink-border">
                  <td className="px-2 py-1">{d.period}</td>
                  {[d.revenue, d.ebitda, d.pat].map((v, i) => (
                    <td key={i} className="px-2 py-1 text-right">{v === null ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  ))}
                  <td className="px-2 py-1 text-right">{d.ebitdaMargin ?? '—'}</td>
                  <td className="px-2 py-1 text-right">{d.netMargin ?? '—'}</td>
                  {[d.operatingCashFlow, d.freeCashFlow, d.borrowings].map((v, i) => (
                    <td key={i} className="px-2 py-1 text-right">{v === null ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
