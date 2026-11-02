/**
 * Company data sync from Yahoo Finance (yfinance).
 *
 * Datasets and freshness windows (refetched only when stale, or on manual refresh):
 *   profile    – company profile + latest quote metadata   24 h
 *   history    – 2 years of daily OHLCV (end-of-day)        6 h
 *   financials – annual + quarterly statements              12 h
 *
 * Stale datasets are fetched together in one concurrent provider call (see yf_provider.py
 * `bundle`), and written in parallel.
 *
 * When real data arrives for a company that previously only had demo fixtures, the demo rows
 * for that dataset are removed in the same transaction so live and demonstration data never mix.
 * Statement amounts keep their reporting currency (INR in crore, others in millions); FINN
 * never converts currencies.
 */
import { and, asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { domainFromWebsite } from './logos.js';
import { db } from '../db/client.js';
import {
  companies,
  dataSyncs,
  financialStatements,
  marketPrices,
  priceCandles,
  tradingVolumes,
} from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import {
  YahooError,
  nseFromYahoo,
  partError,
  toYahooSymbol,
  yahoo,
  type YahooBundle,
  type YahooFinancials,
  type YahooHistory,
  type YahooPeriod,
  type YahooProfile,
} from '../providers/adapters/yfinance.js';
import { liveFinancials } from '../providers/registry.js';
import { upsertSourceDocument } from './documents.js';
import { computeVolumeStats, pctChange } from './market.js';

type Dataset = 'profile' | 'history' | 'financials';
const TTL_MS: Record<Dataset, number> = { profile: 24 * 3600_000, history: 6 * 3600_000, financials: 12 * 3600_000 };
const PROVIDER = 'yfinance';

export interface SyncResult {
  dataset: Dataset;
  status: 'fetched' | 'cached' | 'failed' | 'skipped';
  fetchedAt: string | null;
  detail?: string;
}

function yahooSymbolFor(c: typeof companies.$inferSelect): string | null {
  if (c.yahooSymbol) return c.yahooSymbol;
  if (c.nseSymbol) return toYahooSymbol(c.nseSymbol);
  return null;
}

async function lastSync(companyId: string, dataset: Dataset) {
  const [row] = await db
    .select()
    .from(dataSyncs)
    .where(and(eq(dataSyncs.companyId, companyId), eq(dataSyncs.dataset, dataset), eq(dataSyncs.provider, PROVIDER)));
  return row ?? null;
}

async function recordSync(companyId: string, dataset: Dataset, status: 'ok' | 'failed', error?: string) {
  const values = { companyId, dataset, provider: PROVIDER, status, fetchedAt: new Date(), error: error ?? null };
  await db.insert(dataSyncs).values(values).onConflictDoUpdate({ target: [dataSyncs.companyId, dataSyncs.dataset, dataSyncs.provider], set: values });
}

const yahooUrl = (symbol: string, page = '') => `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}${page}`;

// ---------------------------------------------------------------------------
// Profile + quote
// ---------------------------------------------------------------------------

async function applyProfile(companyId: string, p: YahooProfile) {
  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({
        name: p.name ?? undefined,
        sector: p.sector,
        industry: p.industry,
        website: p.website,
        websiteDomain: domainFromWebsite(p.website),
        description: p.description,
        country: p.country,
        exchange: p.exchange,
        employees: p.employees,
        currency: p.currency,
        yahooSymbol: p.symbol,
        isDemo: false,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));
    await upsertSourceDocument(
      {
        title: `Yahoo Finance company profile — ${p.symbol}`,
        url: yahooUrl(p.symbol, '/profile'),
        documentType: 'other',
        publishedAt: p.fetchedAt.slice(0, 10),
        periodLabel: null,
        excerpt: 'Retrieved via yfinance (unofficial Yahoo Finance interface).',
      },
      { companyId, provider: PROVIDER, isDemo: false },
      tx,
    );
  });
}

