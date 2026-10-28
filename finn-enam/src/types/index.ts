export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap';

export interface Company {
  ticker: string;
  name: string;
  bseCode: string;
  sector: string;
  marketCapCategory: MarketCapCategory;
  inWatchlist: boolean;
  currentPrice: number;
  changePercent: number;
  volumeRatio: number; // vs 20-DMA
  sparkline: number[];
  screenerUrl: string;
  irUrl: string;
}

export type AnnouncementCategory =
  | 'results'
  | 'M&A'
  | 'fund_raise'
  | 'management_change'
  | 'litigation'
  | 'insider_trading'
  | 'earnings_call'
  | 'investor_meetings'
  | 'credit_rating'
  | 'dividend'
  | 'bonus_split'
  | 'capex'
  | 'press_release'
  | 'postal_ballot'
  | 'agm_egm'
  | 'pledging'
  | 'unclassified';

export type AlertSeverity = 'critical' | 'high' | 'normal' | 'routine';

export interface QuarterlyResults {
  quarter: string;
  revenue: number; // in ₹ Crores
  revenueYoY: number; // %
  revenueQoQ: number; // %
  ebitda: number;
  ebitdaYoY: number;
  ebitdaMargin: number; // %
  ebitdaMarginChangeBps: number; // basis points
  pbt: number;
  pbtYoY: number;
  pat: number;
  patYoY: number;
  patQoQ: number;
}

export interface ManagementChange {
  role: string;
  personName: string;
  direction: 'incoming' | 'outgoing' | 're-designated';
  incomingBio?: {
    summary: string;
    previousRole: string;
    previousCompany: string;
    tenureYears: number;
    pedigreeHighlight: string;
  };
}

export interface Announcement {
  id: string;
  ticker: string;
  companyName: string;
  category: AnnouncementCategory;
  timestamp: string;
  rawDate: string;
  title: string;
  oneLineTakeaway: string;
  whyItMatters: string;
  severity: AlertSeverity;
  isRoutine: boolean;
  sourceUrl: string;
  sourceDocTitle: string;
  quarterlyResults?: QuarterlyResults;
  managementChange?: ManagementChange;
  eventMemoryId?: string;
}

export interface TriggeredAlert {
  id: string;
  ticker: string;
  companyName: string;
  type: 'price_move' | 'volume_spike' | 'material_filing' | 'guidance_miss';
  severity: 'critical' | 'high' | 'medium';
  headline: string;
  triggerMetric: string;
  explanation: string;
  timestamp: string;
  announcementId?: string;
  isEod: boolean;
}

export type CommitmentStatus = 'pending' | 'delivered' | 'delayed' | 'revised' | 'unverified';

export interface EventMemoryItem {
  id: string;
  ticker: string;
  companyName: string;
  title: string;
  commitmentDate: string;
  sourceDoc: string;
  sourcePageOrQuote: string;
  category: 'capex' | 'margin' | 'debt' | 'revenue' | 'capacity' | 'product';
  announcedMetric: string;
  milestoneDeadline: string;
  status: CommitmentStatus;
  statusConfidence: number;
  factsSummary: string;
  aiInterpretation: string;
  historicalComps: Array<{
    companyOrPeer: string;
    pastEvent: string;
    outcome: string;
    year: string;
  }>;
  timeline: Array<{
    date: string;
    observation: string;
    sourceDoc: string;
    reportedMetric?: string;
    statusDelta: 'positive' | 'neutral' | 'negative' | 'critical';
  }>;
}

export interface CompanyResearch {
  ticker: string;
  name: string;
  sector: string;
  marketCap: string;
  businessSnapshot: {
    summary: string;
    segments: Array<{ name: string; sharePercent: number; growthYoY: number }>;
    keyMoat: string;
  };
  financialSnapshot: {
    revenueTtm: string;
    ebitdaMargin: string;
    roce: string;
    roe: string;
    debtToEquity: string;
    workingCapitalDays: number;
    fcfTtm: string;
    cfoPatConversion: number;
  };
  narrativeVsNumbers: Array<{
    period: string;
    managementGuidance: string;
    actualDelivered: string;
    variance: string;
    varianceType: 'beat' | 'met' | 'miss';
    sourceDoc: string;
  }>;
  guidanceLedger: Array<{
    metric: string;
    managementStatement: string;
    targetPeriod: string;
    concallSource: string;
  }>;
  cashQualityAnalysis: {
    cfoVsPatCommentary: string;
    workingCapitalTrend: string;
    fcfYield: string;
    redFlagsDetected: boolean;
    flagsDetail?: string;
  };
  bullBear: {
    bullCase: string[];
    bearCase: string[];
  };
  primarySources: Array<{
    title: string;
    type: 'Annual Report' | 'Concall Transcript' | 'Quarterly Results' | 'Investor Presentation';
    period: string;
    url: string;
  }>;
}

export type DigestWindow = '24h' | '48h' | '7d' | 'all';

export interface AlertSettings {
  priceMoveThresholdPercent: number;
  volumeSpikeMultiplier: number;
  activeDigestWindow: DigestWindow;
  enabledCategories: Record<AnnouncementCategory, boolean>;
  minSeverity: 'all' | 'high_only' | 'critical_only';
  includeOutOfPortfolio: boolean;
}
