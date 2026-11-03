/** Typed API responses (mirrors backend/src routes). Dates arrive as ISO strings. */

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ClaimType = 'reported_fact' | 'calculated_metric' | 'ai_interpretation' | 'analyst_note';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  fullName: string;
  timezone: string;
  bio: string | null;
  theme: 'light' | 'dark';
  /** The shared reviewer demo account: identity, password and shared records are read-only. */
  isDemoAccount?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CompanySummary {
  id: string;
  name: string;
  nseSymbol: string | null;
  yahooSymbol?: string | null;
  bseCode?: string | null;
  isin?: string | null;
  sector?: string | null;
  industry?: string | null;
  marketCapCategory?: string | null;
  isDemo?: boolean;
}

export type QuoteTiming = 'end_of_day' | 'delayed' | 'realtime' | 'synthetic' | 'unknown';

export interface Quote {
  companyId: string;
  tradeDate: string;
  lastPrice: number;
  previousClose: number;
  changePercent: number;
  asOf: string;
  provider: string;
  isDemo: boolean;
  quoteTiming?: QuoteTiming;
  delayMinutes?: number | null;
  currency?: string;
  dayHigh?: number | null;
  dayLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  averageVolume?: number | null;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  updatedAt?: string;
  volume: number | null;
  avgVolume20d: number | null;
  volumeRatio: number | null;
  sparkline: number[];
}

export interface Holding extends CompanySummary {
  addedAt: string;
  quote: Quote | null;
  activeSignalCount: number;
}

export interface EvidenceRef {
  label: string;
  detail: string;
  sourceDocumentId?: string | null;
}

export interface SourceDocument {
  id: string;
  companyId: string | null;
  documentType: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
  periodLabel: string | null;
  provider: string;
  excerpt: string | null;
  isDemo: boolean;
}

export type SignalType =
  | 'price_move'
  | 'volume_spike'
  | 'management_change'
  | 'corporate_announcement'
  | 'financial_result'
  | 'historical_precedent'
  | 'event_update';

export interface Signal {
  id: string;
  companyId: string;
  type: SignalType;
  category: string;
  categoryLabel: string;
  priority: Priority;
  materialityScore: number;
  title: string;
  description: string;
  metrics: Record<string, number | string | null>;
  evidence: EvidenceRef[];
  sourceDocumentId: string | null;
  announcementId: string | null;
  eventId: string | null;
  occurredAt: string;
  detectedAt: string;
  isDemo: boolean;
  company?: CompanySummary;
  sourceDocuments?: SourceDocument[];
}

export type OutcomeLabel =
  | 'Delivered on time'
  | 'Delivered early'
  | 'Delivered late'
  | 'Delivered — timing unverified'
  | 'Delayed'
  | 'Abandoned'
  | 'In progress'
  | 'Outcome unverified';

export interface HistoricalMatch {
  newEventId: string;
  similarity: number;
  matchedOn: string[];
  explanation: string;
  sameCompany: boolean;
  event: {
    id: string;
    title: string;
    category: string;
    announcedAt: string;
    originalAnnouncement: string;
    expectedCompletionDate: string | null;
    actualCompletionDate: string | null;
    status: EventStatus;
    isDemo: boolean;
    company: CompanySummary;
  };
  outcome: OutcomeLabel;
  delayDays: number | null;
  evidence: { title: string; url: string | null } | null;
}

export type DigestWindow = '24h' | '48h' | '7d' | 'custom';

export interface DigestItem {
  id: string;
  company: { id: string; name: string; nseSymbol: string | null };
  category: string;
  categoryLabel: string;
  title: string;
  summary: string | null;
  announcedAt: string;
  exchange: string | null;
  materialityScore: number;
  priority: Priority;
  routine: boolean;
  signalId: string | null;
  sourceDocument: { id: string; title: string; url: string | null } | null;
  isDemo: boolean;
}