async function applyQuoteMetadata(companyId: string, p: YahooProfile) {
  const q = p.quote;
  await db
    .update(marketPrices)
    .set({
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      averageVolume: q.averageVolume,
      marketCap: q.marketCap,
      enterpriseValue: q.enterpriseValue,
      currency: p.currency ?? 'INR',
      quoteTiming: q.timing === 'realtime' ? 'realtime' : q.timing === 'delayed' ? 'delayed' : 'end_of_day',
      delayMinutes: q.delayMinutes,
      updatedAt: new Date(),
    })
    .where(and(eq(marketPrices.companyId, companyId), eq(marketPrices.isDemo, false)));
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

async function applyHistory(companyId: string, candles: Array<{ tradeDate: string; open: number; high: number; low: number; close: number; volume: number }>) {
  if (candles.length < 2) throw new YahooError('not_found', 'No price history returned');
  const stats = computeVolumeStats(candles.map((c) => ({ tradeDate: c.tradeDate, volume: c.volume })));
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  await db.transaction(async (tx) => {
    // Replace demonstration series entirely: real and synthetic prices must not interleave.
    await tx.delete(priceCandles).where(and(eq(priceCandles.companyId, companyId), eq(priceCandles.isDemo, true)));
    await tx.delete(tradingVolumes).where(and(eq(tradingVolumes.companyId, companyId), eq(tradingVolumes.isDemo, true)));
    await tx.delete(marketPrices).where(and(eq(marketPrices.companyId, companyId), eq(marketPrices.isDemo, true)));
    for (let i = 0; i < candles.length; i += 500) {
      const chunk = candles.slice(i, i + 500);
      await tx
        .insert(priceCandles)
        .values(chunk.map((c) => ({ companyId, interval: '1d', ...c, provider: PROVIDER, isDemo: false })))
        .onConflictDoUpdate({
          target: [priceCandles.companyId, priceCandles.interval, priceCandles.tradeDate],
          set: { open: sql`excluded.open`, high: sql`excluded.high`, low: sql`excluded.low`, close: sql`excluded.close`, volume: sql`excluded.volume`, provider: sql`excluded.provider`, isDemo: sql`false` },
        });
      const vchunk = stats.slice(i, i + 500);
      await tx
        .insert(tradingVolumes)
        .values(vchunk.map((s) => ({ companyId, tradeDate: s.tradeDate, volume: s.volume, avgVolume20d: s.avgVolume20d, volumeRatio: s.volumeRatio, isDemo: false })))
        .onConflictDoUpdate({
          target: [tradingVolumes.companyId, tradingVolumes.tradeDate],
          set: { volume: sql`excluded.volume`, avgVolume20d: sql`excluded.avg_volume_20d`, volumeRatio: sql`excluded.volume_ratio`, isDemo: sql`false` },
        });
    }
    const row = {
      companyId,
      tradeDate: last.tradeDate,
      lastPrice: last.close,
      previousClose: prev.close,
      changePercent: pctChange(last.close, prev.close),
      provider: PROVIDER,
      isDemo: false,
      quoteTiming: 'end_of_day',
      asOf: new Date(`${last.tradeDate}T10:00:00Z`), // NSE close 15:30 IST
      updatedAt: new Date(),
    };
    await tx.insert(marketPrices).values(row).onConflictDoUpdate({ target: marketPrices.companyId, set: row });
  });
}

// ---------------------------------------------------------------------------
// Financial statements
// ---------------------------------------------------------------------------

/** Indian fiscal labels: period ending Mar 2026 → FY26; quarter ending Sep 2026 → Q2 FY27. */
export function periodLabel(periodEnd: string, type: 'annual' | 'quarterly'): string {
  const [y, m] = periodEnd.split('-').map(Number);
  const fy = m > 3 ? y + 1 : y;
  const fyLabel = `FY${String(fy).slice(2)}`;
  if (type === 'annual') return fyLabel;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 ? 3 : 4;
  return `Q${q} ${fyLabel}`;
}

const AMOUNT_FIELDS = [
  'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses', 'operatingIncome', 'ebitda', 'ebit', 'interestExpense', 'pbt',
  'taxExpense', 'pat', 'depreciation', 'totalAssets', 'currentAssets', 'cashAndEquivalents', 'receivables', 'inventory',
  'totalLiabilities', 'currentLiabilities', 'longTermDebt', 'shortTermDebt', 'borrowings', 'totalEquity', 'retainedEarnings',
  'payables', 'operatingCashFlow', 'investingCashFlow', 'financingCashFlow', 'freeCashFlow',
] as const;

export function toStatementRow(p: YahooPeriod, currency: string, type: 'annual' | 'quarterly') {
  const scale = currency === 'INR' ? 1e7 : 1e6;
  const row: Record<string, number | null> = {};
  for (const f of AMOUNT_FIELDS) row[f] = typeof p[f] === 'number' ? Math.round(((p[f] as number) / scale) * 100) / 100 : null;
  // Yahoo reports capital expenditure as a negative cash flow; FINN stores capex as a positive outlay.
  row.capex = typeof p.capex === 'number' ? Math.round((Math.abs(p.capex) / scale) * 100) / 100 : null;
  row.eps = typeof p.eps === 'number' ? p.eps : null;
  // Capital employed = total assets − current liabilities (needed for ROCE).
  row.capitalEmployed = row.totalAssets !== null && row.currentLiabilities !== null ? Math.round((row.totalAssets - row.currentLiabilities) * 100) / 100 : null;
  return { ...row, periodType: type, periodLabel: periodLabel(p.periodEnd, type), periodEnd: p.periodEnd, currency, unit: currency === 'INR' ? 'crore' : 'million' };
}

async function applyFinancials(companyId: string, symbol: string, payload: YahooFinancials) {
  const currency = payload.currency ?? 'INR';
  const rows = [...payload.annual.map((p) => toStatementRow(p, currency, 'annual')), ...payload.quarterly.map((p) => toStatementRow(p, currency, 'quarterly'))];
  if (rows.length === 0) throw new YahooError('not_found', 'Yahoo Finance returned no financial statements for this company');
  await db.transaction(async (tx) => {
    await tx.delete(financialStatements).where(and(eq(financialStatements.companyId, companyId), eq(financialStatements.isDemo, true)));
    const annualDoc = await upsertSourceDocument(
      { title: `Yahoo Finance annual financial statements — ${symbol}`, url: yahooUrl(symbol, '/financials'), documentType: 'other', publishedAt: payload.fetchedAt.slice(0, 10), periodLabel: 'Annual', excerpt: 'Income statement, balance sheet and cash flow as reported by Yahoo Finance (via yfinance).' },
      { companyId, provider: PROVIDER, isDemo: false },
      tx,
    );
    const quarterlyDoc = await upsertSourceDocument(
      { title: `Yahoo Finance quarterly financial statements — ${symbol}`, url: yahooUrl(symbol, '/financials'), documentType: 'other', publishedAt: payload.fetchedAt.slice(0, 10), periodLabel: 'Quarterly', excerpt: 'Quarterly statements as reported by Yahoo Finance (via yfinance). Quarterly balance sheet and cash flow coverage is often partial.' },
      { companyId, provider: PROVIDER, isDemo: false },
      tx,
    );
    const values = rows.map(
      (r) =>
        ({
          companyId,
          ...(r as object),
          sourceDocumentId: r.periodType === 'annual' ? annualDoc : quarterlyDoc,
          provider: PROVIDER,
          isDemo: false,
          fetchedAt: new Date(payload.fetchedAt),
        }) as typeof financialStatements.$inferInsert,
    );
    // One multi-row upsert instead of a round trip per period.
    const columns = getTableColumns(financialStatements);
    const key = new Set(['companyId', 'periodType', 'periodEnd']);
    const set = Object.fromEntries(
      Object.keys(values[0]).filter((k) => !key.has(k)).map((k) => [k, sql.raw(`excluded."${columns[k as keyof typeof columns].name}"`)]),
    );
    await tx
      .insert(financialStatements)
      .values(values)
      .onConflictDoUpdate({ target: [financialStatements.companyId, financialStatements.periodType, financialStatements.periodEnd], set });
  });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DATASETS: Dataset[] = ['history', 'profile', 'financials'];
const historyWindow = () => ({
  from: new Date(Date.now() - 2 * 366 * 86_400_000).toISOString().slice(0, 10),
  to: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
});

/** Stage timings for one sync, for instrumentation (no symbols' data, no user data). */
export interface SyncTimings {
  /** Wall time of the provider fetch (all stale datasets, concurrently). */
  fetchMs: number;
  /** Provider time per request: info, history, income_annual, balance_annual, cashflow_annual, ... */
  providerMs: Record<string, number>;
  /** Database write time per dataset. */
  writeMs: Partial<Record<Dataset, number>>;
}

const failureDetail = (err: unknown) =>
  err instanceof YahooError && err.code === 'rate_limited' ? 'Yahoo Finance rate limit reached; showing previously stored data.' : (err as Error).message;

/**
 * Writes a fetched bundle. History before profile (the profile's quote metadata attaches to the
 * real market_prices row); financials in parallel with both. One dataset failing never blocks
 * the others.
 */
async function applyBundle(company: typeof companies.$inferSelect, symbol: string, bundle: YahooBundle, datasets: Dataset[], lasts: Map<Dataset, Date | null>) {
  const results: SyncResult[] = [];
  const writeMs: SyncTimings['writeMs'] = {};
  const apply = async (dataset: Dataset, write: () => Promise<unknown>) => {
    const started = performance.now();
    try {
      await write();
      await recordSync(company.id, dataset, 'ok');
      results.push({ dataset, status: 'fetched', fetchedAt: new Date().toISOString() });
    } catch (err) {
      await recordSync(company.id, dataset, 'failed', (err as Error).message.slice(0, 500));
      results.push({ dataset, status: 'failed', fetchedAt: lasts.get(dataset)?.toISOString() ?? null, detail: failureDetail(err) });
    }
    writeMs[dataset] = Math.round(performance.now() - started);
  };
  const part = <T extends object>(p: T | { error: unknown } | undefined): T => {
    const e = partError(p as Parameters<typeof partError>[0]);
    if (e) throw e;
    if (!p) throw new YahooError('provider_error', 'No data returned');
    return p as T;
  };
  await Promise.all([
    (async () => {
      if (datasets.includes('history')) await apply('history', () => applyHistory(company.id, part<YahooHistory>(bundle.history).candles));
      if (datasets.includes('profile'))
        await apply('profile', async () => {
          const p = part<YahooProfile>(bundle.profile);
          await applyProfile(company.id, p);
          await applyQuoteMetadata(company.id, p);
        });
    })(),
    datasets.includes('financials') ? apply('financials', () => applyFinancials(company.id, symbol, part<YahooFinancials>(bundle.financials))) : null,
  ]);
  return { results, writeMs };
}

/**
 * Fetch whatever is stale (or everything when `force`) in one concurrent provider call, then
 * write the datasets in parallel. Fresh datasets are served from Neon without touching Yahoo.
 */
export async function syncCompany(companyId: string, opts: { force?: boolean; datasets?: Dataset[] } = {}) {
  if (!liveFinancials) return { provider: 'demo', results: [] as SyncResult[], timings: null as SyncTimings | null };
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) throw ApiError.notFound('Company not found');
  const wanted = DATASETS.filter((d) => (opts.datasets ?? DATASETS).includes(d));
  const symbol = yahooSymbolFor(company);
  if (!symbol) return { provider: PROVIDER, results: wanted.map((dataset): SyncResult => ({ dataset, status: 'skipped', fetchedAt: null, detail: 'No Yahoo Finance symbol for this company' })), timings: null };

  const lastRows = await Promise.all(wanted.map((d) => lastSync(company.id, d)));
  const lasts = new Map(wanted.map((d, i) => [d, lastRows[i]?.fetchedAt ?? null] as const));
  const results: SyncResult[] = [];
  const stale: Dataset[] = [];
  wanted.forEach((d, i) => {
    const last = lastRows[i];
    if (!opts.force && last?.status === 'ok' && Date.now() - last.fetchedAt.getTime() < TTL_MS[d]) results.push({ dataset: d, status: 'cached', fetchedAt: last.fetchedAt.toISOString() });
    else stale.push(d);
  });
  if (stale.length === 0) return { provider: PROVIDER, results, timings: { fetchMs: 0, providerMs: {}, writeMs: {} } as SyncTimings };

  const started = performance.now();
  let bundle: YahooBundle;
  try {
    const { from, to } = historyWindow();
    bundle = await yahoo.bundle(symbol, stale, from, to);
  } catch (err) {
    // The whole provider call failed (timeout, bridge crash): every stale dataset keeps its stored data.
    await Promise.all(stale.map((d) => recordSync(company.id, d, 'failed', (err as Error).message.slice(0, 500))));
    for (const d of stale) results.push({ dataset: d, status: 'failed', fetchedAt: lasts.get(d)?.toISOString() ?? null, detail: failureDetail(err) });
    return { provider: PROVIDER, results, timings: { fetchMs: Math.round(performance.now() - started), providerMs: {}, writeMs: {} } as SyncTimings };
  }
  const fetchMs = Math.round(performance.now() - started);
  const applied = await applyBundle(company, symbol, bundle, stale, lasts);
  results.push(...applied.results);
  results.sort((a, b) => DATASETS.indexOf(a.dataset) - DATASETS.indexOf(b.dataset));
  return { provider: PROVIDER, results, timings: { fetchMs, providerMs: bundle.timingsMs, writeMs: applied.writeMs } as SyncTimings };
}

export async function freshness(companyId: string) {
  const rows = await db.select().from(dataSyncs).where(eq(dataSyncs.companyId, companyId)).orderBy(asc(dataSyncs.dataset));
  return rows.map((r) => ({ dataset: r.dataset, provider: r.provider, status: r.status, fetchedAt: r.fetchedAt, error: r.status === 'failed' ? r.error : null }));
}

/**
 * Resolve a Yahoo symbol to a FINN company, creating it from the live profile when new.
 * Never creates a company without a validated Yahoo profile. A new company's profile, history
 * and statements are fetched in a single concurrent call.
 */
export async function importCompany(yahooSymbolInput: string) {
  if (!liveFinancials) throw ApiError.unavailable('Live company data is not configured (yfinance bridge unavailable).');
  const symbol = toYahooSymbol(yahooSymbolInput);
  const nse = nseFromYahoo(symbol);
  // "ITC.BO" is the BSE line of NSE "ITC": resolve it to the existing company, never a duplicate.
  const bseAlias = symbol.endsWith('.BO') && !/^\d+\.BO$/.test(symbol) ? symbol.slice(0, -3) : null;
  const existing = await db.query.companies.findFirst({
    where: sql`${companies.yahooSymbol} = ${symbol}
      or (${nse ?? null}::text is not null and ${companies.nseSymbol} = ${nse ?? null})
      or (${bseAlias}::text is not null and (${companies.nseSymbol} = ${bseAlias} or ${companies.yahooSymbol} = ${`${bseAlias}.NS`}))`,
  });
  if (existing) {
    await syncCompany(existing.id);
    return { company: (await db.query.companies.findFirst({ where: eq(companies.id, existing.id) }))!, created: false };
  }
  let bundle: YahooBundle;
  try {
    const { from, to } = historyWindow();
    bundle = await yahoo.bundle(symbol, DATASETS, from, to);
    const e = partError(bundle.profile);
    if (e) throw e;
  } catch (err) {
    if (err instanceof YahooError && err.code === 'not_found') throw ApiError.notFound(`“${yahooSymbolInput}” could not be resolved to a listed company on Yahoo Finance.`);
    if (err instanceof YahooError && err.code === 'rate_limited') throw new ApiError(429, 'RATE_LIMITED', 'Yahoo Finance is rate-limiting requests. Please try again shortly.');
    throw ApiError.unavailable(`Yahoo Finance request failed: ${(err as Error).message}`);
  }
  const profile = bundle.profile as YahooProfile;
  const [created] = await db
    .insert(companies)
    .values({
      name: profile.name ?? symbol,
      nseSymbol: nse,
      yahooSymbol: symbol,
      sector: profile.sector,
      industry: profile.industry,
      website: profile.website,
      websiteDomain: domainFromWebsite(profile.website),
      description: profile.description,
      country: profile.country,
      exchange: profile.exchange,
      employees: profile.employees,
      currency: profile.currency,
      isDemo: false,
    })
    .onConflictDoNothing()
    .returning();
  const company = created ?? (await db.query.companies.findFirst({ where: eq(companies.yahooSymbol, symbol) }));
  if (!company) throw ApiError.conflict('Company could not be created');
  await applyBundle(company, symbol, bundle, DATASETS, new Map());
  return { company: (await db.query.companies.findFirst({ where: eq(companies.id, company.id) }))!, created: Boolean(created) };
}
