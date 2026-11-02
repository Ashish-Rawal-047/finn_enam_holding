/**
 * AI comparison of a new corporate event with its historical precedents.
 *
 * Candidates come from FINN's own similarity matching (structured + semantic scores over stored
 * events). The model sees only the stored records (E1 = the new event, E2.. = precedents with
 * their recorded execution outcome) and judges whether each is genuinely the same kind of
 * project and how they compare. Outcomes are never taken from the model: the UI shows the
 * recorded outcome label, and assessments whose figures are not in the cited records are dropped.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { features } from '../config/env.js';
import { db } from '../db/client.js';
import { companies, corporateEvents, eventExecutionRecords, eventSimilarities } from '../db/schema.js';
import { aiStatus, AiError, generateStructuredWithMeta, numbersGrounded, type EvidenceItem } from '../ai/gateway.js';

const schema = z.object({
  assessments: z
    .array(
      z.object({
        precedent: z.string().describe('Evidence id of the historical event being assessed, e.g. "E2"'),
        verdict: z.enum(['same_kind_of_project', 'related', 'not_comparable']),
        // No length limits in the schema: smaller models overrun them and the whole response
        // would be rejected. Text is trimmed after validation instead.
        summary: z.string().describe('One or two sentences comparing the new announcement with this precedent'),
        similarities: z.array(z.string()).describe('Up to 4 short points'),
        differences: z.array(z.string()).describe('Up to 4 short points'),
      }),
    )
    .describe('One entry per historical event, at most 3'),
});

const trim = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Evidence ids mean nothing to a reader: "E1" → "the new announcement", the precedent's id → "this precedent". */
export function humanizeIds(text: string, precedentId: string): string {
  const id = (e: string) => new RegExp(String.raw`\b${e}\b`, 'g');
  return text
    .replace(id("E1's"), "the new announcement's")
    .replace(id('E1'), 'the new announcement')
    .replace(id(`${precedentId}'s`), "this precedent's")
    .replace(id(precedentId), 'this precedent')
    .replace(/\bE\d+\b/g, 'another precedent')
    .replace(/(^|[.!?]\s+)(the new|this precedent|another precedent)/g, (_m, p: string, w: string) => p + w[0].toUpperCase() + w.slice(1));
}

type EventRow = typeof corporateEvents.$inferSelect;
type ExecRow = typeof eventExecutionRecords.$inferSelect;

function recordText(e: EventRow, company: string, exec: ExecRow | undefined): string {
  const parts = [
    `${company} announced on ${e.announcedAt}: "${e.title}".`,
    `Category: ${e.category}${e.projectType ? `; project type: ${e.projectType}` : ''}.`,
    e.expectedCapexCr !== null ? `Planned capex: ₹${e.expectedCapexCr} Cr.` : null,
    e.expectedCapacityValue !== null ? `Planned capacity: ${e.expectedCapacityValue} ${e.expectedCapacityUnit ?? ''}.` : null,
    e.expectedCompletionDate ? `Expected completion: ${e.expectedCompletionDate}.` : null,
    `Recorded status: ${e.status}.`,
    exec
      ? `Recorded execution: outcome ${exec.outcome}${exec.actualCompletionDate ? `, completed ${exec.actualCompletionDate}` : ''}${exec.delayDays !== null ? `, delay ${exec.delayDays} days` : ''}${exec.actualCapexCr !== null ? `, actual capex ₹${exec.actualCapexCr} Cr` : ''}.`
      : 'No execution outcome is recorded.',
    `Announcement text: ${e.originalAnnouncement.slice(0, 600)}`,
  ];
  return parts.filter(Boolean).join(' ');
}

/** Assesses up to `limit` stored precedents of an event. Returns how many assessments were stored. */
export async function assessPrecedents(eventId: string, opts: { limit?: number; userId?: string | null } = {}): Promise<number> {
  if (!features.ai || !aiStatus().configured) return 0;
  const [event] = await db.select().from(corporateEvents).where(eq(corporateEvents.id, eventId));
  if (!event) return 0;
  const links = await db
    .select({ link: eventSimilarities, prior: corporateEvents })
    .from(eventSimilarities)
    .innerJoin(corporateEvents, eq(corporateEvents.id, eventSimilarities.similarEventId))
    .where(eq(eventSimilarities.eventId, eventId))
    .orderBy(desc(eventSimilarities.combinedScore));
  // Same company first, as in matching.
  links.sort((a, b) => Number(b.prior.companyId === event.companyId) - Number(a.prior.companyId === event.companyId) || b.link.combinedScore - a.link.combinedScore);
  const top = links.slice(0, opts.limit ?? 3);
  if (!top.length) return 0;

  const companyIds = [...new Set([event.companyId, ...top.map((t) => t.prior.companyId)])];
  const [names, execs] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds)),
    db.select().from(eventExecutionRecords).where(inArray(eventExecutionRecords.eventId, top.map((t) => t.prior.id))),
  ]);
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const execOf = new Map(execs.map((x) => [x.eventId, x]));

  const evidence: EvidenceItem[] = [
    { id: 'E1', kind: 'event', text: `NEW: ${recordText(event, nameOf.get(event.companyId) ?? 'The company', undefined)}`, sourceDocumentId: event.sourceDocumentId, sourceTitle: null },
    ...top.map((t, i) => ({
      id: `E${i + 2}`,
      kind: 'event' as const,
      text: `HISTORICAL: ${recordText(t.prior, nameOf.get(t.prior.companyId) ?? 'A company', execOf.get(t.prior.id))}`,
      sourceDocumentId: t.prior.sourceDocumentId,
      sourceTitle: null,
    })),
  ];

  let res;
  try {
    res = await generateStructuredWithMeta({
      schema,
      tier: 'fast',
      task:
        'E1 is a new corporate announcement; the other items are historical events stored in FINN. For each historical event, judge whether it is the same kind of project as E1, ' +
        'Refer to events by company and project, not by evidence id, in the text you write. ' +
        'and compare them (scale, timeline, project type). Use only the records. Do not state any outcome, date or figure that is not written in the records; ' +
        'if a historical outcome is not recorded, say it is not recorded.',
      evidence,
      meta: { feature: 'event_comparison', userId: opts.userId ?? null },
    });
  } catch (err) {
    console.warn('[events] precedent assessment failed:', err instanceof AiError ? err.code : (err as Error).message);
    return 0;
  }

  const byId = new Map(evidence.map((e) => [e.id, e]));
  let stored = 0;
  for (const raw of res.output.assessments.slice(0, 3)) {
    const a = { ...raw, summary: trim(raw.summary, 400), similarities: raw.similarities.slice(0, 4).map((x) => trim(x, 200)), differences: raw.differences.slice(0, 4).map((x) => trim(x, 200)) };
    const idx = Number(a.precedent.replace(/^E/, '')) - 2;
    const target = top[idx];
    if (!target || !byId.has(a.precedent)) continue;
    const cited = [byId.get('E1')!, byId.get(a.precedent)!];
    const texts = [a.summary, ...a.similarities, ...a.differences];
    if (!texts.every((t) => numbersGrounded(t, cited))) continue; // a figure not in the records: drop
    const h = (t: string) => humanizeIds(t, a.precedent);
    await db
      .update(eventSimilarities)
      .set({ aiAssessment: { verdict: a.verdict, summary: h(a.summary), similarities: a.similarities.map(h), differences: a.differences.map(h), model: res.model, assessedAt: new Date().toISOString() } })
      .where(and(eq(eventSimilarities.eventId, eventId), eq(eventSimilarities.similarEventId, target.prior.id)));
    stored++;
  }
  return stored;
}
