/**
 * Demonstration provider. Serves the hand-written FINN fixtures so the app runs without
 * licensed data. Everything it returns is flagged `isDemo` and surfaced as
 * "Demo data" in the UI.
 *
 *  - Companies, announcements and quarterly results come from ../../content/demo.
 *  - Fixture "source URLs" pointed at exchange PDFs that do not exist, so documents are
 *    emitted with `url: null` and an explicit demonstration excerpt instead.
 *  - Daily price history is a deterministic synthetic series (seeded by symbol) that ends
 *    at each fixture's stated close, daily change and volume ratio on DEMO_AS_OF.
 */
import { MOCK_COMPANIES } from '../../content/demo/companies.js';
import { MOCK_ANNOUNCEMENTS } from '../../content/demo/announcements.js';
import type {
  AnnouncementRecord,
  AnnouncementsProvider,
  CompanyInfoProvider,
  CompanyRecord,
  DailyCandle,
  FinancialStatementRecord,
  FinancialsProvider,
  MarketDataProvider,
  ProviderInfo,
} from '../types.js';

export const DEMO_AS_OF = '2026-10-28';
export const DEMO_NOTICE = 'Demonstration fixture prepared for the FINN prototype. Not an exchange filing.';

const info = (description: string): ProviderInfo => ({ name: 'demo', isDemo: true, configured: true, description });

const stripSuffix = (ticker: string) => ticker.replace(/\.(NS|BO)$/i, '').toUpperCase();

function toCompanyRecord(c: (typeof MOCK_COMPANIES)[number]): CompanyRecord {
  return {
    name: c.name,
    nseSymbol: stripSuffix(c.ticker),
    bseCode: c.bseCode || null,
    isin: null, // fixtures carry no ISINs; never invent identifiers
    sector: c.sector,
    industry: null,
    marketCapCategory: c.marketCapCategory,
    description: null,
    website: c.irUrl || null,
  };
}

export const demoCompanyInfo: CompanyInfoProvider = {
  info: info('FINN demonstration universe (22 NSE-listed companies from the prototype fixtures).'),
  async search(query, limit) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_COMPANIES.filter(
      (c) =>
        c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.bseCode === q.trim(),
    )
      .slice(0, limit)
      .map(toCompanyRecord);
  },
  async getBySymbol(symbol) {
    const s = stripSuffix(symbol);
    const c = MOCK_COMPANIES.find((x) => stripSuffix(x.ticker) === s || x.bseCode === symbol.trim());
    return c ? toCompanyRecord(c) : null;
  },
};

// --- deterministic synthetic series -----------------------------------------------------

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Weekdays only; exchange holidays are not modelled in demo data. */
export function tradingDaysBack(endIso: string, count: number): string[] {
  const days: string[] = [];
  const d = new Date(`${endIso}T00:00:00Z`);
  while (days.length < count) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return days.reverse();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const BASE_VOLUME: Record<string, number> = { 'Large Cap': 6_500_000, 'Mid Cap': 1_400_000, 'Small Cap': 450_000 };

const seriesCache = new Map<string, DailyCandle[]>();

function syntheticSeries(ticker: string): DailyCandle[] {
  const cached = seriesCache.get(ticker);
  if (cached) return cached;
  const c = MOCK_COMPANIES.find((x) => x.ticker === ticker);
  if (!c) return [];

  const days = tradingDaysBack(DEMO_AS_OF, 520);
  const rand = mulberry32(seedFrom(ticker));
  const n = days.length;
  const closes = new Array<number>(n);
  closes[n - 1] = c.currentPrice;
  closes[n - 2] = c.currentPrice / (1 + c.changePercent / 100);
  const dailyVol = c.marketCapCategory === 'Small Cap' ? 0.022 : c.marketCapCategory === 'Mid Cap' ? 0.017 : 0.012;
  for (let i = n - 3; i >= 0; i--) {
    const r = 0.0004 + dailyVol * gaussian(rand);
    closes[i] = Math.max(1, closes[i + 1] / (1 + r));
  }

  const base = BASE_VOLUME[c.marketCapCategory] ?? 1_000_000;
  const volumes = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) {
    volumes[i] = Math.round(base * (0.7 + 0.6 * rand()) * (c.currentPrice > 3000 ? 0.4 : 1));
  }
  const prior20 = volumes.slice(n - 21, n - 1);
  const avg20 = prior20.reduce((a, b) => a + b, 0) / prior20.length;
  volumes[n - 1] = Math.round(avg20 * c.volumeRatio);

  const candles = days.map((tradeDate, i) => {
    const close = closes[i];
    const open = i === 0 ? close : closes[i - 1] * (1 + 0.003 * gaussian(rand));
    const spread = Math.abs(gaussian(rand)) * dailyVol * 0.6 * close;
    return {
      tradeDate,
      open: round2(open),
      high: round2(Math.max(open, close) + spread),
      low: round2(Math.max(0.05, Math.min(open, close) - spread)),
      close: round2(close),
      volume: volumes[i],
    };
  });
  seriesCache.set(ticker, candles);
  return candles;
}