export interface DigestResponse {
  window: { id: DigestWindow; start: string; end: string; fromDate: string | null; toDate: string | null; timezone: string };
  total: number;
  materialCount: number;
  routineCount: number;
  byPriority: Record<Priority, number>;
  material: DigestItem[];
  routine: DigestItem[];
  latestFilingAt: string | null;
  isDemo: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  signalId: string;
  title: string;
  body: string;
  priority: Priority;
  readAt: string | null;
  /** Per-user bookmark; independent of read state, priority and order. */
  favouritedAt?: string | null;
  favourited?: boolean;
  /** Archived: out of the active feed, never deleted; independent of read and favourite state. */
  archivedAt?: string | null;
  archived?: boolean;
  /** The user's personal note on this alert exists (its text is fetched separately). */
  hasNote?: boolean;
  noteUpdatedAt?: string | null;
  createdAt: string;
  signal: Pick<Signal, 'id' | 'type' | 'category' | 'materialityScore' | 'occurredAt' | 'isDemo'> & Partial<Pick<Signal, 'metrics' | 'evidence' | 'detectedAt' | 'categoryLabel' | 'eventId'>>;
  company: CompanySummary;
  historicalMatch?: HistoricalMatch | null;
}

export interface AlertNote {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeResponse {
  greetingName: string | null;
  timezone: string;
  quote: { text: string; author: string; source: string };
  overview: {
    trackedCompanies: number;
    withMarketData: number;
    advancing: number;
    declining: number;
    unchanged: number;
    averageChangePercent: number | null;
    averageMethod: string;
    activeAlerts: number;
    openEvents: number;
    lastUpdated: string | null;
    isDemo: boolean;
    demoCompanies?: number;
    provider: string | null;
  };
  priorityAlerts: NotificationItem[];
}

export interface Candle {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volumeRatio: number | null;
  avgVolume20d: number | null;
  changePercent: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

export type Range = '1W' | '1M' | '3M' | '6M' | '1Y' | 'MAX';

export interface HistoryResponse {
  range: Range;
  candles: Candle[];
  isDemo: boolean;
  provider: string | null;
}

export interface Announcement {
  id: string;
  companyId: string;
  category: string;
  categoryLabel: string;
  title: string;
  summary: string | null;
  announcedAt: string;
  materialityScore: number;
  isDemo: boolean;
}

export interface Reliability {
  eventsWithOutcome: number;
  completed: number;
  delayed: number;
  abandoned: number;
  onTimeRate: number | null;
  averageDelayDays: number | null;
  accurateGuidance: number;
}

export interface CompanyOverview {
  company: CompanySummary & { description: string | null; website: string | null; inPortfolio: boolean };
  quote: Quote | null;
  announcements: Announcement[];
  managementChanges: Array<{ id: string; personName: string; role: string; changeType: string; effectiveDate: string | null; background: string | null; isDemo: boolean }>;
  executionReliability: Reliability;
}

export interface SearchResponse {
  items: CompanySummary[];
  external?: Array<{ name: string; nseSymbol: string | null; bseCode: string | null; isin: string | null; sector: string | null; yahooSymbol: string | null; exchange: string | null }>;
  providerSearched: boolean;
  provider?: { name: string; isDemo: boolean; configured: boolean; description: string };
}

// --- research ---
export interface Claim {
  label?: string;
  text: string;
  value?: number | null;
  unit?: string | null;
  period?: string | null;
  formula?: string;
  claimType: ClaimType;
  sourceDocumentId?: string | null;
  sourceTitle?: string | null;
}

export interface ResearchSection {
  status: 'available' | 'partial' | 'unavailable';
  reason?: string;
  claims: Claim[];
  data?: unknown;
}

export type SectionKey =
  | 'businessSnapshot'
  | 'financialSnapshot'
  | 'businessTrajectory'
  | 'balanceSheet'
  | 'cashQuality'
  | 'narrativeVsNumbers'
  | 'forwardGuidance'
  | 'bullBear'
  | 'investmentRisks'
  | 'summary';

export interface ResearchReport {
  id: string;
  companyId: string;
  status: 'complete' | 'partial' | 'failed';
  generator: string;
  sections: Record<SectionKey, ResearchSection>;
  limitations: string[];
  dataAsOf: string | null;
  isDemo: boolean;
  createdAt: string;
  timings?: Record<string, unknown> | null;
}

export type SectionProgress = 'loading' | 'available' | 'partial' | 'unavailable';

export interface ResearchJob {
  id: string;
  companyId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  stage: 'queued' | 'data' | 'analysis' | 'ai' | 'saving' | 'done';
  mode: 'generate' | 'refresh_ai' | 'refresh_all';
  progress: Partial<Record<SectionKey, SectionProgress>>;
  partial: Record<SectionKey, ResearchSection> | null;
  reportId: string | null;
  reused: boolean;
  timings: Record<string, unknown>;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface Freshness {
  dataset: 'profile' | 'history' | 'financials';
  provider: string;
  status: 'ok' | 'failed';
  fetchedAt: string;
  error: string | null;
}

export interface ResearchResponse {
  company: CompanySummary & { description?: string | null; website?: string | null; country?: string | null; exchange?: string | null; employees?: number | null; currency?: string | null };
  quote: Quote | null;
  freshness: Freshness[];
  report: ResearchReport | null;
  history: Array<{ id: string; generator: string; status: string; createdAt: string; isDemo: boolean }>;
  /** The signed-in user's in-flight research job for this company, if any. */
  activeJob?: ResearchJob | null;
  /** The signed-in user's most recent job for this company, finished or not. */
  latestJob?: ResearchJobSummary | null;
}

/** A research job's status without its partial sections. */
export interface ResearchJobSummary {
  id: string;
  companyId: string;
  status: ResearchJob['status'];
  stage: ResearchJob['stage'];
  mode: ResearchJob['mode'];
  error: string | null;
  reportId: string | null;
  reused: boolean;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

/** One of the user's queued or running jobs, with its company (app-wide tracking). */
export interface ActiveResearchJob extends ResearchJobSummary {
  company: { id: string; name: string; nseSymbol: string | null; yahooSymbol: string | null };
}

export interface EvidenceResponse {
  reportId: string | null;
  items: Array<{ id: string; section: string; claim: string; claimType: ClaimType; excerpt: string | null; document: SourceDocument | null }>;
  documents: SourceDocument[];
}

// --- events ---
export type EventStatus = 'announced' | 'initiated' | 'in_progress' | 'on_track' | 'delayed' | 'completed' | 'abandoned' | 'outcome_unverified';
export type EventCategory =
  | 'manufacturing_facility'
  | 'capacity_expansion'
  | 'acquisition'
  | 'merger'
  | 'rnd_project'
  | 'new_business_division'
  | 'restructuring'
  | 'financial_target'
  | 'fundraise'
  | 'other';

export interface CorporateEvent {
  id: string;
  companyId: string;
  category: EventCategory;
  projectType: string | null;
  title: string;
  originalAnnouncement: string;
  announcedAt: string;
  sourceDocumentId: string | null;
  investmentSignificance: string | null;
  expectedCapexCr: number | null;
  expectedCapacityValue: number | null;
  expectedCapacityUnit: string | null;
  expectedCompletionDate: string | null;
  expectedImpact: string | null;
  commitments: string[];
  status: EventStatus;
  statusUpdatedAt: string;
  extractionMethod: string;
  isDemo: boolean;
  hasEmbedding: boolean;
  createdAt: string;
  company: CompanySummary;
  precedentCount?: number;
  delayDays?: number | null;
}

export interface ExecutionRecord {
  eventId: string;
  outcome: EventStatus;
  actualCompletionDate: string | null;
  actualCapexCr: number | null;
  actualCapacityValue: number | null;
  delayDays: number | null;
  plannedDurationDays: number | null;
  actualDurationDays: number | null;
  capexVariancePct: number | null;
  capacityVariancePct: number | null;
  guidanceAccuracy: string | null;
  sourceDocumentId: string | null;
  evidenceExcerpt: string;
  isDemo: boolean;
}

export interface Milestone {
  id: string;
  eventId: string;
  milestoneDate: string;
  statusAfter: EventStatus;
  description: string;
  reportedMetric: string | null;
  evidenceExcerpt: string | null;
  isDemo: boolean;
  sourceDocument: SourceDocument | null;
}

export interface SimilarEvent {
  eventId: string;
  similarEventId: string;
  structuredScore: number;
  semanticScore: number | null;
  combinedScore: number;
  matchedOn: string[];
  explanation: string;
  event: Pick<CorporateEvent, 'id' | 'title' | 'category' | 'status' | 'announcedAt' | 'expectedCompletionDate' | 'expectedCapexCr' | 'isDemo'>;
  company: CompanySummary;
  execution: ExecutionRecord | null;
  sameCompany: boolean;
  outcome: OutcomeLabel;
}

export interface EventDetail extends CorporateEvent {
  outcome: OutcomeLabel;
  matchedBy: Array<{ id: string; title: string; announcedAt: string; status: EventStatus; combinedScore: number; company: CompanySummary }>;
  sourceDocument: SourceDocument | null;
  milestones: Milestone[];
  execution: ExecutionRecord | null;
  similarEvents: SimilarEvent[];
  companyReliability: Reliability;
}

// --- settings ---
export interface AlertPreferences {
  priceMoveThresholdPct: number;
  volumeSurgeMultiple: number;
  announcementCategories: string[];
  managementChangeAlerts: boolean;
  financialResultAlerts: boolean;
  eventAlerts: boolean;
  minimumPriority: Priority;
  inAppNotifications: boolean;
  categories?: Array<{ id: string; label: string }>;
}

export interface SettingsResponse {
  profile: { email: string; fullName: string; timezone: string; bio: string | null; theme: 'light' | 'dark' };
  alerts: AlertPreferences;
}

export interface Watchlist {
  id: string;
  name: string;
  position: number;
  companies: CompanySummary[];
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface HealthResponse {
  status: string;
  database: { connected: boolean; latencyMs: number };
  ai: { configured: boolean; provider: string | null; chatModel: string | null; reasoningModel?: string | null; label: string | null; reason: string | null };
  realtime: { configured: boolean };
  providers: Record<string, { name: string; isDemo: boolean; configured: boolean; description: string }>;
}

// --- Research intelligence (deterministic analysis, FINN Intelligence, Ask FINN) -----------------

export interface PeriodPoint {
  period: string;
  periodEnd: string | null;
  /** A period inside the range that the source did not report (shown as a gap). */
  missing: boolean;
  revenue: number | null;
  pat: number | null;
  ebitda: number | null;
  ebitdaDerived: boolean;
  operatingIncome: number | null;
  eps: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  cfoToPat: number | null;
  borrowings: number | null;
  cash: number | null;
  netDebt: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  comparedWith: string | null;
  sourceDocumentId: string | null;
}

export type Tone = 'positive' | 'negative' | 'neutral';

export interface SourceRef {
  documentId: string | null;
  title: string | null;
  url: string | null;
  provider: string | null;
}

export interface Assessment {
  key: 'growth' | 'profitability' | 'cash' | 'balanceSheet';
  title: string;
  label: string;
  tone: Tone;
  value: string | null;
  detail: string;
  rule: string;
  period: string | null;
}

export interface Insight {
  key: string;
  headline: string;
  metric: string;
  value: number;
  display: string;
  previous: number | null;
  previousDisplay: string | null;
  change: string | null;
  direction: 'up' | 'down' | 'flat';
  tone: Tone;
  whyItMatters: string;
  period: string;
  previousPeriod: string | null;
  formula: string;
  source: SourceRef;
}

export interface FinancialAnalysis {
  currency: string;
  unit: string;
  isFinancialSector: boolean;
  isDemo: boolean;
  annual: PeriodPoint[];
  quarterly: PeriodPoint[];
  latestPeriod: string | null;
  previousPeriod: string | null;
  assessments: Assessment[];
  insights: Insight[];
  sources: SourceRef[];
  gaps: string[];
  dataAsOf: string | null;
  company: { name: string; sector: string | null };
}

export interface CitedEvidence {
  id: string;
  text: string;
  kind: 'reported_fact' | 'calculated_metric' | 'document_excerpt' | 'event';
  sourceDocumentId: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

export interface IntelligencePoint {
  text: string;
  evidence: CitedEvidence[];
}

export interface Intelligence {
  changes: Array<{ change: string; implication: string; evidence: CitedEvidence[] }>;
  supports: IntelligencePoint[];
  concerns: IntelligencePoint[];
  monitor: Array<{ question: string; evidence: CitedEvidence[] }>;
}

export interface AskResult {
  question: string;
  answer: IntelligencePoint[];
  notCovered: string | null;
  model: string;
  generatedAt: string;
  dataAsOf: string | null;
  cached: boolean;
}
