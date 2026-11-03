/**
 * FINN normalized schema (Drizzle ORM, Lakebase Postgres on Neon).
 *
 * Every table that holds market or company facts carries `is_demo` so demonstration
 * fixtures can never be presented as live data. Facts point at `source_documents`
 * so each claim keeps its evidence.
 */
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const isDemo = () => boolean('is_demo').notNull().default(false);
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical']);

export const signalTypeEnum = pgEnum('signal_type', [
  'price_move',
  'volume_spike',
  'management_change',
  'corporate_announcement',
  'financial_result',
  'historical_precedent',
  'event_update',
]);

export const announcementCategoryEnum = pgEnum('announcement_category', [
  'results',
  'acquisition',
  'merger',
  'fund_raise',
  'expansion',
  'new_project',
  'capacity_addition',
  'order_win',
  'management_change',
  'regulatory',
  'litigation',
  'credit_rating',
  'debt',
  'dividend',
  'corporate_action',
  'promoter_pledge',
  'insider_trading',
  'earnings_call',
  'investor_meeting',
  'routine',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'exchange_filing',
  'annual_report',
  'quarterly_results',
  'investor_presentation',
  'earnings_call_transcript',
  'press_release',
  'other',
]);

export const eventCategoryEnum = pgEnum('event_category', [
  'manufacturing_facility',
  'capacity_expansion',
  'acquisition',
  'merger',
  'rnd_project',
  'new_business_division',
  'restructuring',
  'financial_target',
  'fundraise',
  'other',
]);

export const eventStatusEnum = pgEnum('event_status', [
  'announced',
  'initiated',
  'in_progress',
  'on_track',
  'delayed',
  'completed',
  'abandoned',
  'outcome_unverified',
]);

export const periodTypeEnum = pgEnum('period_type', ['quarterly', 'annual', 'ttm']);

/** analyst_note = hand-written narrative from the demo fixtures (neither AI nor a filing). */
export const claimTypeEnum = pgEnum('claim_type', ['reported_fact', 'calculated_metric', 'ai_interpretation', 'analyst_note']);

export const researchStatusEnum = pgEnum('research_status', ['complete', 'partial', 'failed']);

