/**
 * Period trend chart (inline SVG) for research: one or more stacked panels sharing the period axis.
 *
 * - One y-scale per panel; measures with different units go in separate panels (never two axes).
 * - Categorical colours from a palette validated with the dataviz validator, all pairs, both modes:
 *   light #1F7A55 · #3A6FB0 · #C27C1E on #FFFEFA; dark #3AA876 · #5B8BDD · #C27C1E on #14251E.
 * - Missing periods are drawn as hatched "not reported" slots; lines break at gaps (no interpolation).
 * - Hover / tap shows every value for the period; a table view lists the same numbers.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PeriodPoint } from '../../lib/types';
import { cx } from '../ui';

export type SeriesKey = { [K in keyof PeriodPoint]: PeriodPoint[K] extends number | null ? K : never }[keyof PeriodPoint];

export interface Series {
  key: SeriesKey;
  label: string;
  /** Categorical slot, or 'ink' for a lone series in a captioned panel (named by its caption). */
  slot: 0 | 1 | 2 | 'ink';
  kind: 'bar' | 'line';
}

export interface PanelSpec {
  id: string;
  /** Short panel caption, shown above the panel when there are several panels. */
  caption?: string;
  series: Series[];
  format: (v: number) => string;
  /** Tick label; `step` (the tick spacing) lets the label pick its precision. */
  axis: (v: number, step: number) => string;
  height?: number;
  reference?: { value: number; label: string };
  /** Keep zero on the scale (honest for margins and ratios). Bars always do. */
  zero?: boolean;
  /** Periods to flag (e.g. profit and cash diverging), with the reason shown in the tooltip. */
  flag?: (p: PeriodPoint) => string | null;
}

const PALETTE = {
  light: { series: ['#1F7A55', '#3A6FB0', '#C27C1E'], ink: '#4E5D56', grid: '#EFECE3', axis: '#7A8780', zero: '#C9C5B8', surface: '#FFFEFA', gap: '#B9B4A6', flag: '#D03B3B' },
  dark: { series: ['#3AA876', '#5B8BDD', '#C27C1E'], ink: '#B8C2BB', grid: '#1D3229', axis: '#A2ACA5', zero: '#355246', surface: '#14251E', gap: '#4A6157', flag: '#E66767' },
};

export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const colorOf = (slot: Series['slot'], c: (typeof PALETTE)['light']) => (slot === 'ink' ? c.ink : c.series[slot]);

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

