/**
 * Asynchronous research generation.
 *
 * POST /research/:companyId/generate|refresh creates a job and returns immediately; the job runs
 * in this process (no extra infrastructure) and writes its stage, per-section progress and the
 * sections completed so far to `research_jobs`. Job state lives in Neon, so it is independent of
 * any page or tab: the client can leave, reload and come back, and finds the job by id, by company
 * (latest job) or in the user's list of active jobs.
 *
 * - One active job per user and company: a second request while one is queued or running returns
 *   that job, so two jobs can never race to produce the "latest" report.
 * - A running job touches `updated_at` every minute (heartbeat). A job that stops updating for
 *   STALE_MS (its worker died without a restart) is marked failed and can be retried. Jobs left
 *   active by a server restart are marked failed at startup.
 * - At most MAX_RUNNING jobs execute at once so Yahoo Finance and the AI provider are not flooded.
 */
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, researchJobs } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { generateReport, type ResearchProgress } from './research.js';

export type ResearchMode = 'generate' | 'refresh_ai' | 'refresh_all';
type JobRow = typeof researchJobs.$inferSelect;

const MAX_RUNNING = 3;
const HEARTBEAT_MS = 60_000;
export const STALE_MS = 15 * 60_000;
const ACTIVE = ['queued', 'running'];
let running = 0;
const queue: Array<() => void> = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_RUNNING) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

async function update(id: string, values: Partial<typeof researchJobs.$inferInsert>) {
  await db.update(researchJobs).set({ ...values, updatedAt: new Date() }).where(eq(researchJobs.id, id));
}

async function run(job: JobRow) {
  await slot(async () => {
    await update(job.id, { status: 'running', stage: 'data' });
    // Long stages (e.g. an AI call with retries) still show the job is alive.
    const heartbeat = setInterval(() => void update(job.id, {}).catch(() => undefined), HEARTBEAT_MS);
    try {
      const result = await generateReport(job.companyId, job.requestedBy, {
        refreshData: job.mode === 'refresh_all',
        forceAi: job.mode !== 'generate',
        onProgress: async (p: ResearchProgress) => {
          await update(job.id, {
            stage: p.stage,
            ...(p.progress ? { progress: p.progress } : {}),
            ...(p.sections ? { partial: p.sections as unknown as Record<string, unknown> } : {}),
            ...(p.timings ? { timings: p.timings } : {}),
          });
        },
      });
      await update(job.id, {
        status: 'succeeded',
        stage: 'done',
        reportId: result.report.id,
        reused: result.reused,
        timings: result.timings,
        partial: null,
        finishedAt: new Date(),
      });
    } catch (err) {
      console.error('[research] job failed:', (err as Error).message);
      await update(job.id, { status: 'failed', stage: 'done', partial: null, error: (err as Error).message.slice(0, 500), finishedAt: new Date() }).catch(() => undefined);
    } finally {
      clearInterval(heartbeat);
    }
  });
}

/**
 * Marks jobs that stopped updating as failed (their worker is gone). Throttled: runs at most every
 * 30 s, so frequent status polls do not each issue an UPDATE.
 */
let lastReap = 0;
export async function reapStaleJobs(force = false) {
  if (!force && Date.now() - lastReap < 30_000) return 0;
  lastReap = Date.now();
  const rows = await db
    .update(researchJobs)
    .set({ status: 'failed', stage: 'done', partial: null, error: 'Research stopped responding and was cancelled. Please try again.', finishedAt: new Date(), updatedAt: new Date() })
    .where(and(inArray(researchJobs.status, ACTIVE), lt(researchJobs.updatedAt, new Date(Date.now() - STALE_MS))))
    .returning({ id: researchJobs.id });
  return rows.length;
}

export async function startResearchJob(companyId: string, userId: string, mode: ResearchMode) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId), columns: { id: true } });
  if (!company) throw ApiError.notFound('Company not found');
  await reapStaleJobs(true);
  // One active job per user and company, whatever its mode: a second request joins it.
  const active = await db.query.researchJobs.findFirst({
    where: and(eq(researchJobs.companyId, companyId), eq(researchJobs.requestedBy, userId), inArray(researchJobs.status, ACTIVE)),
    orderBy: desc(researchJobs.createdAt),
  });
  if (active) return { job: active, deduplicated: true };
  const [job] = await db.insert(researchJobs).values({ companyId, requestedBy: userId, mode }).returning();
  setImmediate(() => void run(job));
  return { job, deduplicated: false };
}

/** Owner-only: another user's job id is indistinguishable from a missing one. */
export async function getResearchJob(jobId: string, userId: string) {
  await reapStaleJobs();
  const job = await db.query.researchJobs.findFirst({ where: and(eq(researchJobs.id, jobId), eq(researchJobs.requestedBy, userId)) });
  if (!job) throw ApiError.notFound('Research job not found');
  return job;
}

/** Status fields only (no partial sections), for lists and the research page header. */
const summaryColumns = {
  id: researchJobs.id,
  companyId: researchJobs.companyId,
  status: researchJobs.status,
  stage: researchJobs.stage,
  mode: researchJobs.mode,
  error: researchJobs.error,
  reportId: researchJobs.reportId,
  reused: researchJobs.reused,
  createdAt: researchJobs.createdAt,
  updatedAt: researchJobs.updatedAt,
  finishedAt: researchJobs.finishedAt,
};

/** The user's in-flight job for a company, so a reloaded page resumes showing progress. */
export async function activeResearchJob(companyId: string, userId: string) {
  await reapStaleJobs();
  return (
    (await db.query.researchJobs.findFirst({
      where: and(eq(researchJobs.companyId, companyId), eq(researchJobs.requestedBy, userId), inArray(researchJobs.status, ACTIVE)),
      orderBy: desc(researchJobs.createdAt),
    })) ?? null
  );
}

/** The user's most recent job for a company, finished or not (completed time, or the failure to retry). */
export async function latestResearchJob(companyId: string, userId: string) {
  const [row] = await db
    .select(summaryColumns)
    .from(researchJobs)
    .where(and(eq(researchJobs.companyId, companyId), eq(researchJobs.requestedBy, userId)))
    .orderBy(desc(researchJobs.createdAt))
    .limit(1);
  return row ?? null;
}

/** All of the user's queued or running jobs, with the company, for app-wide progress tracking. */
export async function listActiveResearchJobs(userId: string) {
  await reapStaleJobs();
  return db
    .select({ ...summaryColumns, company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol, yahooSymbol: companies.yahooSymbol } })
    .from(researchJobs)
    .innerJoin(companies, eq(companies.id, researchJobs.companyId))
    .where(and(eq(researchJobs.requestedBy, userId), inArray(researchJobs.status, ACTIVE)))
    .orderBy(desc(researchJobs.createdAt))
    .limit(20);
}

/** Jobs cannot survive a process restart; mark them failed so clients stop waiting. */
export async function failInterruptedJobs() {
  const rows = await db
    .update(researchJobs)
    .set({ status: 'failed', stage: 'done', partial: null, error: 'Interrupted by a server restart. Please try again.', finishedAt: new Date(), updatedAt: new Date() })
    .where(inArray(researchJobs.status, ACTIVE))
    .returning({ id: researchJobs.id });
  return rows.length;
}
