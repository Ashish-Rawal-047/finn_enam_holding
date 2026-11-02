/**
 * Interactive price + volume chart (inline SVG).
 *
 * Two stacked charts on a shared x-axis (never a dual y-axis): closing price with 20/50-day
 * moving averages, and daily volume where sessions at or above the user's volume threshold
 * are marked as anomalies (amber + legend label, never colour alone). Crosshair tooltip works
 * with mouse and touch; a table view gives the same numbers as text.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Candle } from '../../lib/types';
import { compact, inr, shortDate, signedPct } from '../../lib/format';

// Validated with dataviz validate_palette.js (light vs #FFFFFF, dark vs #12251D): all checks pass.
const SERIES = {
  light: { price: '#1F7A55', sma20: '#3A6FB0', sma50: '#B5652A', volume: '#D5D9D0', anomaly: '#C88A35', grid: '#EFECE3', axis: '#7A8780', cross: '#203C34' },
  dark: { price: '#3AA876', sma20: '#5B8BDD', sma50: '#C47A3F', volume: '#2A4237', anomaly: '#D49A3A', grid: '#1D3229', axis: '#A2ACA5', cross: '#EEF1EA' },
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const PRICE_H = 190;
const VOL_H = 64;
const GAP = 14;
const PAD = { top: 10, right: 52, bottom: 20, left: 4 };

export const PriceChart: React.FC<{ candles: Candle[]; theme: 'light' | 'dark'; volumeThreshold: number }> = ({ candles, theme, volumeThreshold }) => {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const c = SERIES[theme];
  const n = candles.length;

  const geo = useMemo(() => {
    if (!width || n < 2) return null;
    const plotW = width - PAD.left - PAD.right;
    const values = candles.flatMap((k) => [k.close, k.sma20, k.sma50]).filter((v): v is number => v !== null);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = (max - min) * 0.08 || max * 0.02;
    min -= pad;
    max += pad;
    const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (PRICE_H - PAD.top - 6);
    const maxVol = Math.max(...candles.map((k) => k.volume)) || 1;
    const volTop = PRICE_H + GAP;
    const vy = (v: number) => volTop + VOL_H - (v / maxVol) * VOL_H;
    const line = (key: 'close' | 'sma20' | 'sma50') => {
      let d = '';
      candles.forEach((k, i) => {
        const v = k[key];
        if (v === null) return;
        d += `${d === '' || candles[i - 1]?.[key] === null ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      });
      return d;
    };
    const ticks = [0, 0.5, 1].map((t) => min + pad + t * (max - min - 2 * pad));
    const barW = Math.max(1, plotW / n - (n > 120 ? 0.5 : 2));
    return { plotW, x, y, vy, volTop, line, ticks, barW, maxVol };
  }, [candles, width, n]);

  const handlePointer = (e: React.PointerEvent<SVGRectElement>) => {
    if (!geo) return;
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / geo.plotW) * (n - 1)))));
  };

  if (n < 2) {
    return <p className="py-10 text-center text-xs text-ink-muted">Not enough price history for this range.</p>;
  }

  const h = hover !== null ? candles[hover] : null;
  const totalH = PRICE_H + GAP + VOL_H + PAD.bottom;
  const anomalies = candles.filter((k) => (k.volumeRatio ?? 0) >= volumeThreshold).length;

  return (
    <div className="space-y-2">
      {/* Legend (≥ 2 series) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
        <LegendSwatch color={c.price} label="Close" />
        <LegendSwatch color={c.sma20} label="20-day MA" />
        <LegendSwatch color={c.sma50} label="50-day MA" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2 rounded-sm" style={{ background: c.anomaly }} />
          Volume ≥ {volumeThreshold}× 20-day avg ({anomalies})
        </span>
      </div>

      <div ref={wrapRef} className="relative w-full select-none touch-pan-y">
        {geo && (
          <svg width={width} height={totalH} role="img" aria-label={`Price chart, ${n} sessions from ${shortDate(candles[0].tradeDate)} to ${shortDate(candles[n - 1].tradeDate)}`}>
            {/* Price grid + axis */}
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={geo.y(t)} y2={geo.y(t)} stroke={c.grid} strokeWidth={1} />
                <text x={width - PAD.right + 6} y={geo.y(t) + 3.5} fontSize={10} fill={c.axis} fontFamily="IBM Plex Mono, monospace">
                  {t >= 1000 ? Math.round(t).toLocaleString('en-IN') : t.toFixed(1)}
                </text>
              </g>
            ))}
            <path d={geo.line('sma50')} fill="none" stroke={c.sma50} strokeWidth={1.5} strokeLinejoin="round" />
            <path d={geo.line('sma20')} fill="none" stroke={c.sma20} strokeWidth={1.5} strokeLinejoin="round" />
            <path key={`${candles[0]?.tradeDate}-${n}`} d={geo.line('close')} fill="none" stroke={c.price} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="draw-in" style={{ ['--len' as string]: 1 }} />

            {/* Volume (separate chart, own scale) */}
            <text x={width - PAD.right + 6} y={geo.volTop + 9} fontSize={10} fill={c.axis} fontFamily="IBM Plex Mono, monospace">
              {compact(geo.maxVol)}
            </text>
            <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={geo.volTop + VOL_H} y2={geo.volTop + VOL_H} stroke={c.grid} />
            {candles.map((k, i) => {
              const top = geo.vy(k.volume);
              const isAnomaly = (k.volumeRatio ?? 0) >= volumeThreshold;
              return (
                <rect
                  key={k.tradeDate}
                  x={geo.x(i) - geo.barW / 2}
                  y={top}
                  width={geo.barW}
                  height={Math.max(1, geo.volTop + VOL_H - top)}
                  rx={geo.barW > 4 ? 1.5 : 0}
                  fill={isAnomaly ? c.anomaly : c.volume}
                />
              );
            })}

            {/* X labels */}
            {[0, Math.floor((n - 1) / 2), n - 1].map((i, idx) => (
              <text
                key={i}
                x={geo.x(i)}
                y={totalH - 4}
                fontSize={10}
                fill={c.axis}
                textAnchor={idx === 0 ? 'start' : idx === 2 ? 'end' : 'middle'}
                fontFamily="IBM Plex Mono, monospace"
              >
                {shortDate(candles[i].tradeDate)}
              </text>
            ))}

            {/* Crosshair */}
            {h && hover !== null && (
              <g pointerEvents="none">
                <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={geo.volTop + VOL_H} stroke={c.cross} strokeOpacity={0.35} strokeDasharray="3 3" />
                <circle cx={geo.x(hover)} cy={geo.y(h.close)} r={4.5} fill={c.price} stroke={theme === 'dark' ? '#12251D' : '#FFFFFF'} strokeWidth={2} />
              </g>
            )}

            {/* Hit target covers both charts */}
            <rect
              x={PAD.left}
              y={0}
              width={geo.plotW}
              height={geo.volTop + VOL_H}
              fill="transparent"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {h && geo && hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-[168px] rounded-xl border border-divider dark:border-ink-border bg-paper/95 dark:bg-ink-surface/95 p-2.5 text-[11px] shadow-float backdrop-blur"
            style={{ left: Math.min(Math.max(geo.x(hover) - 84, 0), width - 168) }}
          >
            <div className="font-mono font-semibold text-ink dark:text-white">{shortDate(h.tradeDate)}</div>
            <Row label="Close" value={inr(h.close)} />
            <Row label="Change" value={signedPct(h.changePercent)} />
            <Row label="20d / 50d MA" value={`${h.sma20?.toFixed(0) ?? '—'} / ${h.sma50?.toFixed(0) ?? '—'}`} />
            <Row label="Volume" value={compact(h.volume)} />
            <Row label="vs 20d avg" value={h.volumeRatio !== null ? `${h.volumeRatio.toFixed(2)}×` : '—'} highlight={(h.volumeRatio ?? 0) >= volumeThreshold} />
          </div>
        )}
      </div>

      <button onClick={() => setShowTable((s) => !s)} className="min-h-[36px] text-xs font-semibold text-forest dark:text-emerald hover:underline">
        {showTable ? 'Hide table' : 'View as table'}
      </button>
      {showTable && (
        <div className="max-h-64 overflow-auto rounded-xl border border-divider dark:border-ink-border">
          <table className="w-full text-[11px] font-mono tabular-nums">
            <thead className="sticky top-0 bg-cream-light dark:bg-ink-surfaceSubtle text-ink-muted">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Date</th>
                <th className="px-2 py-1.5 text-right font-medium">Close</th>
                <th className="px-2 py-1.5 text-right font-medium">Chg</th>
                <th className="px-2 py-1.5 text-right font-medium">Volume</th>
                <th className="px-2 py-1.5 text-right font-medium">×20d</th>
              </tr>
            </thead>
            <tbody>
              {[...candles].reverse().map((k) => (
                <tr key={k.tradeDate} className="border-t border-divider/60 dark:border-ink-border">
                  <td className="px-2 py-1">{k.tradeDate}</td>
                  <td className="px-2 py-1 text-right">{k.close.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{signedPct(k.changePercent)}</td>
                  <td className="px-2 py-1 text-right">{compact(k.volume)}</td>
                  <td className="px-2 py-1 text-right">{k.volumeRatio?.toFixed(2) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LegendSwatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />
    {label}
  </span>
);

const Row: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between gap-2 text-ink-muted">
    <span>{label}</span>
    <span className={`font-mono font-semibold ${highlight ? 'text-fin-amber' : 'text-ink dark:text-white'}`}>{value}</span>
  </div>
);