/** 3–5 round tick values covering [min, max] (always including 0 when the range spans it). */
function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const raw = (max - min) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  // From the step at or below min to the step at or above max, so the data never runs past the top tick.
  const top = Math.ceil(max / step - 1e-9) * step;
  for (let v = Math.floor(min / step + 1e-9) * step; v <= top + step * 0.001; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Bar path with rounded data end, anchored square at the baseline. */
function barPath(x: number, w: number, yVal: number, yZero: number) {
  const h = Math.abs(yZero - yVal);
  if (h < 0.5) return `M${x},${yZero}h${w}`;
  const r = Math.min(3, w / 2, h);
  if (yVal < yZero) return `M${x},${yZero}V${yVal + r}Q${x},${yVal} ${x + r},${yVal}H${x + w - r}Q${x + w},${yVal} ${x + w},${yVal + r}V${yZero}Z`;
  return `M${x},${yZero}V${yVal - r}Q${x},${yVal} ${x + r},${yVal}H${x + w - r}Q${x + w},${yVal} ${x + w},${yVal - r}V${yZero}Z`;
}

const PAD = { left: 2, right: 44 };
const AXIS_H = 22;

export const TrendChart: React.FC<{ data: PeriodPoint[]; panels: PanelSpec[]; label: string; tooltipNote?: (p: PeriodPoint) => string | null }> = ({ data, panels, label, tooltipNote }) => {
  const [ref, width] = useWidth();
  const dark = useIsDark();
  const c = PALETTE[dark ? 'dark' : 'light'];
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const hatch = useId().replace(/:/g, '');

  // A lone series in a captioned panel is named by its caption, so it needs no legend entry.
  const allSeries = panels.flatMap((p) => (p.caption && p.series.length === 1 && panels.length > 1 ? [] : p.series));
  const legend = allSeries.filter((s, i) => allSeries.findIndex((x) => x.label === s.label) === i);
  // Quarter labels ("Q1 FY26") go on two lines so neighbours never collide.
  const twoLine = data.some((d) => /^Q\d FY/.test(d.period));
  const axisH = twoLine ? 34 : AXIS_H;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const slot = data.length ? plotW / data.length : 0;
  const xCenter = (i: number) => PAD.left + slot * i + slot / 2;

  const layout = useMemo(() => {
    let top = 0;
    return panels.map((p) => {
      const h = p.height ?? 150;
      const captionH = p.caption ? 18 : 0; // the caption carries the unit, so it always shows
      const values = data.flatMap((d) => p.series.map((s) => d[s.key] as number | null)).filter((v): v is number => v !== null && Number.isFinite(v));
      if (p.reference) values.push(p.reference.value);
      // Bars (and panels marked `zero`) keep a zero baseline; lines get a little headroom.
      const anchored = p.zero || p.series.some((s) => s.kind === 'bar');
      const vmin = values.length ? Math.min(...values) : 0;
      const vmax = values.length ? Math.max(...values) : 1;
      const lo = anchored ? Math.min(0, vmin) : vmin;
      const hi = anchored ? Math.max(0, vmax) : vmax;
      const pad = anchored ? 0 : (hi - lo || Math.abs(hi) || 1) * 0.15;
      const ticks = values.length ? niceTicks(lo - pad, hi + pad) : [];
      const min = ticks.length ? Math.min(ticks[0], lo) : 0;
      const max = ticks.length ? Math.max(ticks[ticks.length - 1], hi) : 1;
      const y0 = top + captionH + 10;
      const y1 = top + captionH + h - 6;
      const y = (v: number) => y0 + ((max - v) / (max - min || 1)) * (y1 - y0);
      const block = { ...p, top, captionH, h, ticks, y, y0, y1, empty: values.length === 0 || (p.reference ? values.length === 1 : false) };
      top += captionH + h;
      return block;
    });
  }, [panels, data]);
  const H = (layout.length ? layout[layout.length - 1].top + layout[layout.length - 1].captionH + layout[layout.length - 1].h : 0) + axisH;
  const nothing = layout.every((l) => l.empty);

  const tipX = hover === null ? 0 : Math.min(Math.max(xCenter(hover) - 95, 0), Math.max(0, width - 190));
  const hovered = hover === null ? null : data[hover];

  return (
    <div className="space-y-2.5">
      {legend.length > 1 && (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-ink-muted">
          {legend.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              {s.kind === 'line' ? (
                <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: colorOf(s.slot, c) }} />
              ) : (
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: colorOf(s.slot, c) }} />
              )}
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full" onPointerLeave={() => setHover(null)}>
        {nothing ? (
          <p className="py-8 text-center text-[12px] text-ink-muted">The source does not report these figures for this period type.</p>
        ) : (
          width > 0 && (
            <svg width={width} height={H} role="img" aria-label={label} className="block touch-pan-y select-none">
              <defs>
                <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke={c.gap} strokeWidth="1" opacity="0.5" />
                </pattern>
              </defs>
              {/* Gap slots: periods inside the range the source did not report. */}
              {data.map((d, i) =>
                d.missing ? <rect key={`gap-${i}`} x={PAD.left + slot * i + 2} y={0} width={Math.max(0, slot - 4)} height={H - axisH} fill={`url(#${hatch})`} rx={4} /> : null,
              )}
              {hover !== null && <rect x={PAD.left + slot * hover} y={0} width={slot} height={H - axisH} fill={c.grid} opacity={0.6} rx={4} />}
              {layout.map((p) => (
                <g key={p.id}>
                  {p.captionH > 0 && (
                    <text x={PAD.left} y={p.top + 12} fontSize={10.5} fill={c.axis} fontWeight={600} letterSpacing="0.04em">
                      {p.caption!.toUpperCase()}
                    </text>
                  )}
                  {p.empty ? (
                    <text x={PAD.left + plotW / 2} y={(p.y0 + p.y1) / 2} fontSize={11} fill={c.axis} textAnchor="middle">
                      Not reported for these periods
                    </text>
                  ) : (
                    <>
                      {p.ticks.map((t) => (
                        <g key={t}>
                          <line x1={PAD.left} x2={PAD.left + plotW} y1={p.y(t)} y2={p.y(t)} stroke={t === 0 ? c.zero : c.grid} strokeWidth={t === 0 ? 1.25 : 1} />
                          <text x={width - PAD.right + 6} y={p.y(t) + 3.5} fontSize={10} fill={c.axis} fontFamily="IBM Plex Mono, monospace">
                            {p.axis(t, p.ticks.length > 1 ? Math.abs(p.ticks[1] - p.ticks[0]) : 1)}
                          </text>
                        </g>
                      ))}
                      {p.reference && (
                        <g>
                          <line x1={PAD.left} x2={PAD.left + plotW} y1={p.y(p.reference.value)} y2={p.y(p.reference.value)} stroke={c.axis} strokeDasharray="3 3" />
                          <text x={PAD.left + 2} y={p.y(p.reference.value) - 4} fontSize={9.5} fill={c.axis}>
                            {p.reference.label}
                          </text>
                        </g>
                      )}
                      <Bars data={data} panel={p} slot={slot} xCenter={xCenter} color={(k) => colorOf(k, c)} hover={hover} />
                      <Lines data={data} panel={p} xCenter={xCenter} color={(k) => colorOf(k, c)} surface={c.surface} />
                      {p.flag &&
                        data.map((d, i) => {
                          const why = d.missing ? null : p.flag!(d);
                          return why ? (
                            <g key={`flag-${i}`}>
                              <circle cx={xCenter(i)} cy={p.y0 + 2} r={4} fill={c.flag} stroke={c.surface} strokeWidth={2} />
                            </g>
                          ) : null;
                        })}
                    </>
                  )}
                </g>
              ))}
              {data.map((d, i) => {
                const [q, fy] = twoLine ? d.period.split(' ') : [d.period, null];
                return (
                  <text key={d.period} x={xCenter(i)} y={H - (fy ? 19 : 7)} fontSize={10} fill={c.axis} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" opacity={d.missing ? 0.6 : 1}>
                    {q}
                    {fy && (
                      <tspan x={xCenter(i)} dy={12}>
                        {fy}
                      </tspan>
                    )}
                  </text>
                );
              })}
              {data.map((_, i) => (
                <rect
                  key={`hit-${i}`}
                  x={PAD.left + slot * i}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                  // Mouse: hover shows the tooltip. Touch: a tap shows it, a second tap hides it.
                  onPointerDown={(e) => (e.pointerType === 'mouse' ? setHover(i) : setHover((h) => (h === i ? null : i)))}
                />
              ))}
            </svg>
          )
        )}
        {hovered && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-1 z-10 w-[190px] rounded-xl border border-divider bg-paper p-2.5 text-[11px] shadow-lift dark:border-ink-border dark:bg-ink-surface"
            style={{ left: tipX }}
          >
            <div className="font-mono font-semibold text-ink dark:text-white">{hovered.period}</div>
            {hovered.missing ? (
              <div className="mt-1 text-ink-muted">Not reported by the source</div>
            ) : (
              <>
                {panels.map((p) =>
                  p.series.map((s) => {
                    const v = hovered[s.key] as number | null;
                    return (
                      <div key={`${p.id}-${s.key}`} className="mt-1 flex items-center justify-between gap-3 text-ink-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: colorOf(s.slot, c) }} />
                          {s.label}
                        </span>
                        <span className="font-mono text-ink dark:text-white">{v === null ? 'n/a' : p.format(v)}</span>
                      </div>
                    );
                  }),
                )}
                {panels.map((p) => {
                  const why = p.flag?.(hovered);
                  return why ? (
                    <div key={`why-${p.id}`} className="mt-1.5 flex gap-1 text-[10.5px] leading-snug text-fin-red">
                      <AlertTriangle size={11} className="mt-px shrink-0" /> {why}
                    </div>
                  ) : null;
                })}
                {tooltipNote?.(hovered) && <div className="mt-1.5 text-[10.5px] leading-snug text-ink-subtle">{tooltipNote(hovered)}</div>}
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={() => setTable((t) => !t)} className="min-h-[32px] text-[11.5px] font-semibold text-forest hover:underline dark:text-emerald" aria-expanded={table}>
          {table ? 'Hide table' : 'View as table'}
        </button>
      </div>
      {table && (
        <div className="overflow-x-auto rounded-xl border border-divider dark:border-ink-border">
          <table className="w-full font-mono text-[11px]">
            <thead className="bg-cream-light text-ink-muted dark:bg-ink-surfaceSubtle">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Period</th>
                {panels.flatMap((p) => p.series.map((s) => <th key={`${p.id}-${s.key}`} className="whitespace-nowrap px-2 py-1.5 text-right font-medium">{s.label}</th>))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.period} className={cx('border-t border-divider dark:border-ink-border', d.missing && 'text-ink-subtle')}>
                  <td className="whitespace-nowrap px-2 py-1">{d.period}</td>
                  {panels.flatMap((p) =>
                    p.series.map((s) => {
                      const v = d[s.key] as number | null;
                      return (
                        <td key={`${p.id}-${s.key}`} className="whitespace-nowrap px-2 py-1 text-right">
                          {d.missing ? 'not reported' : v === null ? 'n/a' : p.format(v)}
                        </td>
                      );
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

type Block = PanelSpec & { y: (v: number) => number };

const Bars: React.FC<{ data: PeriodPoint[]; panel: Block; slot: number; xCenter: (i: number) => number; color: (s: Series['slot']) => string; hover: number | null }> = ({ data, panel, slot, xCenter, color, hover }) => {
  const bars = panel.series.filter((s) => s.kind === 'bar');
  if (!bars.length) return null;
  const gap = 2;
  const w = Math.max(3, Math.min(18, (slot * 0.72 - gap * (bars.length - 1)) / bars.length));
  const total = bars.length * w + (bars.length - 1) * gap;
  return (
    <g>
      {data.map((d, i) =>
        bars.map((s, j) => {
          const v = d[s.key] as number | null;
          if (v === null || d.missing) return null;
          const x = xCenter(i) - total / 2 + j * (w + gap);
          return <path key={`${i}-${s.key}`} d={barPath(x, w, panel.y(v), panel.y(0))} fill={color(s.slot)} opacity={hover === null || hover === i ? 1 : 0.5} />;
        }),
      )}
    </g>
  );
};

const Lines: React.FC<{ data: PeriodPoint[]; panel: Block; xCenter: (i: number) => number; color: (s: Series['slot']) => string; surface: string }> = ({ data, panel, xCenter, color, surface }) => (
  <g>
    {panel.series
      .filter((s) => s.kind === 'line')
      .map((s) => {
        // A missing value breaks the line; isolated points still get a marker.
        let d = '';
        let pen = false;
        data.forEach((p, i) => {
          const v = p[s.key] as number | null;
          if (v === null || p.missing) {
            pen = false;
            return;
          }
          d += `${pen ? 'L' : 'M'}${xCenter(i).toFixed(1)},${panel.y(v).toFixed(1)}`;
          pen = true;
        });
        return (
          <g key={s.key}>
            <path d={d} fill="none" stroke={color(s.slot)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((p, i) => {
              const v = p[s.key] as number | null;
              return v === null || p.missing ? null : <circle key={i} cx={xCenter(i)} cy={panel.y(v)} r={4} fill={color(s.slot)} stroke={surface} strokeWidth={2} />;
            })}
          </g>
        );
      })}
  </g>
);
