/**
 * Event Memory: FINN's persistent institutional memory of corporate commitments.
 *
 * Lifecycle: announced → initiated → in_progress → on_track | delayed → completed | abandoned,
 * or outcome_unverified when no evidence ever arrives. Terminal outcomes require evidence and
 * produce an execution record (planned vs actual timeline, capex and capacity).
 * Every new event is compared with historical events; a qualifying precedent with a known
 * outcome raises a "Historical precedent detected" signal.
 */
import { and, desc, eq, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  companies,
  corporateEvents,
  eventExecutionRecords,
  eventMilestones,
  eventSimilarities,
  portfolioHoldings,
  sourceDocuments,
} from '../db/schema.js';
import { embedTexts, embeddingsAvailable } from '../ai/gateway.js';
import { assessPrecedents } from './eventAnalysis.js';
import { ApiError } from '../lib/http.js';
import { fanOutNotifications, upsertSignal } from './alerts.js';
import { eventsMatchingAsPrecedent, outcomeLabel } from './eventLinks.js';
import { sha256 } from './auth.js';
import { upsertSourceDocument } from './documents.js';
import {
  combineScores,
  daysBetween,
  monthsBetween,
  qualifies,
  scoreStructured,
  type ComparableEvent,
} from './similarity.js';

export const EVENT_CATEGORIES = [
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
] as const;

