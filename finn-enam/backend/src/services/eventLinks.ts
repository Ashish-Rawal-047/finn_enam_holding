/**
 * Historical-event matches for alerts. Given the Event Memory entries that alerts concern,
 * returns the best stored precedent for each (persisted in event_similarities), preferring the
 * same company and precedents with a recorded outcome.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/client.js';
import { companies, corporateEvents, eventExecutionRecords, eventSimilarities, sourceDocuments } from '../db/schema.js';

export type OutcomeLabel =
  | 'Delivered on time'
  | 'Delivered early'
  | 'Delivered late'
  | 'Delivered — timing unverified'
  | 'Delayed'
  | 'Abandoned'
  | 'In progress'
  | 'Outcome unverified';

/** Outcome wording derived only from status and recorded execution — never inferred. */
export function outcomeLabel(status: string, delayDays: number | null | undefined): OutcomeLabel {
  if (status === 'abandoned') return 'Abandoned';
  if (status === 'delayed') return 'Delayed';
  if (status === 'completed') {
    if (delayDays === null || delayDays === undefined) return 'Delivered — timing unverified';
    if (delayDays < -15) return 'Delivered early';
    if (delayDays <= 30) return 'Delivered on time';
    return 'Delivered late';
  }
  if (status === 'outcome_unverified') return 'Outcome unverified';
  return 'In progress';
}

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
    status: string;
    isDemo: boolean;
    company: { id: string; name: string; nseSymbol: string | null };
  };
  outcome: OutcomeLabel;
  delayDays: number | null;
  evidence: { title: string; url: string | null } | null;
}

const prior = alias(corporateEvents, 'prior');
const current = alias(corporateEvents, 'current');

export async function historicalMatchesFor(eventIds: string[]): Promise<Map<string, HistoricalMatch>> {
  const ids = [...new Set(eventIds.filter(Boolean))];
  const result = new Map<string, HistoricalMatch>();
  if (ids.length === 0) return result;
  const rows = await db
    .select({ sim: eventSimilarities, current: { companyId: current.companyId }, prior, company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol }, exec: eventExecutionRecords, doc: { title: sourceDocuments.title, url: sourceDocuments.url } })
    .from(eventSimilarities)
    .innerJoin(current, eq(current.id, eventSimilarities.eventId))
    .innerJoin(prior, eq(prior.id, eventSimilarities.similarEventId))
    .innerJoin(companies, eq(companies.id, prior.companyId))
    .leftJoin(eventExecutionRecords, eq(eventExecutionRecords.eventId, prior.id))
    .leftJoin(sourceDocuments, eq(sourceDocuments.id, prior.sourceDocumentId))
    .where(inArray(eventSimilarities.eventId, ids));

  const rank = (r: (typeof rows)[number]) => {
    const same = r.prior.companyId === r.current.companyId ? 2 : 0;
    const known = r.exec || ['completed', 'delayed', 'abandoned'].includes(r.prior.status) ? 1 : 0;
    return same * 10 + known * 5 + r.sim.combinedScore;
  };
  for (const r of rows.sort((a, b) => rank(b) - rank(a))) {
    if (result.has(r.sim.eventId)) continue;
    result.set(r.sim.eventId, {
      newEventId: r.sim.eventId,
      similarity: r.sim.combinedScore,
      matchedOn: r.sim.matchedOn,
      explanation: r.sim.explanation,
      sameCompany: r.prior.companyId === r.current.companyId,
      event: {
        id: r.prior.id,
        title: r.prior.title,
        category: r.prior.category,
        announcedAt: r.prior.announcedAt,
        originalAnnouncement: r.prior.originalAnnouncement,
        expectedCompletionDate: r.prior.expectedCompletionDate,
        actualCompletionDate: r.exec?.actualCompletionDate ?? null,
        status: r.prior.status,
        isDemo: r.prior.isDemo,
        company: r.company,
      },
      outcome: outcomeLabel(r.prior.status, r.exec?.delayDays),
      delayDays: r.exec?.delayDays ?? null,
      evidence: r.exec?.evidenceExcerpt ? { title: r.doc?.title ?? 'Recorded outcome', url: r.doc?.url ?? null } : r.doc?.title ? { title: r.doc.title, url: r.doc.url } : null,
    });
  }
  return result;
}

/** Newer events that matched this one as a precedent (reverse links for the detail view). */
export async function eventsMatchingAsPrecedent(eventId: string) {
  return db
    .select({ id: current.id, title: current.title, announcedAt: current.announcedAt, status: current.status, combinedScore: eventSimilarities.combinedScore, company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol } })
    .from(eventSimilarities)
    .innerJoin(current, eq(current.id, eventSimilarities.eventId))
    .innerJoin(companies, eq(companies.id, current.companyId))
    .where(and(eq(eventSimilarities.similarEventId, eventId)));
}