function tickerFor(symbol: string): string | undefined {
  const s = stripSuffix(symbol);
  return MOCK_COMPANIES.find((c) => stripSuffix(c.ticker) === s)?.ticker;
}

export const demoMarketData: MarketDataProvider = {
  info: info(`Synthetic demonstration price series ending ${DEMO_AS_OF}; shaped to the fixture close, change and volume ratio.`),
  async getDailyHistory(symbol, fromDate, toDate) {
    const t = tickerFor(symbol);
    if (!t) return [];
    return syntheticSeries(t).filter((c) => c.tradeDate >= fromDate && c.tradeDate <= toDate);
  },
};

// --- announcements & financials ----------------------------------------------------------

function quarterEnd(label: string, fallbackIso: string): string {
  // Fixture labels look like "Q2 FY25"; Indian FY quarters end Jun/Sep/Dec/Mar.
  const m = /Q([1-4])\s*FY(\d{2})/i.exec(label);
  if (!m) return fallbackIso.slice(0, 10);
  const q = Number(m[1]);
  const fy = 2000 + Number(m[2]);
  return [`${fy - 1}-06-30`, `${fy - 1}-09-30`, `${fy - 1}-12-31`, `${fy}-03-31`][q - 1];
}

export const demoAnnouncements: AnnouncementsProvider = {
  info: info('Hand-written demonstration announcements from the FINN prototype fixtures.'),
  async listAnnouncements(symbols, since) {
    const wanted = new Set(symbols.map(stripSuffix));
    return MOCK_ANNOUNCEMENTS.filter((a) => wanted.has(stripSuffix(a.ticker)) && new Date(a.rawDate) >= since).map(
      (a): AnnouncementRecord => ({
        externalId: a.id,
        symbol: stripSuffix(a.ticker),
        rawCategory: a.category,
        title: a.title,
        summary: a.oneLineTakeaway,
        announcedAt: a.rawDate,
        exchange: 'NSE',
        document: {
          title: a.sourceDocTitle,
          url: null,
          documentType: a.category === 'results' ? 'quarterly_results' : 'exchange_filing',
          publishedAt: a.rawDate,
          periodLabel: a.quarterlyResults?.quarter ?? null,
          excerpt: `${DEMO_NOTICE} ${a.whyItMatters}`,
        },
        quarterlyResults: a.quarterlyResults
          ? {
              periodLabel: a.quarterlyResults.quarter,
              periodEnd: quarterEnd(a.quarterlyResults.quarter, a.rawDate),
              revenue: a.quarterlyResults.revenue,
              ebitda: a.quarterlyResults.ebitda,
              pbt: a.quarterlyResults.pbt,
              pat: a.quarterlyResults.pat,
            }
          : undefined,
        managementChange: a.managementChange
          ? {
              personName: a.managementChange.personName,
              role: a.managementChange.role,
              changeType:
                a.managementChange.direction === 'outgoing'
                  ? 'resignation'
                  : a.managementChange.direction === 're-designated'
                    ? 'redesignation'
                    : 'appointment',
              effectiveDate: a.rawDate.slice(0, 10),
              background: a.managementChange.incomingBio?.summary ?? null,
            }
          : undefined,
      }),
    );
  },
};

const emptyStatement = (): Omit<FinancialStatementRecord, 'periodType' | 'periodLabel' | 'periodEnd' | 'document'> => ({
  revenue: null,
  ebitda: null,
  ebit: null,
  pbt: null,
  pat: null,
  eps: null,
  totalAssets: null,
  totalLiabilities: null,
  totalEquity: null,
  cashAndEquivalents: null,
  borrowings: null,
  receivables: null,
  inventory: null,
  payables: null,
  contingentLiabilities: null,
  operatingCashFlow: null,
  capex: null,
  capitalEmployed: null,
  marketCap: null,
});

export const demoFinancials: FinancialsProvider = {
  info: info('Quarterly headline results contained in the demonstration announcement fixtures.'),
  async getStatements(symbol) {
    const s = stripSuffix(symbol);
    const rows: FinancialStatementRecord[] = [];
    for (const a of MOCK_ANNOUNCEMENTS) {
      if (stripSuffix(a.ticker) !== s || !a.quarterlyResults) continue;
      const q = a.quarterlyResults;
      rows.push({
        ...emptyStatement(),
        periodType: 'quarterly',
        periodLabel: q.quarter,
        periodEnd: quarterEnd(q.quarter, a.rawDate),
        revenue: q.revenue,
        ebitda: q.ebitda,
        pbt: q.pbt,
        pat: q.pat,
        document: {
          title: a.sourceDocTitle,
          url: null,
          documentType: 'quarterly_results',
          publishedAt: a.rawDate,
          periodLabel: q.quarter,
          excerpt: DEMO_NOTICE,
        },
      });
    }
    return rows;
  },
};
