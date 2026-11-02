/**
 * Announcement ingestion: provider records → classified, de-duplicated announcements with
 * source documents, financial results, management changes, signals and Event Memory
 * entries. Every step is idempotent; re-running the job produces no duplicates.
 */
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, corporateAnnouncements, financialStatements, managementChanges, signals } from '../db/schema.js';
import { providers } from '../providers/registry.js';
import type { AnnouncementRecord } from '../providers/types.js';
import { fanOutNotifications, upsertSignal } from './alerts.js';
import { sha256 } from './auth.js';
import { CATEGORY_LABELS, classifyAnnouncement, extractCroreAmount, isRoutineFiling, isSeniorRole, materialityScore, priorityFromScore } from './classify.js';
import { upsertSourceDocument } from './documents.js';
import { createEvent } from './events.js';
import { extractEvent } from './extraction.js';

const SIGNAL_TYPE: Partial<Record<string, 'management_change' | 'financial_result'>> = {
  management_change: 'management_change',
  results: 'financial_result',
};

export function announcementDedupHash(companyId: string, category: string, title: string, announcedAt: string) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return sha256(`${companyId}|${category}|${normalized}|${announcedAt.slice(0, 10)}`);
}

async function yoyFor(companyId: string, periodEnd: string, field: 'revenue' | 'pat'): Promise<number | null> {
  const prior = new Date(`${periodEnd}T00:00:00Z`);
  prior.setUTCFullYear(prior.getUTCFullYear() - 1);
  const [row] = await db
    .select({ v: financialStatements[field] })
    .from(financialStatements)
    .where(and(eq(financialStatements.companyId, companyId), eq(financialStatements.periodType, 'quarterly'), eq(financialStatements.periodEnd, prior.toISOString().slice(0, 10))));
  return row?.v ?? null;
}

export async function ingestAnnouncements(opts: { since?: Date } = {}) {
  const provider = providers.announcements;
  const universe = await db.select({ id: companies.id, nseSymbol: companies.nseSymbol, name: companies.name }).from(companies);
  const bySymbol = new Map(universe.filter((c) => c.nseSymbol).map((c) => [c.nseSymbol!, c]));

  let since = opts.since;
  if (!since) {
    const [last] = await db.select({ at: corporateAnnouncements.announcedAt }).from(corporateAnnouncements).orderBy(desc(corporateAnnouncements.announcedAt)).limit(1);
    since = last ? new Date(last.at.getTime() - 3 * 86_400_000) : new Date(Date.now() - 400 * 86_400_000);
  }

  const records = await provider.listAnnouncements([...bySymbol.keys()], since);
  const stats = { fetched: records.length, inserted: 0, duplicates: 0, signals: 0, events: 0, precedents: 0 };
  const newSignalIds: string[] = [];

  for (const rec of records) {
    const company = bySymbol.get(rec.symbol);
    if (!company) continue;
    const result = await ingestOne(rec, company, provider.info);
    if (!result.inserted) {
      stats.duplicates++;
      continue;
    }
    stats.inserted++;
    if (result.signalId) {
      stats.signals++;
      newSignalIds.push(result.signalId);
    }
    if (result.eventCreated) stats.events++;
    if (result.precedentSignalId) stats.precedents++;
  }
  const fanned = await fanOutNotifications({ signalIds: newSignalIds });
  return { provider: provider.info.name, ...stats, notifications: fanned.created };
}