export const EVENT_STATUSES = [
  'announced',
  'initiated',
  'in_progress',
  'on_track',
  'delayed',
  'completed',
  'abandoned',
  'outcome_unverified',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const OUTCOME_STATUSES: EventStatus[] = ['completed', 'delayed', 'abandoned'];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const sourceDocumentInput = z.object({
  title: z.string().trim().min(3).max(300),
  url: z.string().url().max(1000).nullable().optional(),
  documentType: z
    .enum(['exchange_filing', 'annual_report', 'quarterly_results', 'investor_presentation', 'earnings_call_transcript', 'press_release', 'other'])
    .default('exchange_filing'),
  publishedAt: isoDate.nullable().optional(),
  periodLabel: z.string().max(40).nullable().optional(),
});

export const createEventInput = z.object({
  companyId: z.string().uuid(),
  category: z.enum(EVENT_CATEGORIES),
  projectType: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(5).max(200),
  originalAnnouncement: z.string().trim().min(10).max(5000),
  announcedAt: isoDate,
  sourceDocumentId: z.string().uuid().nullable().optional(),
  sourceDocument: sourceDocumentInput.nullable().optional(),
  investmentSignificance: z.string().trim().max(2000).nullable().optional(),
  expectedCapexCr: z.number().nonnegative().nullable().optional(),
  expectedCapacityValue: z.number().nonnegative().nullable().optional(),
  expectedCapacityUnit: z.string().trim().max(40).nullable().optional(),
  expectedCompletionDate: isoDate.nullable().optional(),
  expectedImpact: z.string().trim().max(2000).nullable().optional(),
  commitments: z.array(z.string().trim().min(3).max(500)).max(20).default([]),
});
export type CreateEventInput = z.infer<typeof createEventInput>;

export const executionInput = z.object({
  actualCompletionDate: isoDate.nullable().optional(),
  revisedCompletionDate: isoDate.nullable().optional(),
  actualCapexCr: z.number().nonnegative().nullable().optional(),
  actualCapacityValue: z.number().nonnegative().nullable().optional(),
});

const evidenceInput = {
  sourceDocumentId: z.string().uuid().nullable().optional(),
  sourceDocument: sourceDocumentInput.nullable().optional(),
  evidenceExcerpt: z.string().trim().max(4000).nullable().optional(),
};

export const updateEventInput = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    projectType: z.string().trim().max(80).nullable().optional(),
    investmentSignificance: z.string().trim().max(2000).nullable().optional(),
    expectedCapexCr: z.number().nonnegative().nullable().optional(),
    expectedCapacityValue: z.number().nonnegative().nullable().optional(),
    expectedCapacityUnit: z.string().trim().max(40).nullable().optional(),
    expectedCompletionDate: isoDate.nullable().optional(),
    expectedImpact: z.string().trim().max(2000).nullable().optional(),
    commitments: z.array(z.string().trim().min(3).max(500)).max(20).optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    statusNote: z.string().trim().max(2000).optional(),
    execution: executionInput.optional(),
    ...evidenceInput,
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const milestoneInput = z.object({
  milestoneDate: isoDate,
  statusAfter: z.enum(EVENT_STATUSES),
  description: z.string().trim().min(5).max(2000),
  reportedMetric: z.string().trim().max(200).nullable().optional(),
  execution: executionInput.optional(),
  ...evidenceInput,
});

type EventRow = typeof corporateEvents.$inferSelect;

function eventDedupHash(input: { companyId: string; category: string; title: string; announcedAt: string }) {
  const title = input.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return sha256(`${input.companyId}|${input.category}|${title}|${input.announcedAt}`);
}

async function resolveEvidenceDocument(
  companyId: string,
  input: { sourceDocumentId?: string | null; sourceDocument?: z.infer<typeof sourceDocumentInput> | null },
): Promise<string | null> {
  if (input.sourceDocumentId) {
    const [doc] = await db.select({ id: sourceDocuments.id }).from(sourceDocuments).where(eq(sourceDocuments.id, input.sourceDocumentId));
    if (!doc) throw ApiError.unprocessable('sourceDocumentId does not exist');
    return doc.id;
  }
  if (input.sourceDocument) {
    return upsertSourceDocument(
      {
        title: input.sourceDocument.title,
        url: input.sourceDocument.url ?? null,
        documentType: input.sourceDocument.documentType,
        publishedAt: input.sourceDocument.publishedAt ?? null,
        periodLabel: input.sourceDocument.periodLabel ?? null,
        excerpt: null,
      },
      { companyId, provider: 'user', isDemo: false },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Create + similarity
// ---------------------------------------------------------------------------

export async function createEvent(
  input: CreateEventInput,
  ctx: { userId?: string | null; extractionMethod: 'manual' | 'rules' | 'ai' | 'demo-fixture'; isDemo?: boolean },
) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, input.companyId) });
  if (!company) throw ApiError.unprocessable('companyId does not exist');
  if (input.expectedCompletionDate && input.expectedCompletionDate < input.announcedAt) {
    throw ApiError.unprocessable('expectedCompletionDate cannot be before announcedAt');
  }
  const sourceDocumentId = await resolveEvidenceDocument(input.companyId, input);
  const dedupHash = eventDedupHash(input);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(corporateEvents)
      .values({
        companyId: input.companyId,
        category: input.category,
        projectType: input.projectType ?? null,
        title: input.title,
        originalAnnouncement: input.originalAnnouncement,
        announcedAt: input.announcedAt,
        sourceDocumentId,
        investmentSignificance: input.investmentSignificance ?? null,
        expectedCapexCr: input.expectedCapexCr ?? null,
        expectedCapacityValue: input.expectedCapacityValue ?? null,
        expectedCapacityUnit: input.expectedCapacityUnit ?? null,
        expectedCompletionDate: input.expectedCompletionDate ?? null,
        expectedImpact: input.expectedImpact ?? null,
        commitments: input.commitments,
        status: 'announced',
        extractionMethod: ctx.extractionMethod,
        dedupHash,
        createdBy: ctx.userId ?? null,
        isDemo: ctx.isDemo ?? false,
      })
      .onConflictDoNothing({ target: corporateEvents.dedupHash })
      .returning();
    if (!row) return null;
    await tx.insert(eventMilestones).values({
      eventId: row.id,
      milestoneDate: input.announcedAt,
      statusAfter: 'announced',
      description: 'Commitment announced.',
      sourceDocumentId,
      evidenceExcerpt: input.originalAnnouncement.slice(0, 1000),
      createdBy: ctx.userId ?? null,
      isDemo: ctx.isDemo ?? false,
    });
    return row;
  });

  if (!created) {
    const [existing] = await db.select().from(corporateEvents).where(eq(corporateEvents.dedupHash, dedupHash));
    return { event: existing, created: false, matches: [] as SimilarMatch[], precedentSignalId: null as string | null };
  }

  await embedEvent(created);
  const { matches, precedentSignalId } = await matchSimilarEvents(created.id);
  // AI comparison with the stored precedents runs in the background; matching never waits on it.
  if (matches.length) void assessPrecedents(created.id, { userId: ctx.userId ?? null }).catch((err: Error) => console.warn('[events] precedent assessment:', err.message));
  return { event: created, created: true, matches, precedentSignalId };
}

