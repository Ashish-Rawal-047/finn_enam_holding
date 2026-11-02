/**
 * Alert engine.
 *
 *  Signals      - global, one row per underlying event (unique dedup_key). Market signals
 *                 are recorded once a move clears the system floor; user thresholds are
 *                 applied later, at notification time.
 *  Notifications- per user, only for companies in that user's portfolio and only when the
 *                 user's preferences pass. unique(user_id, signal_id) makes fan-out
 *                 idempotent, so re-running jobs never duplicates an alert.
 */
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  alertPreferences,
  companies,
  marketPrices,
  notifications,
  portfolioHoldings,
  signals,
  tradingVolumes,
} from '../db/schema.js';
import {
  CATEGORY_LABELS,
  PRIORITY_RANK,
  priorityFromMultiple,
  priorityFromScore,
  type AnnouncementCategory,
  type Priority,
} from './classify.js';

/** Lowest user-configurable thresholds; anything below is never a signal. */
export const PRICE_FLOOR_PCT = 1.0;
export const VOLUME_FLOOR_MULTIPLE = 1.5;
export const DEFAULT_PRICE_THRESHOLD = 2.5;
export const DEFAULT_VOLUME_MULTIPLE = 2.0;

type SignalInsert = typeof signals.$inferInsert;

/** Inserts a signal unless one already exists for the same underlying event. */
export async function upsertSignal(values: SignalInsert): Promise<{ id: string; created: boolean }> {
  const inserted = await db.insert(signals).values(values).onConflictDoNothing({ target: signals.dedupKey }).returning({ id: signals.id });
  if (inserted[0]) return { id: inserted[0].id, created: true };
  const [existing] = await db.select({ id: signals.id }).from(signals).where(eq(signals.dedupKey, values.dedupKey));
  return { id: existing.id, created: false };
}

const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

/** Turns the latest market session into price-move and volume-surge signals. */
export async function generateMarketSignals() {
  const rows = await db
    .select({
      companyId: marketPrices.companyId,
      name: companies.name,
      symbol: companies.nseSymbol,
      tradeDate: marketPrices.tradeDate,
      lastPrice: marketPrices.lastPrice,
      previousClose: marketPrices.previousClose,
      changePercent: marketPrices.changePercent,
      asOf: marketPrices.asOf,
      provider: marketPrices.provider,
      isDemo: marketPrices.isDemo,
      volume: tradingVolumes.volume,
      avgVolume20d: tradingVolumes.avgVolume20d,
      volumeRatio: tradingVolumes.volumeRatio,
    })
    .from(marketPrices)
    .innerJoin(companies, eq(companies.id, marketPrices.companyId))
    .leftJoin(tradingVolumes, and(eq(tradingVolumes.companyId, marketPrices.companyId), eq(tradingVolumes.tradeDate, marketPrices.tradeDate)));

  const created: string[] = [];
  for (const r of rows) {
    const metrics = {
      changePercent: r.changePercent,
      lastPrice: r.lastPrice,
      previousClose: r.previousClose,
      volume: r.volume,
      avgVolume20d: r.avgVolume20d,
      volumeRatio: r.volumeRatio,
      tradeDate: r.tradeDate,
    };
    const evidence = [
      {
        label: 'Exchange close',
        detail: `${r.symbol} closed at ₹${r.lastPrice.toFixed(2)} on ${r.tradeDate} vs previous close ₹${r.previousClose.toFixed(2)} (${r.isDemo ? 'demo data' : r.provider}).`,
      },
      ...(r.volume !== null && r.avgVolume20d !== null
        ? [{ label: 'Volume', detail: `Traded ${Math.round(r.volume).toLocaleString('en-IN')} shares vs 20-session average ${Math.round(r.avgVolume20d).toLocaleString('en-IN')}.` }]
        : []),
    ];

    if (Math.abs(r.changePercent) >= PRICE_FLOOR_PCT) {
      const s = await upsertSignal({
        companyId: r.companyId,
        type: 'price_move',
        category: 'price_move',
        priority: priorityFromMultiple(Math.abs(r.changePercent) / DEFAULT_PRICE_THRESHOLD),
        materialityScore: Math.min(100, Math.round(Math.abs(r.changePercent) * 10)),
        title: `${r.name} ${r.changePercent > 0 ? 'rose' : 'fell'} ${fmtPct(r.changePercent)} in one session`,
        description: `Closing price moved ${fmtPct(r.changePercent)} versus the previous close${r.volumeRatio ? ` on ${r.volumeRatio.toFixed(2)}× its 20-session average volume` : ''}.`,
        metrics,
        evidence,
        dedupKey: `price_move:${r.companyId}:${r.tradeDate}`,
        occurredAt: r.asOf,
        isDemo: r.isDemo,
      });
      if (s.created) created.push(s.id);
    }

    if (r.volumeRatio !== null && r.volumeRatio >= VOLUME_FLOOR_MULTIPLE) {
      const s = await upsertSignal({
        companyId: r.companyId,
        type: 'volume_spike',
        category: 'volume_spike',
        priority: priorityFromMultiple(r.volumeRatio / DEFAULT_VOLUME_MULTIPLE),
        materialityScore: Math.min(100, Math.round(r.volumeRatio * 20)),
        title: `${r.name} traded ${r.volumeRatio.toFixed(2)}× its 20-session average volume`,
        description: `Volume of ${Math.round(r.volume ?? 0).toLocaleString('en-IN')} shares against a 20-session average of ${Math.round(r.avgVolume20d ?? 0).toLocaleString('en-IN')}; price ${fmtPct(r.changePercent)}.`,
        metrics,
        evidence,
        dedupKey: `volume_spike:${r.companyId}:${r.tradeDate}`,
        occurredAt: r.asOf,
        isDemo: r.isDemo,
      });
      if (s.created) created.push(s.id);
    }
  }
  return { evaluated: rows.length, created: created.length, signalIds: created };
}

