/**
 * Market-data ingestion and read models.
 *
 * Volume ratio = today's volume / mean volume of the PREVIOUS 20 sessions (today excluded,
 * so a spike does not dilute its own baseline).
 */
import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, marketPrices, priceCandles, tradingVolumes } from '../db/schema.js';
import { providers } from '../providers/registry.js';
import type { DailyCandle } from '../providers/types.js';

export const VOLUME_LOOKBACK = 20;

export function computeVolumeStats(candles: Array<{ tradeDate: string; volume: number }>) {
  return candles.map((c, i) => {
    const prior = candles.slice(Math.max(0, i - VOLUME_LOOKBACK), i);
    if (prior.length < VOLUME_LOOKBACK) return { ...c, avgVolume20d: null, volumeRatio: null };
    const avg = prior.reduce((s, p) => s + p.volume, 0) / prior.length;
    return { ...c, avgVolume20d: Math.round(avg * 100) / 100, volumeRatio: avg > 0 ? Math.round((c.volume / avg) * 100) / 100 : null };
  });
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 10_000) / 100;
}

function isoDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Fetches new daily candles for each company and refreshes derived tables. */
export async function ingestMarketData(companyIds?: string[]) {
  const provider = providers.marketData;
  const list = await db
    .select({ id: companies.id, nseSymbol: companies.nseSymbol, bseCode: companies.bseCode })
    .from(companies)
    .where(companyIds?.length ? inArray(companies.id, companyIds) : undefined);

  const today = new Date().toISOString().slice(0, 10);
  let candlesWritten = 0;
  let quotesUpdated = 0;
  const failures: string[] = [];

  for (const company of list) {
    const symbol = company.nseSymbol ?? company.bseCode;
    if (!symbol) continue;
    try {
      const [last] = await db
        .select({ tradeDate: priceCandles.tradeDate })
        .from(priceCandles)
        .where(and(eq(priceCandles.companyId, company.id), eq(priceCandles.interval, '1d')))
        .orderBy(desc(priceCandles.tradeDate))
        .limit(1);
      // Re-fetch a small overlap so late corrections from the provider are picked up.
      const from = last ? isoDaysAgo(5, new Date(`${last.tradeDate}T00:00:00Z`)) : isoDaysAgo(800);
      const fetched: DailyCandle[] = await provider.getDailyHistory(symbol, from, today);
      if (fetched.length === 0) continue;

      await db
        .insert(priceCandles)
        .values(
          fetched.map((c) => ({
            companyId: company.id,
            interval: '1d',
            tradeDate: c.tradeDate,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            provider: provider.info.name,
            isDemo: provider.info.isDemo,
          })),
        )
        .onConflictDoUpdate({
          target: [priceCandles.companyId, priceCandles.interval, priceCandles.tradeDate],
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            volume: sql`excluded.volume`,
            provider: sql`excluded.provider`,
            isDemo: sql`excluded.is_demo`,
          },
        });
      candlesWritten += fetched.length;

      // Recompute volume stats over the trailing window that the new candles affect.
      const window = await db
        .select({ tradeDate: priceCandles.tradeDate, volume: priceCandles.volume, close: priceCandles.close })
        .from(priceCandles)
        .where(and(eq(priceCandles.companyId, company.id), eq(priceCandles.interval, '1d'), gte(priceCandles.tradeDate, isoDaysAgo(VOLUME_LOOKBACK * 2 + 10, new Date(`${fetched[0].tradeDate}T00:00:00Z`)))))
        .orderBy(asc(priceCandles.tradeDate));
      const stats = computeVolumeStats(window).filter((s) => s.tradeDate >= fetched[0].tradeDate);
      if (stats.length) {
        await db
          .insert(tradingVolumes)
          .values(
            stats.map((s) => ({
              companyId: company.id,
              tradeDate: s.tradeDate,
              volume: s.volume,
              avgVolume20d: s.avgVolume20d,
              volumeRatio: s.volumeRatio,
              isDemo: provider.info.isDemo,
            })),
          )
          .onConflictDoUpdate({
            target: [tradingVolumes.companyId, tradingVolumes.tradeDate],
            set: { volume: sql`excluded.volume`, avgVolume20d: sql`excluded.avg_volume_20d`, volumeRatio: sql`excluded.volume_ratio`, isDemo: sql`excluded.is_demo` },
          });
      }

      const latest = window[window.length - 1];
      const previous = window[window.length - 2];
      if (latest && previous) {
        const row = {
          companyId: company.id,
          quoteTiming: provider.info.isDemo ? 'synthetic' : 'end_of_day',
          tradeDate: latest.tradeDate,
          lastPrice: latest.close,
          previousClose: previous.close,
          changePercent: pctChange(latest.close, previous.close),
          provider: provider.info.name,
          isDemo: provider.info.isDemo,
          asOf: new Date(`${latest.tradeDate}T10:00:00Z`), // NSE close 15:30 IST
          updatedAt: new Date(),
        };
        await db.insert(marketPrices).values(row).onConflictDoUpdate({ target: marketPrices.companyId, set: row });
        quotesUpdated++;
      }
    } catch (err) {
      failures.push(`${symbol}: ${(err as Error).message}`);
    }
  }
  return { provider: provider.info.name, companies: list.length, candlesWritten, quotesUpdated, failures };
}