export async function embedEvent(event: EventRow) {
  if (!embeddingsAvailable()) return;
  try {
    const [vec] = await embedTexts([`${event.title}. ${event.originalAnnouncement}`]);
    if (vec) await db.update(corporateEvents).set({ embedding: vec }).where(eq(corporateEvents.id, event.id));
  } catch (err) {
    // Semantic scoring is an enhancement; structured matching still runs.
    console.warn('[events] embedding failed:', (err as Error).message);
  }
}

export interface SimilarMatch {
  similarEventId: string;
  structuredScore: number;
  semanticScore: number | null;
  combinedScore: number;
  matchedOn: string[];
  explanation: string;
}

function comparable(e: EventRow): ComparableEvent {
  return {
    id: e.id,
    companyId: e.companyId,
    category: e.category,
    projectType: e.projectType,
    title: e.title,
    originalAnnouncement: e.originalAnnouncement,
    expectedCapexCr: e.expectedCapexCr,
    expectedCapacityUnit: e.expectedCapacityUnit,
  };
}

function describeOutcome(prior: EventRow, exec: typeof eventExecutionRecords.$inferSelect | undefined): string {
  const planned =
    prior.expectedCompletionDate ? `${Math.round(monthsBetween(prior.announcedAt, prior.expectedCompletionDate))} months` : null;
  if (exec?.outcome === 'abandoned' || prior.status === 'abandoned') return 'The project was later abandoned.';
  if (exec?.delayDays !== null && exec?.delayDays !== undefined) {
    const months = Math.round((exec.delayDays / 30.44) * 10) / 10;
    const lead = planned ? `It was expected to complete in ${planned}` : 'It had a disclosed completion target';
    if (exec.delayDays <= 30) return `${lead} and was delivered on schedule.`;
    return `${lead} but ${exec.outcome === 'completed' ? 'was completed' : 'is running'} approximately ${months} months late.`;
  }
  if (prior.status === 'delayed') return `${planned ? `It was expected to complete in ${planned} and ` : ''}has been reported as delayed.`;
  if (prior.status === 'completed') return 'It was reported as completed.';
  return `Its outcome has not yet been verified (status: ${prior.status.replace(/_/g, ' ')}).`;
}

function precedentExplanation(prior: EventRow, sameCompany: boolean, exec?: typeof eventExecutionRecords.$inferSelect) {
  const who = sameCompany ? 'This company' : 'A comparable company';
  const kind = prior.category.replace(/_/g, ' ');
  const year = prior.announcedAt.slice(0, 4);
  return `${who} previously announced a similar ${kind} in ${year} ("${prior.title}"). ${describeOutcome(prior, exec)}`;
}

