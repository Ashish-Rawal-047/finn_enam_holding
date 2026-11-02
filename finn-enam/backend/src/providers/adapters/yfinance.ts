/**
 * yfinance adapter: runs backend/python/yf_provider.py and maps its JSON onto FINN's provider
 * contracts.
 *
 * yfinance is an unofficial Yahoo Finance interface. Quotes for NSE/BSE are delayed (Yahoo
 * reports 15 minutes) and are stored as end-of-day closes; statement coverage varies by
 * company; Yahoo may rate-limit or change responses. Calls are serialised through a small
 * concurrency gate and every call has a timeout.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { env, paths } from '../../config/env.js';
import {
  ProviderUnavailableError,
  type CompanyInfoProvider,
  type CompanyRecord,
  type DailyCandle,
  type MarketDataProvider,
  type ProviderInfo,
} from '../types.js';

export class YahooError extends Error {
  constructor(
    public readonly code: 'not_found' | 'rate_limited' | 'provider_error' | 'timeout' | 'usage',
    message: string,
  ) {
    super(message);
  }
}

const SCRIPT = path.join(paths.backendRoot, 'python', 'yf_provider.py');

export function pythonExecutable(): string {
  if (env.YFINANCE_PYTHON) return env.YFINANCE_PYTHON;
  const venv = path.join(paths.backendRoot, 'python', '.venv');
  const candidate = process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python');
  return candidate;
}

export function yfinanceAvailable(): boolean {
  return fs.existsSync(pythonExecutable()) && fs.existsSync(SCRIPT);
}

// --- concurrency gate ------------------------------------------------------------------
const MAX_CONCURRENT = 2;
let active = 0;
const waiting: Array<() => void> = [];
async function gate<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

export function runYahoo<T>(args: string[], timeoutMs = 90_000): Promise<T> {
  return gate(
    () =>
      new Promise<T>((resolve, reject) => {
        execFile(pythonExecutable(), [SCRIPT, ...args], { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
          if (err && (err as NodeJS.ErrnoException & { killed?: boolean }).killed) {
            reject(new YahooError('timeout', `Yahoo Finance did not respond within ${Math.round(timeoutMs / 1000)}s`));
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(stdout);
          } catch {
            reject(new YahooError('provider_error', err ? `yfinance bridge failed: ${err.message.split('\n')[0]}` : 'yfinance bridge returned invalid output'));
            return;
          }
          const e = (parsed as { error?: { code: YahooError['code']; message: string } }).error;
          if (e) reject(new YahooError(e.code, e.message));
          else resolve(parsed as T);
        });
      }),
  );
}

// --- symbol helpers ----------------------------------------------------------------------
export const toYahooSymbol = (symbol: string) => {
  const s = symbol.trim().toUpperCase();
  return /\.(NS|BO)$/.test(s) ? s : `${s}.NS`;
};
export const nseFromYahoo = (yahoo: string) => (yahoo.toUpperCase().endsWith('.NS') ? yahoo.slice(0, -3).toUpperCase() : null);

// --- payload types -----------------------------------------------------------------------
export interface YahooQuote {
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  marketTime: string | null;
  timing: 'end_of_day' | 'delayed' | 'realtime' | 'unknown';
  delayMinutes: number | null;
}

export interface YahooProfile {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  employees: number | null;
  quote: YahooQuote;
  fetchedAt: string;
}

export type YahooPeriod = { periodEnd: string } & Partial<Record<string, number>>;

export interface YahooFinancials {
  symbol: string;
  currency: string | null;
  annual: YahooPeriod[];
  quarterly: YahooPeriod[];
  /** Statement requests that failed (e.g. "cashflow_quarterly"); the rest are still returned. */
  missing?: string[];
  fetchedAt: string;
}

export type YahooHistory = { candles: DailyCandle[]; fetchedAt: string };
type Part<T> = T | { error: { code: YahooError['code']; message: string } };
export interface YahooBundle {
  symbol: string;
  /** Per-request provider time in ms: info, history, income_annual, balance_annual, ... */
  timingsMs: Record<string, number>;
  profile?: Part<YahooProfile>;
  history?: Part<YahooHistory>;
  financials?: Part<YahooFinancials>;
}