export type Range = '1W' | '1M' | '3M' | '6M' | '1Y' | 'MAX';
const RANGE_DAYS: Record<Range, number> = { '1W': 7, '1M': 31, '3M': 92, '6M': 183, '1Y': 366, MAX: 5000 };

export async function getHistory(companyId: string, range: Range) {
  const [last] = await db
    .select({ tradeDate: priceCandles.tradeDate })
    .from(priceCandles)
    .where(eq(priceCandles.companyId, companyId))
    .orderBy(desc(priceCandles.tradeDate))
    .limit(1);
  if (!last) return { candles: [], isDemo: false, provider: null as string | null };
  const from = isoDaysAgo(RANGE_DAYS[range], new Date(`${last.tradeDate}T00:00:00Z`));
  // Fetch 200 extra sessions before the window so moving averages are defined at its start.
  const warmFrom = isoDaysAgo(RANGE_DAYS[range] + 300, new Date(`${last.tradeDate}T00:00:00Z`));
  const rows = await db
    .select({
      tradeDate: priceCandles.tradeDate,
      open: priceCandles.open,
      high: priceCandles.high,
      low: priceCandles.low,
      close: priceCandles.close,
      volume: priceCandles.volume,
      provider: priceCandles.provider,
      isDemo: priceCandles.isDemo,
      volumeRatio: tradingVolumes.volumeRatio,
      avgVolume20d: tradingVolumes.avgVolume20d,
    })
    .from(priceCandles)
    .leftJoin(tradingVolumes, and(eq(tradingVolumes.companyId, priceCandles.companyId), eq(tradingVolumes.tradeDate, priceCandles.tradeDate)))
    .where(and(eq(priceCandles.companyId, companyId), eq(priceCandles.interval, '1d'), gte(priceCandles.tradeDate, warmFrom)))
    .orderBy(asc(priceCandles.tradeDate));

  const sma = (i: number, n: number) => {
    if (i + 1 < n) return null;
    let s = 0;
    for (let k = i - n + 1; k <= i; k++) s += rows[k].close;
    return Math.round((s / n) * 100) / 100;
  };
  const candles = rows
    .map((r, i) => ({
      tradeDate: r.tradeDate,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
      volumeRatio: r.volumeRatio,
      avgVolume20d: r.avgVolume20d,
      changePercent: i > 0 ? pctChange(r.close, rows[i - 1].close) : null,
      sma20: sma(i, 20),
      sma50: sma(i, 50),
      sma200: sma(i, 200),
    }))
    .filter((c) => c.tradeDate >= from);
  return { candles, isDemo: rows.some((r) => r.isDemo), provider: rows[rows.length - 1]?.provider ?? null };
}

/** Latest quote, volume and a 30-session sparkline for a set of companies. */
export async function getQuotes(companyIds: string[]) {
  if (companyIds.length === 0) return new Map<string, QuoteSummary>();
  const quotes = await db
    .select({
      companyId: marketPrices.companyId,
      tradeDate: marketPrices.tradeDate,
      lastPrice: marketPrices.lastPrice,
      previousClose: marketPrices.previousClose,
      changePercent: marketPrices.changePercent,
      asOf: marketPrices.asOf,
      provider: marketPrices.provider,
      isDemo: marketPrices.isDemo,
      quoteTiming: marketPrices.quoteTiming,
      delayMinutes: marketPrices.delayMinutes,
      currency: marketPrices.currency,
      dayHigh: marketPrices.dayHigh,
      dayLow: marketPrices.dayLow,
      fiftyTwoWeekHigh: marketPrices.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: marketPrices.fiftyTwoWeekLow,
      averageVolume: marketPrices.averageVolume,
      marketCap: marketPrices.marketCap,
      enterpriseValue: marketPrices.enterpriseValue,
      updatedAt: marketPrices.updatedAt,
      volume: tradingVolumes.volume,
      avgVolume20d: tradingVolumes.avgVolume20d,
      volumeRatio: tradingVolumes.volumeRatio,
    })
    .from(marketPrices)
    .leftJoin(tradingVolumes, and(eq(tradingVolumes.companyId, marketPrices.companyId), eq(tradingVolumes.tradeDate, marketPrices.tradeDate)))
    .where(inArray(marketPrices.companyId, companyIds));

  const sparkRows = await db.execute<{ company_id: string; closes: number[] }>(sql`
    select company_id, array_agg(close::float8 order by trade_date) as closes
    from (
      select company_id, trade_date, close,
             row_number() over (partition by company_id order by trade_date desc) as rn
      from price_candles
      where interval = '1d' and company_id = any(${`{${companyIds.join(',')}}`}::uuid[])
    ) t
    where rn <= 30
    group by company_id
  `);
  const sparks = new Map(sparkRows.rows.map((r) => [r.company_id, r.closes]));
  return new Map<string, QuoteSummary>(quotes.map((q) => [q.companyId, { ...q, sparkline: sparks.get(q.companyId) ?? [] }]));
}

export interface QuoteSummary {
  companyId: string;
  tradeDate: string;
  lastPrice: number;
  previousClose: number;
  changePercent: number;
  asOf: Date;
  provider: string;
  isDemo: boolean;
  quoteTiming: string;
  delayMinutes: number | null;
  currency: string;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  updatedAt: Date;
  volume: number | null;
  avgVolume20d: number | null;
  volumeRatio: number | null;
  sparkline: number[];
}