async function ingestOne(rec: AnnouncementRecord, company: { id: string; name: string }, info: { name: string; isDemo: boolean }) {
  const category = classifyAnnouncement(rec.rawCategory, rec.title);
  const dedupHash = announcementDedupHash(company.id, category, rec.title, rec.announcedAt);
  const docId = await upsertSourceDocument(rec.document, { companyId: company.id, provider: info.name, isDemo: info.isDemo });

  let resultsYoY: number | null = null;
  if (rec.quarterlyResults?.revenue != null) {
    const prior = await yoyFor(company.id, rec.quarterlyResults.periodEnd, 'revenue');
    if (prior) resultsYoY = Math.round(((rec.quarterlyResults.revenue - prior) / prior) * 1000) / 10;
  }
  const score = materialityScore({ category, title: rec.title, summary: rec.summary, managementRole: rec.managementChange?.role, resultsYoY });

  const [announcement] = await db
    .insert(corporateAnnouncements)
    .values({
      companyId: company.id,
      sourceDocumentId: docId,
      category,
      title: rec.title,
      summary: rec.summary,
      announcedAt: new Date(rec.announcedAt),
      exchange: rec.exchange,
      materialityScore: score,
      dedupHash,
      provider: info.name,
      isDemo: info.isDemo,
    })
    .onConflictDoNothing({ target: corporateAnnouncements.dedupHash })
    .returning();
  if (!announcement) return { inserted: false as const };

  if (rec.quarterlyResults) {
    const q = rec.quarterlyResults;
    await db
      .insert(financialStatements)
      .values({
        companyId: company.id,
        periodType: 'quarterly',
        periodLabel: q.periodLabel,
        periodEnd: q.periodEnd,
        revenue: q.revenue,
        ebitda: q.ebitda,
        pbt: q.pbt,
        pat: q.pat,
        sourceDocumentId: docId,
        provider: info.name,
        isDemo: info.isDemo,
      })
      .onConflictDoNothing();
  }

  if (rec.managementChange) {
    const m = rec.managementChange;
    await db
      .insert(managementChanges)
      .values({
        companyId: company.id,
        announcementId: announcement.id,
        personName: m.personName,
        role: m.role,
        changeType: m.changeType,
        effectiveDate: m.effectiveDate,
        background: m.background,
        sourceDocumentId: docId,
        isDemo: info.isDemo,
      })
      .onConflictDoNothing();
  }

  // Signals: routine paperwork never alerts; everything else is ranked by materiality.
  let signalId: string | null = null;
  if (!isRoutineFiling(category, score)) {
    const type = SIGNAL_TYPE[category] ?? 'corporate_announcement';
    const dedupKey =
      rec.managementChange
        ? `management_change:${company.id}:${rec.managementChange.personName.toLowerCase()}:${rec.managementChange.role.toLowerCase()}:${rec.managementChange.changeType}`
        : rec.quarterlyResults
          ? `financial_result:${company.id}:${rec.quarterlyResults.periodLabel}`
          : `announcement:${dedupHash}`;
    const amount = extractCroreAmount(`${rec.title} ${rec.summary ?? ''}`);
    const metrics: Record<string, number | string | null> = { materialityScore: score, amountCr: amount };
    if (rec.quarterlyResults) Object.assign(metrics, { revenueCr: rec.quarterlyResults.revenue, ebitdaCr: rec.quarterlyResults.ebitda, pbtCr: rec.quarterlyResults.pbt, patCr: rec.quarterlyResults.pat, revenueYoYPct: resultsYoY });
    if (rec.managementChange) Object.assign(metrics, { role: rec.managementChange.role, person: rec.managementChange.personName, seniorRole: isSeniorRole(rec.managementChange.role) ? 'yes' : 'no' });

    const signal = await upsertSignal({
      companyId: company.id,
      type,
      category,
      priority: priorityFromScore(score),
      materialityScore: score,
      title: `${company.name}: ${CATEGORY_LABELS[category]}`,
      description: rec.summary ?? rec.title,
      metrics,
      evidence: [
        { label: 'Filing', detail: rec.title, sourceDocumentId: docId },
        ...(rec.document.excerpt ? [{ label: 'Source excerpt', detail: rec.document.excerpt, sourceDocumentId: docId }] : []),
      ],
      sourceDocumentId: docId,
      announcementId: announcement.id,
      dedupKey,
      occurredAt: new Date(rec.announcedAt),
      isDemo: info.isDemo,
    });
    if (signal.created) signalId = signal.id;
  }

  // Event Memory: capture trackable commitments and compare with history.
  let eventCreated = false;
  let precedentSignalId: string | null = null;
  const extracted = await extractEvent({
    companyId: company.id,
    category,
    title: rec.title,
    summary: rec.summary,
    announcedAt: rec.announcedAt.slice(0, 10),
    sourceDocumentId: docId,
  });
  if (extracted) {
    const created = await createEvent(extracted.input, { extractionMethod: extracted.method, isDemo: info.isDemo });
    eventCreated = created.created;
    precedentSignalId = created.precedentSignalId;
    // Persist the alert → event link so the alert can show its historical match.
    if (signalId) await db.update(signals).set({ eventId: created.event.id }).where(eq(signals.id, signalId));
  }

  return { inserted: true as const, signalId, eventCreated, precedentSignalId };
}

export async function announcementsForCompany(companyId: string, limit = 20) {
  return db
    .select()
    .from(corporateAnnouncements)
    .where(eq(corporateAnnouncements.companyId, companyId))
    .orderBy(desc(corporateAnnouncements.announcedAt))
    .limit(limit);
}