export const partError = <T extends object>(p: Part<T> | undefined): YahooError | null =>
  p && 'error' in p ? new YahooError(p.error.code, p.error.message) : null;

export const yahoo = {
  search: (q: string) => runYahoo<{ results: Array<{ symbol: string; name: string | null; exchange: string }> }>(['search', q], 45_000),
  profile: (symbol: string) => runYahoo<YahooProfile>(['profile', toYahooSymbol(symbol)], 45_000),
  history: (symbol: string, from: string, to: string) => runYahoo<YahooHistory>(['history', toYahooSymbol(symbol), from, to], 90_000),
  financials: (symbol: string) => runYahoo<YahooFinancials>(['financials', toYahooSymbol(symbol)], 120_000),
  /** Several datasets concurrently in one Python process; each part succeeds or fails independently. */
  bundle: (symbol: string, datasets: Array<'profile' | 'history' | 'financials'>, from: string, to: string) =>
    runYahoo<YahooBundle>(['bundle', toYahooSymbol(symbol), datasets.join(','), from, to], 120_000),
};

// --- provider contracts ----------------------------------------------------------------
const info = (description: string): ProviderInfo => ({ name: 'yfinance', isDemo: false, configured: yfinanceAvailable(), description });

function toRecord(p: YahooProfile): CompanyRecord {
  return {
    name: p.name ?? p.symbol,
    nseSymbol: nseFromYahoo(p.symbol),
    bseCode: null,
    isin: null,
    sector: p.sector,
    industry: p.industry,
    marketCapCategory: null,
    description: p.description,
    website: p.website,
    yahooSymbol: p.symbol,
    country: p.country,
    exchange: p.exchange,
    employees: p.employees,
    currency: p.currency,
  };
}

const unwrap = <T>(p: Promise<T>) =>
  p.catch((e: unknown) => {
    if (e instanceof YahooError && e.code === 'not_found') return null;
    if (e instanceof YahooError) throw new ProviderUnavailableError('yfinance', e.message);
    throw e;
  });

// Search results change rarely; cache them so typing in the search box does not hammer Yahoo.
const searchCache = new Map<string, { value: { results: Array<{ symbol: string; name: string | null; exchange: string }> } | null; expires: number }>();

export const yfinanceCompanyInfo: CompanyInfoProvider = {
  info: info('Yahoo Finance via yfinance (unofficial). NSE/BSE listings; quotes delayed ~15 min, stored as end-of-day.'),
  async search(query, limit) {
    const key = query.trim().toLowerCase();
    if (key.length < 2) return [];
    const hit = searchCache.get(key);
    const res = hit && hit.expires > Date.now() ? hit.value : await unwrap(yahoo.search(query));
    if (!hit || hit.expires <= Date.now()) searchCache.set(key, { value: res, expires: Date.now() + 10 * 60_000 });
    return (res?.results ?? []).slice(0, limit).map((r) => ({
      name: r.name ?? r.symbol,
      nseSymbol: nseFromYahoo(r.symbol),
      bseCode: null,
      isin: null,
      sector: null,
      industry: null,
      marketCapCategory: null,
      description: null,
      website: null,
      yahooSymbol: r.symbol,
      exchange: r.exchange,
    }));
  },
  async getBySymbol(symbol) {
    const p = await unwrap(yahoo.profile(symbol));
    return p ? toRecord(p) : null;
  },
};

export const yfinanceMarketData: MarketDataProvider = {
  info: info('Yahoo Finance daily OHLCV via yfinance (unofficial; delayed, stored as end-of-day).'),
  async getDailyHistory(symbol, fromDate, toDate) {
    // yfinance's `end` is exclusive.
    const end = new Date(`${toDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const res = await unwrap(yahoo.history(symbol, fromDate, end.toISOString().slice(0, 10)));
    return res?.candles ?? [];
  },
};