/** Scores historical candidates for an event and records qualifying matches. */
export async function matchSimilarEvents(eventId: string) {
  const [event] = await db.select().from(corporateEvents).where(eq(corporateEvents.id, eventId));
  if (!event) throw ApiError.notFound('Event not found');

  const semanticExpr = event.embedding
    ? sql<number | null>`case when ${corporateEvents.embedding} is not null then 1 - (${corporateEvents.embedding} <=> ${JSON.stringify(event.embedding)}::vector) end`
    : sql<number | null>`null`;

  const candidates = await db
    .select({ row: corporateEvents, semantic: semanticExpr })
    .from(corporateEvents)
    .where(
      and(
        sql`${corporateEvents.id} <> ${event.id}`,
        lte(corporateEvents.announcedAt, event.announcedAt),
        or(eq(corporateEvents.companyId, event.companyId), eq(corporateEvents.category, event.category)),
      ),
    )
    .limit(500);

  const execs = candidates.length
    ? await db.select().from(eventExecutionRecords).where(inArray(eventExecutionRecords.eventId, candidates.map((c) => c.row.id)))
    : [];
  const execByEvent = new Map(execs.map((e) => [e.eventId, e]));

  const matches: SimilarMatch[] = [];
  for (const c of candidates) {
    const structured = scoreStructured(comparable(event), comparable(c.row));
    const semantic = c.semantic === null ? null : Math.max(0, Math.min(1, Number(c.semantic)));
    const combined = combineScores(structured.score, semantic);
    if (!qualifies(comparable(event), comparable(c.row), combined)) continue;
    matches.push({
      similarEventId: c.row.id,
      structuredScore: structured.score,
      semanticScore: semantic === null ? null : Math.round(semantic * 1000) / 1000,
      combinedScore: combined,
      matchedOn: semantic !== null && semantic >= 0.6 ? [...structured.matchedOn, 'semantically similar'] : structured.matchedOn,
      explanation: precedentExplanation(c.row, c.row.companyId === event.companyId, execByEvent.get(c.row.id)),
    });
  }
  // Same-company history is the primary precedent; other companies only when none exists.
  const companyOf = new Map(candidates.map((c) => [c.row.id, c.row.companyId]));
  matches.sort((a, b) => {
    const sa = companyOf.get(a.similarEventId) === event.companyId ? 1 : 0;
    const sb = companyOf.get(b.similarEventId) === event.companyId ? 1 : 0;
    return sb - sa || b.combinedScore - a.combinedScore;
  });
  const top = matches.slice(0, 10);

  if (top.length) {
    await db
      .insert(eventSimilarities)
      .values(top.map((m) => ({ eventId: event.id, ...m })))
      .onConflictDoUpdate({
        target: [eventSimilarities.eventId, eventSimilarities.similarEventId],
        set: {
          structuredScore: sql`excluded.structured_score`,
          semanticScore: sql`excluded.semantic_score`,
          combinedScore: sql`excluded.combined_score`,
          matchedOn: sql`excluded.matched_on`,
          explanation: sql`excluded.explanation`,
        },
      });
  }

  // Raise a precedent alert for the strongest match whose outcome is known.
  const priorById = new Map(candidates.map((c) => [c.row.id, c.row]));
  const precedent = top.find((m) => {
    const prior = priorById.get(m.similarEventId)!;
    return execByEvent.has(prior.id) || ['completed', 'delayed', 'abandoned'].includes(prior.status);
  });
  let precedentSignalId: string | null = null;
  if (precedent) {
    const prior = priorById.get(precedent.similarEventId)!;
    const exec = execByEvent.get(prior.id);
    const company = await db.query.companies.findFirst({ where: eq(companies.id, event.companyId) });
    const signal = await upsertSignal({
      companyId: event.companyId,
      type: 'historical_precedent',
      category: 'historical_precedent',
      priority: exec && (exec.delayDays ?? 0) > 90 ? 'high' : 'medium',
      materialityScore: Math.round(precedent.combinedScore * 100),
      title: `Historical precedent detected: ${company?.name ?? 'company'}`,
      description: precedent.explanation,
      metrics: {
        similarity: precedent.combinedScore,
        priorAnnouncedAt: prior.announcedAt,
        priorExpectedCompletion: prior.expectedCompletionDate,
        priorActualCompletion: exec?.actualCompletionDate ?? null,
        priorDelayDays: exec?.delayDays ?? null,
      },
      evidence: [
        { label: 'New announcement', detail: event.title, sourceDocumentId: event.sourceDocumentId },
        { label: 'Historical event', detail: `${prior.title} (announced ${prior.announcedAt})`, sourceDocumentId: prior.sourceDocumentId },
        ...(exec ? [{ label: 'Recorded outcome', detail: exec.evidenceExcerpt, sourceDocumentId: exec.sourceDocumentId }] : []),
      ],
      sourceDocumentId: event.sourceDocumentId,
      eventId: event.id,
      dedupKey: `historical_precedent:${event.id}:${prior.id}`,
      occurredAt: new Date(`${event.announcedAt}T12:00:00Z`),
      isDemo: event.isDemo || prior.isDemo,
    });
    precedentSignalId = signal.id;
    if (signal.created) await fanOutNotifications({ signalIds: [signal.id] });
  }
  return { matches: top, precedentSignalId };
}