// ---------------------------------------------------------------------------
// 1-2. Users and profiles
// ---------------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    // The public reviewer demo account: shared, so the API refuses changes that would affect other reviewers.
    isDemoAccount: boolean('is_demo_account').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`)],
);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  bio: text('bio'),
  theme: text('theme').notNull().default('light'),
  updatedAt: updatedAt(),
});

/** Refresh-token sessions (rotation + reuse detection). Only token hashes are stored. */
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('auth_sessions_token_hash_uq').on(t.tokenHash), index('auth_sessions_user_idx').on(t.userId)],
);

// ---------------------------------------------------------------------------
// 3. Companies
// ---------------------------------------------------------------------------
export const companies = pgTable(
  'companies',
  {
    id: id(),
    name: text('name').notNull(),
    nseSymbol: text('nse_symbol'),
    bseCode: text('bse_code'),
    isin: text('isin'),
    sector: text('sector'),
    industry: text('industry'),
    marketCapCategory: text('market_cap_category'),
    description: text('description'),
    website: text('website'),
    // Hostname of the official website as reported by the company-info provider (verified identity).
    websiteDomain: text('website_domain'),
    // A verified logo URL, when one is known; takes precedence over automatic resolution.
    logoUrl: text('logo_url'),
    yahooSymbol: text('yahoo_symbol'),
    country: text('country'),
    exchange: text('exchange'),
    employees: integer('employees'),
    currency: text('currency'),
    isDemo: isDemo(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('companies_nse_symbol_uq').on(t.nseSymbol),
    uniqueIndex('companies_yahoo_symbol_uq').on(t.yahooSymbol),
    uniqueIndex('companies_bse_code_uq').on(t.bseCode),
    uniqueIndex('companies_isin_uq').on(t.isin),
    index('companies_name_idx').on(sql`lower(${t.name})`),
  ],
);

// ---------------------------------------------------------------------------
// 4-6. Portfolio and watchlists
// ---------------------------------------------------------------------------
/**
 * Resolved company logos, cached per listing symbol (Yahoo format, e.g. RELIANCE.NS) so search
 * results for companies FINN has not imported yet get logos too. `missing` rows are negative
 * cache entries: the UI shows initials rather than an unverified image.
 */
export const companyLogos = pgTable('company_logos', {
  symbol: text('symbol').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  domain: text('domain'),
  status: text('status').$type<'ok' | 'missing'>().notNull(),
  source: text('source'),
  sourceUrl: text('source_url'),
  contentType: text('content_type'),
  width: integer('width'),
  height: integer('height'),
  image: bytea('image'),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioHoldings = pgTable(
  'portfolio_holdings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    addedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.companyId] }), index('portfolio_company_idx').on(t.companyId)],
);

export const watchlists = pgTable(
  'watchlists',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('watchlists_user_name_uq').on(t.userId, sql`lower(${t.name})`)],
);

export const watchlistCompanies = pgTable(
  'watchlist_companies',
  {
    watchlistId: uuid('watchlist_id')
      .notNull()
      .references(() => watchlists.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    addedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.companyId] })],
);

// ---------------------------------------------------------------------------
// 22. Source documents (declared early: most facts reference it)
// ---------------------------------------------------------------------------
export const sourceDocuments = pgTable(
  'source_documents',
  {
    id: id(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    documentType: documentTypeEnum('document_type').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    periodLabel: text('period_label'),
    provider: text('provider').notNull(),
    excerpt: text('excerpt'),
    contentHash: text('content_hash').notNull(),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('source_documents_content_hash_uq').on(t.contentHash),
    index('source_documents_company_idx').on(t.companyId, t.publishedAt),
  ],
);

// ---------------------------------------------------------------------------
// 7-9. Market data
// ---------------------------------------------------------------------------
/** Latest quote per company. */
export const marketPrices = pgTable('market_prices', {
  companyId: uuid('company_id')
    .primaryKey()
    .references(() => companies.id, { onDelete: 'cascade' }),
  tradeDate: date('trade_date').notNull(),
  lastPrice: numeric('last_price', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  previousClose: numeric('previous_close', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  changePercent: doublePrecision('change_percent').notNull(),
  currency: text('currency').notNull().default('INR'),
  dayHigh: doublePrecision('day_high'),
  dayLow: doublePrecision('day_low'),
  fiftyTwoWeekHigh: doublePrecision('fifty_two_week_high'),
  fiftyTwoWeekLow: doublePrecision('fifty_two_week_low'),
  averageVolume: doublePrecision('average_volume'),
  marketCap: doublePrecision('market_cap'), // absolute, in `currency`
  enterpriseValue: doublePrecision('enterprise_value'),
  /** end_of_day | delayed | realtime | synthetic — never call delayed data "live". */
  quoteTiming: text('quote_timing').notNull().default('end_of_day'),
  delayMinutes: integer('delay_minutes'),
  provider: text('provider').notNull(),
  isDemo: isDemo(),
  asOf: timestamp('as_of', { withTimezone: true }).notNull(),
  updatedAt: updatedAt(),
});

export const priceCandles = pgTable(
  'price_candles',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    interval: text('interval').notNull().default('1d'),
    tradeDate: date('trade_date').notNull(),
    open: numeric('open', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    high: numeric('high', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    low: numeric('low', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    close: numeric('close', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    volume: numeric('volume', { precision: 20, scale: 0, mode: 'number' }).notNull(),
    provider: text('provider').notNull(),
    isDemo: isDemo(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.interval, t.tradeDate] })],
);

/** Daily traded volume with its trailing 20-session average (computed at ingestion). */
export const tradingVolumes = pgTable(
  'trading_volumes',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    tradeDate: date('trade_date').notNull(),
    volume: numeric('volume', { precision: 20, scale: 0, mode: 'number' }).notNull(),
    avgVolume20d: numeric('avg_volume_20d', { precision: 20, scale: 2, mode: 'number' }),
    volumeRatio: doublePrecision('volume_ratio'),
    isDemo: isDemo(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.tradeDate] })],
);

// ---------------------------------------------------------------------------
// 10-12. Announcements, financials, management changes
// ---------------------------------------------------------------------------
export const corporateAnnouncements = pgTable(
  'corporate_announcements',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    category: announcementCategoryEnum('category').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    announcedAt: timestamp('announced_at', { withTimezone: true }).notNull(),
    exchange: text('exchange'),
    materialityScore: integer('materiality_score').notNull().default(0),
    dedupHash: text('dedup_hash').notNull(),
    provider: text('provider').notNull(),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('announcements_dedup_uq').on(t.dedupHash),
    index('announcements_company_time_idx').on(t.companyId, t.announcedAt),
  ],
);

export const financialStatements = pgTable(
  'financial_statements',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    periodType: periodTypeEnum('period_type').notNull(),
    periodLabel: text('period_label').notNull(),
    periodEnd: date('period_end').notNull(),
    // Amounts are in `currency`, scaled by `unit` (crore for INR, million otherwise).
    // FINN never converts between currencies. NULL means "not disclosed / not available".
    currency: text('currency').notNull().default('INR'),
    unit: text('unit').notNull().default('crore'),
    revenue: doublePrecision('revenue'),
    costOfRevenue: doublePrecision('cost_of_revenue'),
    grossProfit: doublePrecision('gross_profit'),
    operatingExpenses: doublePrecision('operating_expenses'),
    operatingIncome: doublePrecision('operating_income'),
    interestExpense: doublePrecision('interest_expense'),
    taxExpense: doublePrecision('tax_expense'),
    depreciation: doublePrecision('depreciation'),
    ebitda: doublePrecision('ebitda'),
    ebit: doublePrecision('ebit'),
    pbt: doublePrecision('pbt'),
    pat: doublePrecision('pat'),
    eps: doublePrecision('eps'),
    totalAssets: doublePrecision('total_assets'),
    totalLiabilities: doublePrecision('total_liabilities'),
    totalEquity: doublePrecision('total_equity'),
    currentAssets: doublePrecision('current_assets'),
    currentLiabilities: doublePrecision('current_liabilities'),
    retainedEarnings: doublePrecision('retained_earnings'),
    cashAndEquivalents: doublePrecision('cash_and_equivalents'),
    borrowings: doublePrecision('borrowings'),
    longTermDebt: doublePrecision('long_term_debt'),
    shortTermDebt: doublePrecision('short_term_debt'),
    receivables: doublePrecision('receivables'),
    inventory: doublePrecision('inventory'),
    payables: doublePrecision('payables'),
    contingentLiabilities: doublePrecision('contingent_liabilities'),
    operatingCashFlow: doublePrecision('operating_cash_flow'),
    investingCashFlow: doublePrecision('investing_cash_flow'),
    financingCashFlow: doublePrecision('financing_cash_flow'),
    freeCashFlow: doublePrecision('free_cash_flow'),
    capex: doublePrecision('capex'),
    capitalEmployed: doublePrecision('capital_employed'),
    marketCap: doublePrecision('market_cap'),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    isDemo: isDemo(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('financials_period_uq').on(t.companyId, t.periodType, t.periodEnd)],
);

export const managementChanges = pgTable(
  'management_changes',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    announcementId: uuid('announcement_id').references(() => corporateAnnouncements.id, { onDelete: 'set null' }),
    personName: text('person_name').notNull(),
    role: text('role').notNull(),
    changeType: text('change_type').notNull(), // appointment | resignation | redesignation | retirement
    effectiveDate: date('effective_date'),
    background: text('background'),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('management_changes_uq').on(t.companyId, sql`lower(${t.personName})`, sql`lower(${t.role})`, t.changeType)],
);

// ---------------------------------------------------------------------------
// 13-15. Signals, notifications, alert preferences
// ---------------------------------------------------------------------------
export const signals = pgTable(
  'signals',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    type: signalTypeEnum('type').notNull(),
    category: text('category').notNull(),
    priority: priorityEnum('priority').notNull(),
    materialityScore: integer('materiality_score').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    metrics: jsonb('metrics').$type<Record<string, number | string | null>>().notNull().default({}),
    evidence: jsonb('evidence').$type<Array<{ label: string; detail: string; sourceDocumentId?: string | null }>>().notNull().default([]),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    announcementId: uuid('announcement_id').references(() => corporateAnnouncements.id, { onDelete: 'set null' }),
    /** The Event Memory entry this signal concerns (precedent alerts and extracted announcements). */
    eventId: uuid('event_id').references((): AnyPgColumn => corporateEvents.id, { onDelete: 'set null' }),
    /** One row per underlying event: re-ingesting the same fact never creates a second signal. */
    dedupKey: text('dedup_key').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    isDemo: isDemo(),
  },
  (t) => [
    uniqueIndex('signals_dedup_uq').on(t.dedupKey),
    index('signals_company_time_idx').on(t.companyId, t.occurredAt),
    index('signals_priority_idx').on(t.priority, t.occurredAt),
    index('signals_event_idx').on(t.eventId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    signalId: uuid('signal_id')
      .notNull()
      .references(() => signals.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    priority: priorityEnum('priority').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    /** Set when the user bookmarks the alert; independent of read state, priority and order. */
    favouritedAt: timestamp('favourited_at', { withTimezone: true }),
    /** Set when the user archives the alert: hidden from the active feed, never deleted; independent of read and favourite state. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('notifications_user_signal_uq').on(t.userId, t.signalId),
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    index('notifications_user_favourited_idx').on(t.userId, t.favouritedAt).where(sql`${t.favouritedAt} is not null`),
    index('notifications_user_archived_idx').on(t.userId, t.archivedAt).where(sql`${t.archivedAt} is not null`),
  ],
);

/**
 * Personal research notes on an alert (a user's notification). One note per user per alert for
 * now (unique constraint); dropping it would allow several. Deleting the user or the alert
 * deletes the note; archiving and restoring the alert leave it untouched.
 */
export const alertNotes = pgTable(
  'alert_notes',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('alert_notes_user_notification_uq').on(t.userId, t.notificationId)],
);

export const alertPreferences = pgTable('alert_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  priceMoveThresholdPct: doublePrecision('price_move_threshold_pct').notNull().default(2.5),
  volumeSurgeMultiple: doublePrecision('volume_surge_multiple').notNull().default(2.0),
  announcementCategories: jsonb('announcement_categories').$type<string[]>().notNull().default([]),
  managementChangeAlerts: boolean('management_change_alerts').notNull().default(true),
  financialResultAlerts: boolean('financial_result_alerts').notNull().default(true),
  eventAlerts: boolean('event_alerts').notNull().default(true),
  minimumPriority: priorityEnum('minimum_priority').notNull().default('medium'),
  inAppNotifications: boolean('in_app_notifications').notNull().default(true),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// 16-17. Research
// ---------------------------------------------------------------------------
export const researchReports = pgTable(
  'research_reports',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    status: researchStatusEnum('status').notNull(),
    generator: text('generator').notNull(), // e.g. "demo-fixture", "finn-rules+claude-sonnet-4-6"
    sections: jsonb('sections').$type<Record<string, unknown>>().notNull(),
    limitations: jsonb('limitations').$type<string[]>().notNull().default([]),
    /** Newest underlying data timestamp the report was built from. */
    dataAsOf: timestamp('data_as_of', { withTimezone: true }),
    /** Hash of the evidence pack + AI model. An identical hash means the report can be reused. */
    inputHash: text('input_hash'),
    /** Stage timings in ms (data sync, context load, AI per group, persist, total). */
    timings: jsonb('timings').$type<Record<string, unknown>>(),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [index('research_company_created_idx').on(t.companyId, t.createdAt), index('research_company_hash_idx').on(t.companyId, t.inputHash)],
);

/**
 * Asynchronous research generation. The job row carries the sections as they complete so the
 * client can render progressively; the finished report is persisted to research_reports.
 */
export const researchJobs = pgTable(
  'research_jobs',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('queued'), // queued | running | succeeded | failed
    stage: text('stage').notNull().default('queued'), // queued | data | analysis | ai | saving | done
    mode: text('mode').notNull().default('generate'), // generate | refresh_ai | refresh_all
    /** Per-section state: loading | available | partial | unavailable. */
    progress: jsonb('progress').$type<Record<string, string>>().notNull().default({}),
    /** Sections completed so far (same shape as research_reports.sections). */
    partial: jsonb('partial').$type<Record<string, unknown>>(),
    reportId: uuid('report_id').references(() => researchReports.id, { onDelete: 'set null' }),
    /** True when an identical existing report was reused instead of regenerated. */
    reused: boolean('reused').notNull().default(false),
    timings: jsonb('timings').$type<Record<string, unknown>>().notNull().default({}),
    error: text('error'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [index('research_jobs_user_created_idx').on(t.requestedBy, t.createdAt), index('research_jobs_company_status_idx').on(t.companyId, t.status)],
);

export const researchEvidence = pgTable(
  'research_evidence',
  {
    id: id(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => researchReports.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    claim: text('claim').notNull(),
    claimType: claimTypeEnum('claim_type').notNull(),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    excerpt: text('excerpt'),
    createdAt: createdAt(),
  },
  (t) => [index('research_evidence_report_idx').on(t.reportId)],
);

// ---------------------------------------------------------------------------
// 18-21. Event Memory
// ---------------------------------------------------------------------------
export const corporateEvents = pgTable(
  'corporate_events',
  {
    id: id(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    category: eventCategoryEnum('category').notNull(),
    projectType: text('project_type'),
    title: text('title').notNull(),
    originalAnnouncement: text('original_announcement').notNull(),
    announcedAt: date('announced_at').notNull(),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    investmentSignificance: text('investment_significance'),
    expectedCapexCr: doublePrecision('expected_capex_cr'),
    expectedCapacityValue: doublePrecision('expected_capacity_value'),
    expectedCapacityUnit: text('expected_capacity_unit'),
    expectedCompletionDate: date('expected_completion_date'),
    expectedImpact: text('expected_impact'),
    commitments: jsonb('commitments').$type<string[]>().notNull().default([]),
    status: eventStatusEnum('status').notNull().default('announced'),
    statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow(),
    extractionMethod: text('extraction_method').notNull().default('manual'), // manual | rules | ai | demo-fixture
    dedupHash: text('dedup_hash').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    isDemo: isDemo(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('corporate_events_dedup_uq').on(t.dedupHash),
    index('corporate_events_company_idx').on(t.companyId, t.announcedAt),
    index('corporate_events_category_idx').on(t.category, t.projectType),
  ],
);

export const eventMilestones = pgTable(
  'event_milestones',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => corporateEvents.id, { onDelete: 'cascade' }),
    milestoneDate: date('milestone_date').notNull(),
    statusAfter: eventStatusEnum('status_after').notNull(),
    description: text('description').notNull(),
    reportedMetric: text('reported_metric'),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
    evidenceExcerpt: text('evidence_excerpt'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [index('event_milestones_event_idx').on(t.eventId, t.milestoneDate)],
);

export const eventExecutionRecords = pgTable('event_execution_records', {
  eventId: uuid('event_id')
    .primaryKey()
    .references(() => corporateEvents.id, { onDelete: 'cascade' }),
  outcome: eventStatusEnum('outcome').notNull(), // completed | delayed | abandoned
  actualCompletionDate: date('actual_completion_date'),
  actualCapexCr: doublePrecision('actual_capex_cr'),
  actualCapacityValue: doublePrecision('actual_capacity_value'),
  delayDays: integer('delay_days'),
  plannedDurationDays: integer('planned_duration_days'),
  actualDurationDays: integer('actual_duration_days'),
  capexVariancePct: doublePrecision('capex_variance_pct'),
  capacityVariancePct: doublePrecision('capacity_variance_pct'),
  guidanceAccuracy: text('guidance_accuracy'), // accurate | minor_slip | major_slip | missed
  sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
  evidenceExcerpt: text('evidence_excerpt').notNull(),
  isDemo: isDemo(),
  recordedAt: createdAt(),
});

export const eventSimilarities = pgTable(
  'event_similarities',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => corporateEvents.id, { onDelete: 'cascade' }),
    similarEventId: uuid('similar_event_id')
      .notNull()
      .references(() => corporateEvents.id, { onDelete: 'cascade' }),
    structuredScore: doublePrecision('structured_score').notNull(),
    semanticScore: doublePrecision('semantic_score'),
    combinedScore: doublePrecision('combined_score').notNull(),
    matchedOn: jsonb('matched_on').$type<string[]>().notNull().default([]),
    explanation: text('explanation').notNull(),
    /** Optional AI comparison grounded in the two stored event records (never in outside knowledge). */
    aiAssessment: jsonb('ai_assessment').$type<{ verdict: string; summary: string; similarities: string[]; differences: string[]; model: string; assessedAt: string }>(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.similarEventId] }),
    index('event_similarities_similar_idx').on(t.similarEventId),
  ],
);

// ---------------------------------------------------------------------------
// 23. Audit log
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text('ip_address'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_user_idx').on(t.userId, t.createdAt)],
);

/** Per-company provider fetches: drives caching, freshness indicators and manual refresh. */
export const dataSyncs = pgTable(
  'data_syncs',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    dataset: text('dataset').notNull(), // profile | history | financials
    provider: text('provider').notNull(),
    status: text('status').notNull(), // ok | failed
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    error: text('error'),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.dataset, t.provider] })],
);

/** Ingestion bookkeeping so scheduled jobs are observable and idempotent. */
export const jobRuns = pgTable(
  'job_runs',
  {
    id: id(),
    job: text('job').notNull(),
    status: text('status').notNull(), // running | succeeded | failed
    startedAt: createdAt(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    stats: jsonb('stats').$type<Record<string, unknown>>().notNull().default({}),
    error: text('error'),
  },
  (t) => [index('job_runs_job_idx').on(t.job, t.startedAt)],
);

/** One row per AI provider call: tokens, latency and outcome (never prompts or keys). */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    feature: text('feature').notNull(), // research | event_extraction | event_comparison | status_probe
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    tier: text('tier').notNull(), // fast | reasoning
    status: text('status').notNull(), // ok | error
    errorCode: text('error_code'),
    attempts: integer('attempts').notNull().default(1),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    reasoningTokens: integer('reasoning_tokens'),
    latencyMs: integer('latency_ms').notNull(),
    /** Only when AI_PRICE_* are configured; FINN does not guess provider prices. */
    costUsd: doublePrecision('cost_usd'),
    createdAt: createdAt(),
  },
  (t) => [index('ai_usage_user_created_idx').on(t.userId, t.createdAt), index('ai_usage_created_idx').on(t.createdAt)],
);
