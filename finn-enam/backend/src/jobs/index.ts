/**
 * Background ingestion jobs. Each run is recorded in job_runs; a job never overlaps itself.
 *
 *   market         EOD candles → volume stats → price/volume signals → notifications
 *   announcements  filings → classification → signals, results, management changes,
 *                  Event Memory extraction, similar-event matching, precedent alerts
 *   event-intelligence  (manual) embeddings for events stored before AI was configured,
 *                  semantic re-matching, AI precedent assessments
 *
 * Schedules use Asia/Kolkata time (NSE closes 15:30 IST).
 */
import cron from 'node-cron';
import { eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, corporateEvents, eventSimilarities, jobRuns } from '../db/schema.js';
import { fanOutNotifications, generateMarketSignals } from '../services/alerts.js';
import { ingestAnnouncements } from '../services/announcements.js';
import { ingestMarketData } from '../services/market.js';
import { liveFinancials } from '../providers/registry.js';
import { syncCompany } from '../services/companyData.js';
import { embedEvent, matchSimilarEvents } from '../services/events.js';
import { assessPrecedents } from '../services/eventAnalysis.js';
import { embeddingsAvailable } from '../ai/gateway.js';
import { features } from '../config/env.js';

/** Backfills AI for Event Memory: embeddings, semantic matching, precedent assessments (bounded). */
async function eventIntelligence() {
  if (!features.ai) return { skipped: true, reason: 'AI is not configured' };
  let embedded = 0;
  let rematched = 0;
  if (embeddingsAvailable()) {
    const missing = await db.select().from(corporateEvents).where(isNull(corporateEvents.embedding)).limit(100);
    for (const e of missing) {
      await embedEvent(e);
      embedded++;
    }
    // Recompute links so semantic similarity contributes to the scores.
    for (const e of missing) {
      await matchSimilarEvents(e.id);
      rematched++;
    }
  }
  const pending = await db
    .selectDistinct({ eventId: eventSimilarities.eventId })
    .from(eventSimilarities)
    .where(sql`not exists (select 1 from ${eventSimilarities} s2 where s2.event_id = ${eventSimilarities.eventId} and s2.ai_assessment is not null)`)
    .limit(50);
  let assessed = 0;
  for (const p of pending) assessed += await assessPrecedents(p.eventId);
  return { embedded, rematched, eventsAssessed: pending.length, assessmentsStored: assessed };
}

/** Refresh prices (and quote metadata) for every company from Yahoo Finance. */
async function syncAllMarketData() {
  const list = await db.select({ id: companies.id }).from(companies);
  const failures: string[] = [];
  let fetched = 0;
  for (const c of list) {
    const r = await syncCompany(c.id, { force: true, datasets: ['history', 'profile'] });
    if (r.results.some((x) => x.status === 'failed')) failures.push(c.id);
    else fetched++;
  }
  return { provider: 'yfinance', companies: list.length, refreshed: fetched, failures };
}

export const JOBS = {
  market: async () => {
    const ingest = liveFinancials ? await syncAllMarketData() : await ingestMarketData();
    const signals = await generateMarketSignals();
    const fanned = await fanOutNotifications({ signalIds: signals.signalIds });
    return { ...ingest, signalsCreated: signals.created, notifications: fanned.created };
  },
  announcements: async () => ingestAnnouncements(),
  'event-intelligence': eventIntelligence,
} satisfies Record<string, () => Promise<Record<string, unknown>>>;

export type JobName = keyof typeof JOBS;

const running = new Set<JobName>();

export async function runJob(name: JobName) {
  if (running.has(name)) return { skipped: true, reason: 'already running' };
  running.add(name);
  const [run] = await db.insert(jobRuns).values({ job: name, status: 'running' }).returning();
  try {
    const stats = await JOBS[name]();
    await db.update(jobRuns).set({ status: 'succeeded', finishedAt: new Date(), stats }).where(eq(jobRuns.id, run.id));
    return stats;
  } catch (err) {
    await db.update(jobRuns).set({ status: 'failed', finishedAt: new Date(), error: (err as Error).message }).where(eq(jobRuns.id, run.id));
    throw err;
  } finally {
    running.delete(name);
  }
}

export function startScheduler() {
  const opts = { timezone: 'Asia/Kolkata' };
  // After the NSE close on weekdays, and a catch-up run in the morning.
  cron.schedule('45 16 * * 1-5', () => void runJob('market').catch((e) => console.error('[jobs] market failed:', e.message)), opts);
  cron.schedule('30 8 * * 1-5', () => void runJob('market').catch((e) => console.error('[jobs] market failed:', e.message)), opts);
  // Filings arrive through the day.
  cron.schedule('*/30 8-22 * * *', () => void runJob('announcements').catch((e) => console.error('[jobs] announcements failed:', e.message)), opts);
  console.log('[jobs] scheduler started (market 16:45 & 08:30 IST weekdays; announcements every 30 min 08:00–22:00 IST)');
}