// ---------------------------------------------------------------------------
// Execution tracking
// ---------------------------------------------------------------------------

export function computeExecution(
  event: Pick<EventRow, 'announcedAt' | 'expectedCompletionDate' | 'expectedCapexCr' | 'expectedCapacityValue'>,
  outcome: 'completed' | 'delayed' | 'abandoned',
  exec: z.infer<typeof executionInput>,
) {
  const endDate = exec.actualCompletionDate ?? exec.revisedCompletionDate ?? null;
  const plannedDurationDays = event.expectedCompletionDate ? daysBetween(event.announcedAt, event.expectedCompletionDate) : null;
  const actualDurationDays = exec.actualCompletionDate ? daysBetween(event.announcedAt, exec.actualCompletionDate) : null;
  const delayDays = endDate && event.expectedCompletionDate ? daysBetween(event.expectedCompletionDate, endDate) : null;
  const pct = (actual: number | null | undefined, expected: number | null) =>
    actual !== null && actual !== undefined && expected ? Math.round(((actual - expected) / expected) * 1000) / 10 : null;
  const capexVariancePct = pct(exec.actualCapexCr, event.expectedCapexCr);
  const capacityVariancePct = pct(exec.actualCapacityValue, event.expectedCapacityValue);
  let guidanceAccuracy: string | null = null;
  if (outcome === 'abandoned') guidanceAccuracy = 'missed';
  else if (delayDays !== null) {
    const capexOk = capexVariancePct === null || Math.abs(capexVariancePct) <= 10;
    guidanceAccuracy = delayDays <= 30 && capexOk ? 'accurate' : delayDays <= 90 ? 'minor_slip' : 'major_slip';
  }
  return { plannedDurationDays, actualDurationDays, delayDays, capexVariancePct, capacityVariancePct, guidanceAccuracy };
}

function requireOutcomeEvidence(
  status: EventStatus,
  docId: string | null,
  excerpt: string | null | undefined,
  exec: z.infer<typeof executionInput> | undefined,
) {
  if (!OUTCOME_STATUSES.includes(status)) return;
  if (!docId || !excerpt?.trim()) {
    throw ApiError.unprocessable(
      `Marking an event as ${status} requires supporting evidence: a source document and an evidence excerpt.`,
    );
  }
  if (status === 'completed' && !exec?.actualCompletionDate) {
    throw ApiError.unprocessable('Marking an event as completed requires execution.actualCompletionDate.');
  }
}

async function recordOutcome(
  event: EventRow,
  status: EventStatus,
  docId: string | null,
  excerpt: string,
  exec: z.infer<typeof executionInput> = {},
) {
  if (!OUTCOME_STATUSES.includes(status)) return;
  const outcome = status as 'completed' | 'delayed' | 'abandoned';
  const metrics = computeExecution(event, outcome, exec);
  const values = {
    eventId: event.id,
    outcome,
    actualCompletionDate: exec.actualCompletionDate ?? null,
    actualCapexCr: exec.actualCapexCr ?? null,
    actualCapacityValue: exec.actualCapacityValue ?? null,
    ...metrics,
    sourceDocumentId: docId,
    evidenceExcerpt: excerpt,
    isDemo: event.isDemo,
  };
  await db.insert(eventExecutionRecords).values(values).onConflictDoUpdate({ target: eventExecutionRecords.eventId, set: values });
}