export interface AlertPrefs {
  priceMoveThresholdPct: number;
  volumeSurgeMultiple: number;
  announcementCategories: string[];
  managementChangeAlerts: boolean;
  financialResultAlerts: boolean;
  eventAlerts: boolean;
  minimumPriority: Priority;
  inAppNotifications: boolean;
}

interface SignalForEvaluation {
  type: string;
  category: string;
  priority: Priority;
  metrics: Record<string, number | string | null>;
}

/**
 * Pure decision: should this user be notified about this signal, and at what priority?
 * Price and volume priority is re-derived relative to the user's own threshold.
 */
export function evaluateForPreferences(signal: SignalForEvaluation, prefs: AlertPrefs): { notify: boolean; priority: Priority } {
  if (!prefs.inAppNotifications) return { notify: false, priority: signal.priority };
  let priority = signal.priority;
  switch (signal.type) {
    case 'price_move': {
      const change = Math.abs(Number(signal.metrics.changePercent ?? 0));
      if (change < prefs.priceMoveThresholdPct) return { notify: false, priority };
      priority = priorityFromMultiple(change / prefs.priceMoveThresholdPct);
      break;
    }
    case 'volume_spike': {
      const ratio = Number(signal.metrics.volumeRatio ?? 0);
      if (ratio < prefs.volumeSurgeMultiple) return { notify: false, priority };
      priority = priorityFromMultiple(ratio / prefs.volumeSurgeMultiple);
      break;
    }
    case 'management_change':
      if (!prefs.managementChangeAlerts) return { notify: false, priority };
      break;
    case 'financial_result':
      if (!prefs.financialResultAlerts) return { notify: false, priority };
      break;
    case 'historical_precedent':
    case 'event_update':
      if (!prefs.eventAlerts) return { notify: false, priority };
      break;
    case 'corporate_announcement':
      // An empty list means "all material categories".
      if (prefs.announcementCategories.length > 0 && !prefs.announcementCategories.includes(signal.category)) {
        return { notify: false, priority };
      }
      break;
  }
  return { notify: PRIORITY_RANK[priority] >= PRIORITY_RANK[prefs.minimumPriority], priority };
}

