/**
 * Asynchronous research generation.
 *
 * POST /research/:companyId/generate|refresh creates a job and returns immediately; the job runs
 * in this process (no extra infrastructure) and writes its stage, per-section progress and the
 * sections completed so far to `research_jobs`, which the client polls. Job state lives in Neon,
 * so it survives page reloads; jobs interrupted by a server restart are marked failed at startup.
 *
 * Identical concurrent requests (same user, company and mode) share one job. At most
 * MAX_RUNNING jobs execute at once so Yahoo Finance and the AI provider are not flooded.
 */
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, researchJobs } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { generateReport, type ResearchProgress } from './research.js';

export type ResearchMode = 'generate' | 'refresh_ai' | 'refresh_all';
type JobRow = typeof researchJobs.$inferSelect;

const MAX_RUNNING = 3;
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
      await update(job.id, { status: 'failed', stage: 'done', error: (err as Error).message.slice(0, 500), finishedAt: new Date() });
    }
  });
}

export async function startResearchJob(companyId: string, userId: string, mode: ResearchMode) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId), columns: { id: true } });
  if (!company) throw ApiError.notFound('Company not found');
  // De-duplicate: an identical job started in the last 10 minutes and still active is reused.
  const active = await db.query.researchJobs.findFirst({
    where: and(
      eq(researchJobs.companyId, companyId),
      eq(researchJobs.requestedBy, userId),
      eq(researchJobs.mode, mode),
      inArray(researchJobs.status, ['queued', 'running']),
      gt(researchJobs.createdAt, new Date(Date.now() - 10 * 60_000)),
    ),
  });
  if (active) return { job: active, deduplicated: true };
  const [job] = await db.insert(researchJobs).values({ companyId, requestedBy: userId, mode }).returning();
  setImmediate(() => void run(job));
  return { job, deduplicated: false };
}

/** Owner-only: another user's job id is indistinguishable from a missing one. */
export async function getResearchJob(jobId: string, userId: string) {
  const job = await db.query.researchJobs.findFirst({ where: and(eq(researchJobs.id, jobId), eq(researchJobs.requestedBy, userId)) });
  if (!job) throw ApiError.notFound('Research job not found');
  return job;
}

/** The user's in-flight job for a company, so a reloaded page resumes showing progress. */
export async function activeResearchJob(companyId: string, userId: string) {
  return (
    (await db.query.researchJobs.findFirst({
      where: and(eq(researchJobs.companyId, companyId), eq(researchJobs.requestedBy, userId), inArray(researchJobs.status, ['queued', 'running'])),
      orderBy: desc(researchJobs.createdAt),
    })) ?? null
  );
}

/** Jobs cannot survive a process restart; mark them failed so clients stop waiting. */
export async function failInterruptedJobs() {
  const rows = await db
    .update(researchJobs)
    .set({ status: 'failed', stage: 'done', error: 'Interrupted by a server restart. Please generate the research again.', finishedAt: new Date(), updatedAt: new Date() })
    .where(inArray(researchJobs.status, ['queued', 'running']))
    .returning({ id: researchJobs.id });
  return rows.length;
}
