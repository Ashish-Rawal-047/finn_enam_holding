/** Number formatting for research views, in the statement's own currency and unit (never converted). */
const SYMBOL: Record<string, string> = { INR: '₹', USD: 'US$', EUR: '€', GBP: '£', JPY: '¥' };

export const currencySymbol = (ccy: string) => SYMBOL[ccy] ?? `${ccy} `;
export const unitLabel = (unit: string) => (unit === 'crore' ? 'Cr' : 'M');

export function money(v: number | null | undefined, ccy: string, unit: string): string {
  if (v === null || v === undefined) return 'n/a';
  const n = Math.abs(v).toLocaleString(ccy === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 });
  return `${v < 0 ? '−' : ''}${currencySymbol(ccy)}${n} ${unitLabel(unit)}`;
}

/** Compact axis label: 267k, 4.1k, 950. */
export function compact(v: number): string {
  const a = Math.abs(v);
  const s = a >= 1e4 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${+(a / 1000).toFixed(1)}k` : `${Math.round(a * 10) / 10}`;
  return `${v < 0 ? '−' : ''}${s}`;
}

export const pct = (v: number | null | undefined, dp = 1) => (v === null || v === undefined ? 'n/a' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(dp)}%`);
export const times = (v: number | null | undefined, dp = 2) => (v === null || v === undefined ? 'n/a' : `${v.toFixed(dp)}×`);
/** Decimals a tick label needs for a given tick spacing. */
const decimalsFor = (step: number) => {
  const s = Math.round(step * 1e6) / 1e6;
  return Number.isInteger(s) ? 0 : Number.isInteger(Math.round(s * 1e6) / 1e5) ? 1 : 2;
};
export const axisPct = (v: number, step: number) => `${v.toFixed(decimalsFor(step))}%`;
export const axisTimes = (v: number, step: number) => `${v.toFixed(decimalsFor(step))}×`;
export const pp = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)} pp`;