/**
 * Creates notifications for the given signals (or for every signal on the user's
 * portfolio inside `sinceDays` of the newest data when `userId` is given).
 */
export async function fanOutNotifications(opts: { signalIds?: string[]; userId?: string; sinceDays?: number }) {
  const conditions = [];
  if (opts.signalIds) {
    if (opts.signalIds.length === 0) return { created: 0 };
    conditions.push(inArray(signals.id, opts.signalIds));
  }
  if (opts.userId) conditions.push(eq(portfolioHoldings.userId, opts.userId));
  if (opts.sinceDays !== undefined) {
    conditions.push(gte(signals.occurredAt, sql`(select coalesce(max(occurred_at), now()) from signals) - make_interval(days => ${opts.sinceDays})`));
  }

  const rows = await db
    .select({
      signalId: signals.id,
      type: signals.type,
      category: signals.category,
      priority: signals.priority,
      metrics: signals.metrics,
      title: signals.title,
      description: signals.description,
      userId: portfolioHoldings.userId,
      prefs: alertPreferences,
    })
    .from(signals)
    .innerJoin(portfolioHoldings, eq(portfolioHoldings.companyId, signals.companyId))
    .innerJoin(alertPreferences, eq(alertPreferences.userId, portfolioHoldings.userId))
    .where(conditions.length ? and(...conditions) : undefined);

  const toInsert = rows.flatMap((r) => {
    const decision = evaluateForPreferences(r, r.prefs);
    return decision.notify
      ? [{ userId: r.userId, signalId: r.signalId, title: r.title, body: r.description, priority: decision.priority }]
      : [];
  });
  if (toInsert.length === 0) return { created: 0 };
  const inserted = await db.insert(notifications).values(toInsert).onConflictDoNothing().returning({ id: notifications.id });
  return { created: inserted.length };
}

export async function getPreferences(userId: string): Promise<AlertPrefs> {
  const [row] = await db.select().from(alertPreferences).where(eq(alertPreferences.userId, userId));
  if (row) return row;
  const [created] = await db.insert(alertPreferences).values({ userId }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(alertPreferences).where(eq(alertPreferences.userId, userId)))[0];
}

/** Which signals pass this user's preferences (used by GET /api/signals). */
export async function signalsVisibleTo(userId: string, opts: { companyId?: string; limit: number; offset: number; type?: string }) {
  const prefs = await getPreferences(userId);
  const rows = await db
    .select({ signal: signals, company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol, bseCode: companies.bseCode } })
    .from(signals)
    .innerJoin(companies, eq(companies.id, signals.companyId))
    .innerJoin(portfolioHoldings, and(eq(portfolioHoldings.companyId, signals.companyId), eq(portfolioHoldings.userId, userId)))
    .where(
      and(
        opts.companyId ? eq(signals.companyId, opts.companyId) : undefined,
        opts.type ? sql`${signals.type} = ${opts.type}` : undefined,
      ),
    )
    .orderBy(desc(signals.occurredAt), desc(signals.materialityScore));
  // Thresholds are user-specific, so filtering happens after the query; portfolios are small.
  const visible = rows
    .map((r) => ({ ...r, decision: evaluateForPreferences({ ...r.signal, priority: r.signal.priority }, { ...prefs, minimumPriority: 'low', inAppNotifications: true }) }))
    .filter((r) => r.decision.notify)
    .map((r) => ({ ...r.signal, priority: r.decision.priority, company: r.company }));
  return { total: visible.length, items: visible.slice(opts.offset, opts.offset + opts.limit) };
}

const SIGNAL_LABELS: Record<string, string> = {
  price_move: 'Price movement',
  volume_spike: 'Volume surge',
  historical_precedent: 'Historical precedent',
  event_delayed: 'Project delayed',
  event_completed: 'Project completed',
  event_abandoned: 'Project abandoned',
  event_on_track: 'Project on track',
};

export function categoryLabel(category: string): string {
  const label = CATEGORY_LABELS[category as AnnouncementCategory] ?? SIGNAL_LABELS[category] ?? category.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export { priorityFromScore };