async function raiseStatusSignal(event: EventRow, status: EventStatus, note: string) {
  if (!['delayed', 'completed', 'abandoned', 'on_track'].includes(status)) return;
  const company = await db.query.companies.findFirst({ where: eq(companies.id, event.companyId) });
  const signal = await upsertSignal({
    companyId: event.companyId,
    type: 'event_update',
    category: `event_${status}`,
    priority: status === 'delayed' || status === 'abandoned' ? 'high' : 'medium',
    materialityScore: status === 'abandoned' ? 80 : status === 'delayed' ? 70 : 50,
    title: `${company?.name ?? 'Company'}: "${event.title}" is now ${status.replace(/_/g, ' ')}`,
    description: note,
    metrics: { status, expectedCompletionDate: event.expectedCompletionDate },
    evidence: [{ label: 'Event Memory', detail: event.title, sourceDocumentId: event.sourceDocumentId }],
    eventId: event.id,
    dedupKey: `event_status:${event.id}:${status}`,
    occurredAt: new Date(),
    isDemo: event.isDemo,
  });
  if (signal.created) await fanOutNotifications({ signalIds: [signal.id] });
}

export async function updateEvent(id: string, patch: z.infer<typeof updateEventInput>, userId: string) {
  const [event] = await db.select().from(corporateEvents).where(eq(corporateEvents.id, id));
  if (!event) throw ApiError.notFound('Event not found');

  const docId = patch.status ? await resolveEvidenceDocument(event.companyId, patch) : null;
  if (patch.status) requireOutcomeEvidence(patch.status, docId, patch.evidenceExcerpt, patch.execution);

  const { status, statusNote, execution, sourceDocument: _sd, sourceDocumentId: _sid, evidenceExcerpt, ...fields } = patch;
  const statusChanged = status && status !== event.status;
  const [updated] = await db
    .update(corporateEvents)
    .set({ ...fields, ...(statusChanged ? { status, statusUpdatedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(corporateEvents.id, id))
    .returning();

  if (statusChanged) {
    await db.insert(eventMilestones).values({
      eventId: id,
      milestoneDate: new Date().toISOString().slice(0, 10),
      statusAfter: status,
      description: statusNote ?? `Status changed to ${status.replace(/_/g, ' ')}.`,
      sourceDocumentId: docId,
      evidenceExcerpt: evidenceExcerpt ?? null,
      createdBy: userId,
    });
    await recordOutcome(updated, status, docId, evidenceExcerpt ?? '', execution);
    await raiseStatusSignal(updated, status, statusNote ?? `Status changed to ${status.replace(/_/g, ' ')}.`);
  }
  if (fields.title || fields.projectType !== undefined || fields.expectedCapexCr !== undefined) {
    if (fields.title) await embedEvent(updated);
    await matchSimilarEvents(id);
  }
  return updated;
}

export async function addMilestone(eventId: string, input: z.infer<typeof milestoneInput>, userId: string) {
  const [event] = await db.select().from(corporateEvents).where(eq(corporateEvents.id, eventId));
  if (!event) throw ApiError.notFound('Event not found');
  if (input.milestoneDate < event.announcedAt) throw ApiError.unprocessable('Milestone cannot predate the announcement');

  const docId = await resolveEvidenceDocument(event.companyId, input);
  requireOutcomeEvidence(input.statusAfter, docId, input.evidenceExcerpt, input.execution);

  const [milestone] = await db
    .insert(eventMilestones)
    .values({
      eventId,
      milestoneDate: input.milestoneDate,
      statusAfter: input.statusAfter,
      description: input.description,
      reportedMetric: input.reportedMetric ?? null,
      sourceDocumentId: docId,
      evidenceExcerpt: input.evidenceExcerpt ?? null,
      createdBy: userId,
    })
    .returning();

  if (input.statusAfter !== event.status) {
    const [updated] = await db
      .update(corporateEvents)
      .set({ status: input.statusAfter, statusUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(corporateEvents.id, eventId))
      .returning();
    await recordOutcome(updated, input.statusAfter, docId, input.evidenceExcerpt ?? '', input.execution);
    await raiseStatusSignal(updated, input.statusAfter, input.description);
  }
  return milestone;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const companySummary = {
  id: companies.id,
  name: companies.name,
  nseSymbol: companies.nseSymbol,
  bseCode: companies.bseCode,
};

export async function listEvents(opts: {
  userId: string;
  scope: 'portfolio' | 'all';
  status?: EventStatus;
  category?: string;
  companyId?: string;
  q?: string;
  limit: number;
  offset: number;
}) {
  const conditions: SQL[] = [];
  if (opts.status) conditions.push(eq(corporateEvents.status, opts.status));
  if (opts.category) conditions.push(sql`${corporateEvents.category} = ${opts.category}`);
  if (opts.companyId) conditions.push(eq(corporateEvents.companyId, opts.companyId));
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_]/g, '')}%`;
    conditions.push(or(ilike(corporateEvents.title, like), ilike(companies.name, like), ilike(companies.nseSymbol, like))!);
  }
  if (opts.scope === 'portfolio') {
    conditions.push(
      sql`exists (select 1 from ${portfolioHoldings} ph where ph.company_id = ${corporateEvents.companyId} and ph.user_id = ${opts.userId})`,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(corporateEvents)
    .innerJoin(companies, eq(companies.id, corporateEvents.companyId))
    .where(where);
  const rows = await db
    .select({
      event: corporateEvents,
      company: companySummary,
      precedentCount: sql<number>`(select count(*)::int from ${eventSimilarities} s where s.event_id = ${corporateEvents.id})`,
      delayDays: eventExecutionRecords.delayDays,
    })
    .from(corporateEvents)
    .innerJoin(companies, eq(companies.id, corporateEvents.companyId))
    .leftJoin(eventExecutionRecords, eq(eventExecutionRecords.eventId, corporateEvents.id))
    .where(where)
    .orderBy(desc(corporateEvents.announcedAt), desc(corporateEvents.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return {
    total,
    items: rows.map((r) => ({ ...stripEmbedding(r.event), company: r.company, precedentCount: r.precedentCount, delayDays: r.delayDays })),
  };
}

function stripEmbedding(e: EventRow) {
  const { embedding, ...rest } = e;
  return { ...rest, hasEmbedding: embedding !== null };
}

export async function getEventDetail(id: string) {
  const [row] = await db
    .select({ event: corporateEvents, company: companySummary })
    .from(corporateEvents)
    .innerJoin(companies, eq(companies.id, corporateEvents.companyId))
    .where(eq(corporateEvents.id, id));
  if (!row) throw ApiError.notFound('Event not found');

  const [milestones, execution, similar, sourceDoc] = await Promise.all([
    getMilestones(id),
    db.query.eventExecutionRecords.findFirst({ where: eq(eventExecutionRecords.eventId, id) }),
    db
      .select({
        similarity: eventSimilarities,
        event: {
          id: corporateEvents.id,
          title: corporateEvents.title,
          category: corporateEvents.category,
          status: corporateEvents.status,
          announcedAt: corporateEvents.announcedAt,
          expectedCompletionDate: corporateEvents.expectedCompletionDate,
          expectedCapexCr: corporateEvents.expectedCapexCr,
          isDemo: corporateEvents.isDemo,
        },
        company: companySummary,
        execution: eventExecutionRecords,
      })
      .from(eventSimilarities)
      .innerJoin(corporateEvents, eq(corporateEvents.id, eventSimilarities.similarEventId))
      .innerJoin(companies, eq(companies.id, corporateEvents.companyId))
      .leftJoin(eventExecutionRecords, eq(eventExecutionRecords.eventId, corporateEvents.id))
      .where(eq(eventSimilarities.eventId, id))
      .orderBy(desc(eventSimilarities.combinedScore)),
    row.event.sourceDocumentId
      ? db.query.sourceDocuments.findFirst({ where: eq(sourceDocuments.id, row.event.sourceDocumentId) })
      : Promise.resolve(undefined),
  ]);
  const reliability = await companyReliability(row.event.companyId);
  const matchedBy = await eventsMatchingAsPrecedent(id);
  return {
    matchedBy,
    ...stripEmbedding(row.event),
    company: row.company,
    sourceDocument: sourceDoc ?? null,
    milestones,
    execution: execution ?? null,
    similarEvents: similar
      .map((s) => ({ ...s.similarity, event: s.event, company: s.company, execution: s.execution, sameCompany: s.company.id === row.event.companyId, outcome: outcomeLabel(s.event.status, s.execution?.delayDays) }))
      .sort((a, b) => Number(b.sameCompany) - Number(a.sameCompany) || b.combinedScore - a.combinedScore),
    outcome: outcomeLabel(row.event.status, execution?.delayDays),
    companyReliability: reliability,
  };
}

export async function getMilestones(eventId: string) {
  return db
    .select({ milestone: eventMilestones, sourceDocument: sourceDocuments })
    .from(eventMilestones)
    .leftJoin(sourceDocuments, eq(sourceDocuments.id, eventMilestones.sourceDocumentId))
    .where(eq(eventMilestones.eventId, eventId))
    .orderBy(eventMilestones.milestoneDate, eventMilestones.createdAt)
    .then((rows) => rows.map((r) => ({ ...r.milestone, sourceDocument: r.sourceDocument })));
}

/** Execution reliability across a company's events with a recorded outcome. */
export async function companyReliability(companyId: string) {
  const rows = await db
    .select({ outcome: eventExecutionRecords.outcome, delayDays: eventExecutionRecords.delayDays, accuracy: eventExecutionRecords.guidanceAccuracy })
    .from(eventExecutionRecords)
    .innerJoin(corporateEvents, eq(corporateEvents.id, eventExecutionRecords.eventId))
    .where(eq(corporateEvents.companyId, companyId));
  const withDelay = rows.filter((r) => r.delayDays !== null);
  const onTime = withDelay.filter((r) => (r.delayDays ?? 0) <= 30).length;
  return {
    eventsWithOutcome: rows.length,
    completed: rows.filter((r) => r.outcome === 'completed').length,
    delayed: rows.filter((r) => r.outcome === 'delayed').length,
    abandoned: rows.filter((r) => r.outcome === 'abandoned').length,
    onTimeRate: withDelay.length ? Math.round((onTime / withDelay.length) * 100) : null,
    averageDelayDays: withDelay.length ? Math.round(withDelay.reduce((s, r) => s + (r.delayDays ?? 0), 0) / withDelay.length) : null,
    accurateGuidance: rows.filter((r) => r.accuracy === 'accurate').length,
  };
}

/** Similar historical events for a company: its own and precedents matched to them. */
export async function similarForCompany(companyId: string) {
  const own = await db
    .select({ id: corporateEvents.id })
    .from(corporateEvents)
    .where(eq(corporateEvents.companyId, companyId));
  if (own.length === 0) return [];
  const rows = await db
    .select({
      similarity: eventSimilarities,
      source: { id: sql<string>`src.id`, title: sql<string>`src.title`, announcedAt: sql<string>`src.announced_at` },
      event: { id: corporateEvents.id, title: corporateEvents.title, status: corporateEvents.status, announcedAt: corporateEvents.announcedAt, category: corporateEvents.category },
      company: companySummary,
    })
    .from(eventSimilarities)
    .innerJoin(sql`${corporateEvents} as src`, sql`src.id = ${eventSimilarities.eventId}`)
    .innerJoin(corporateEvents, eq(corporateEvents.id, eventSimilarities.similarEventId))
    .innerJoin(companies, eq(companies.id, corporateEvents.companyId))
    .where(inArray(eventSimilarities.eventId, own.map((o) => o.id)))
    .orderBy(desc(eventSimilarities.combinedScore));
  return rows.map((r) => ({ ...r.similarity, sourceEvent: r.source, event: r.event, company: r.company }));
}

