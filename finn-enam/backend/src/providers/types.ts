/**
 * Provider-independent data contracts. Ingestion jobs and services depend only on these
 * interfaces; concrete adapters (demo fixtures today, licensed NSE/BSE vendors later) are
 * chosen at runtime by ./registry.ts from environment configuration.
 *
 * Adding a vendor: implement the relevant interface in ./adapters/<vendor>.ts, map the
 * vendor's actual response fields onto these records, and register it in ./registry.ts.
 */

export interface ProviderInfo {
  /** Stable identifier persisted on every row the provider produces (e.g. "demo"). */
  name: string;
  /** True when the data is demonstration data and must be labelled as such. */
  isDemo: boolean;
  configured: boolean;
  description: string;
}

export class ProviderUnavailableError extends Error {
  constructor(
    public readonly capability: string,
    message: string,
  ) {
    super(message);
  }
}

export interface CompanyRecord {
  name: string;
  nseSymbol: string | null;
  bseCode: string | null;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  marketCapCategory: string | null;
  description: string | null;
  website: string | null;
  yahooSymbol?: string | null;
  country?: string | null;
  exchange?: string | null;
  employees?: number | null;
  currency?: string | null;
}

export interface DailyCandle {
  tradeDate: string; // YYYY-MM-DD (exchange calendar day)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type DocumentType =
  | 'exchange_filing'
  | 'annual_report'
  | 'quarterly_results'
  | 'investor_presentation'
  | 'earnings_call_transcript'
  | 'press_release'
  | 'other';

export interface DocumentRecord {
  title: string;
  url: string | null;
  documentType: DocumentType;
  publishedAt: string | null;
  periodLabel: string | null;
  excerpt: string | null;
}

export interface QuarterlyResultRecord {
  periodLabel: string;
  periodEnd: string;
  revenue: number | null;
  ebitda: number | null;
  pbt: number | null;
  pat: number | null;
}

export interface ManagementChangeRecord {
  personName: string;
  role: string;
  changeType: 'appointment' | 'resignation' | 'redesignation' | 'retirement';
  effectiveDate: string | null;
  background: string | null;
}

export interface AnnouncementRecord {
  externalId: string;
  symbol: string;
  /** Provider's own category label; FINN classifies it with its own taxonomy. */
  rawCategory: string;
  title: string;
  summary: string | null;
  announcedAt: string;
  exchange: string | null;
  document: DocumentRecord;
  quarterlyResults?: QuarterlyResultRecord;
  managementChange?: ManagementChangeRecord;
}

export interface FinancialStatementRecord {
  periodType: 'quarterly' | 'annual' | 'ttm';
  periodLabel: string;
  periodEnd: string;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  pbt: number | null;
  pat: number | null;
  eps: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  borrowings: number | null;
  receivables: number | null;
  inventory: number | null;
  payables: number | null;
  contingentLiabilities: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  capitalEmployed: number | null;
  marketCap: number | null;
  document: DocumentRecord | null;
}

export interface TranscriptRecord {
  symbol: string;
  title: string;
  periodLabel: string;
  publishedAt: string;
  url: string | null;
  text: string;
}

export interface CompanyInfoProvider {
  info: ProviderInfo;
  search(query: string, limit: number): Promise<CompanyRecord[]>;
  getBySymbol(symbol: string): Promise<CompanyRecord | null>;
}

export interface MarketDataProvider {
  info: ProviderInfo;
  /** Daily OHLCV, oldest first, inclusive of both dates. */
  getDailyHistory(symbol: string, fromDate: string, toDate: string): Promise<DailyCandle[]>;
}

export interface AnnouncementsProvider {
  info: ProviderInfo;
  listAnnouncements(symbols: string[], since: Date): Promise<AnnouncementRecord[]>;
}

export interface FinancialsProvider {
  info: ProviderInfo;
  getStatements(symbol: string): Promise<FinancialStatementRecord[]>;
}

export interface TranscriptsProvider {
  info: ProviderInfo;
  listTranscripts(symbol: string): Promise<TranscriptRecord[]>;
}
