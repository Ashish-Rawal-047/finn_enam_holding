/**
 * Loads the demonstration universe into Neon through the same pipelines real providers use.
 * Idempotent: safe to run repeatedly.
 *
 *   1. Companies (22) from the demo company provider
 *   2. Historical Event Memory (fixture commitments + same-company precedents)
 *   3. Demo research reports from the hand-written research fixtures
 *   4. Market data ingestion → volume stats → price / volume signals
 *   5. Announcement ingestion → signals, management changes, results, new events,
 *      similar-event matching and precedent alerts
 *   6. Reviewer demo account when DEMO_MODE_ENABLED (DEMO_USER_EMAIL / DEMO_USER_PASSWORD)
 */
import { eq, sql } from 'drizzle-orm';
import { MOCK_COMPANIES } from '../content/demo/companies.js';
import { MOCK_EVENT_MEMORY } from '../content/demo/eventMemory.js';
import { MOCK_COMPANY_RESEARCH } from '../content/demo/research.js';
import { DEMO_NOTICE } from '../providers/adapters/demo.js';
import { providers } from '../providers/registry.js';
import { pool, db } from './client.js';
import {
  companies,
  corporateEvents,
  eventExecutionRecords,
  eventMilestones,
  researchEvidence,
  researchReports,
} from './schema.js';
import { sha256 } from '../services/auth.js';
import { upsertSourceDocument } from '../services/documents.js';
import { matchSimilarEvents } from '../services/events.js';
import { parseExpectedCompletion } from '../services/extraction.js';
import { extractCroreAmount } from '../services/classify.js';
import { ingestMarketData } from '../services/market.js';
import { fanOutNotifications, generateMarketSignals } from '../services/alerts.js';
import { ingestAnnouncements } from '../services/announcements.js';
import { ensureDemoAccount } from '../services/demo.js';
import { domainFromWebsite } from '../services/logos.js';

const toIso = (text: string) => new Date(`${text} UTC`).toISOString().slice(0, 10);
const stripQuote = (s: string) => s.trim().replace(/^["“]|["”]$/g, '');
// Fixture document titles name executives as speakers of invented quotes; drop that attribution.
const cleanDocTitle = (s: string) => s.replace(/\s*\(([^)]*remarks[^)]*)\)/i, '').trim();

/** First two significant words, ignoring legal suffixes and parentheticals ("Trent Ltd. (Westside)" → "trent"). */
const nameKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['ltd', 'limited', 'india', 'the'].includes(w))
    .slice(0, 2)
    .join(' ');

const fyStart = (fyLabel: string) => {
  const y = Number(/(\d{4})/.exec(fyLabel)?.[1]);
  return `${y - 1}-04-01`;
};

async function seedCompanies() {
  let inserted = 0;
  for (const c of MOCK_COMPANIES) {
    const record = await providers.companyInfo.getBySymbol(c.ticker);
    if (!record) continue;
    const rows = await db
      .insert(companies)
      .values({ ...record, websiteDomain: domainFromWebsite(record.website), isDemo: true })
      .onConflictDoNothing()
      .returning({ id: companies.id });
    inserted += rows.length;
  }
  return inserted;
}

async function companyIdBySymbol(symbol: string) {
  const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.nseSymbol, symbol.replace(/\.(NS|BO)$/, '')));
  return row?.id ?? null;
}

function mapCategory(item: (typeof MOCK_EVENT_MEMORY)[number]) {
  if (/demerger/i.test(item.title)) return 'restructuring' as const;
  if (item.category === 'capex') return /plant|facility|factory|osat/i.test(item.title) ? ('manufacturing_facility' as const) : ('capacity_expansion' as const);
  if (item.category === 'capacity') return 'capacity_expansion' as const;
  if (item.category === 'product') return 'new_business_division' as const;
  return 'financial_target' as const;
}

const STATUS = { delivered: 'completed', delayed: 'delayed', pending: 'in_progress', revised: 'in_progress', unverified: 'outcome_unverified' } as const;

function projectTypeFor(text: string) {
  if (/semiconductor|osat/i.test(text)) return 'semiconductor';
  if (/notebook|laptop|it hardware|mobile|smartphone|electronics/i.test(text)) return 'electronics assembly';
  if (/store/i.test(text)) return 'retail stores';
  if (/margin/i.test(text)) return 'margin guidance';
  if (/revenue/i.test(text)) return 'revenue target';
  if (/demerger/i.test(text)) return 'demerger';
  return null;
}

async function insertEvent(values: typeof corporateEvents.$inferInsert) {
  const [row] = await db.insert(corporateEvents).values(values).onConflictDoNothing({ target: corporateEvents.dedupHash }).returning();
  return row ?? (await db.select().from(corporateEvents).where(eq(corporateEvents.dedupHash, values.dedupHash)))[0];
}

async function seedEventMemory() {
  let count = 0;
  const createdIds: string[] = [];
  for (const item of MOCK_EVENT_MEMORY) {
    const companyId = await companyIdBySymbol(item.ticker);
    if (!companyId) continue;
    const announcedAt = toIso(item.commitmentDate);
    const docId = await upsertSourceDocument(
      { title: cleanDocTitle(item.sourceDoc), url: null, documentType: 'other', publishedAt: announcedAt, periodLabel: null, excerpt: DEMO_NOTICE },
      { companyId, provider: 'demo', isDemo: true },
    );
    const status = STATUS[item.status];
    const deadlineQuarter = /Q[1-4]\s*FY\d{2}/i.exec(item.milestoneDeadline)?.[0];
    const deadlineFy = /FY\s?\d{2}/i.exec(item.milestoneDeadline)?.[0];
    const expected = deadlineQuarter
      ? parseExpectedCompletion(`by ${deadlineQuarter}`, announcedAt)
      : deadlineFy
        ? parseExpectedCompletion(`by ${deadlineFy}`, announcedAt)
        : null;
    const category = mapCategory(item);
    const event = await insertEvent({
      companyId,
      category,
      projectType: projectTypeFor(`${item.title} ${item.sourcePageOrQuote}`),
      title: item.title,
      originalAnnouncement: stripQuote(item.sourcePageOrQuote),
      announcedAt,
      sourceDocumentId: docId,
      investmentSignificance: item.factsSummary,
      expectedCapexCr: extractCroreAmount(item.announcedMetric) ?? extractCroreAmount(item.sourcePageOrQuote),
      expectedCompletionDate: expected,
      expectedImpact: item.announcedMetric,
      commitments: [item.announcedMetric],
      status,
      extractionMethod: 'demo-fixture',
      dedupHash: sha256(`demo-event|${item.id}`),
      isDemo: true,
    });
    createdIds.push(event.id);

    // Milestones from the fixture timeline (ordered as written).
    const existing = await db.select({ id: eventMilestones.id }).from(eventMilestones).where(eq(eventMilestones.eventId, event.id));
    if (existing.length === 0) {
      const steps = item.timeline;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepDoc = await upsertSourceDocument(
          { title: cleanDocTitle(step.sourceDoc), url: null, documentType: 'other', publishedAt: toIso(step.date), periodLabel: null, excerpt: DEMO_NOTICE },
          { companyId, provider: 'demo', isDemo: true },
        );
        const statusAfter = i === 0 ? 'announced' : i === steps.length - 1 ? status : step.statusDelta === 'negative' ? 'delayed' : 'in_progress';
        await db.insert(eventMilestones).values({
          eventId: event.id,
          milestoneDate: toIso(step.date),
          statusAfter,
          description: step.observation,
          reportedMetric: step.reportedMetric ?? null,
          sourceDocumentId: stepDoc,
          evidenceExcerpt: DEMO_NOTICE,
          isDemo: true,
        });
      }
    }

    // Outcome records. Fixture timelines do not state completion dates, so none are invented.
    if (status === 'delayed' || status === 'completed') {
      const revised = status === 'delayed' && /Q4 FY25/i.test(item.factsSummary) ? '2025-03-31' : null;
      const delayDays = revised && expected ? Math.round((Date.parse(revised) - Date.parse(expected)) / 86_400_000) : null;
      await db
        .insert(eventExecutionRecords)
        .values({
          eventId: event.id,
          outcome: status,
          actualCompletionDate: null,
          delayDays,
          plannedDurationDays: expected ? Math.round((Date.parse(expected) - Date.parse(announcedAt)) / 86_400_000) : null,
          guidanceAccuracy: status === 'delayed' ? (delayDays !== null && delayDays <= 90 ? 'minor_slip' : 'major_slip') : null,
          sourceDocumentId: docId,
          evidenceExcerpt: `${item.factsSummary} (${DEMO_NOTICE})`,
          isDemo: true,
        })
        .onConflictDoNothing();
    }
    count++;

    // Same-company historical comparisons become precedent events with recorded outcomes.
    for (const comp of item.historicalComps) {
      const compCompany = MOCK_COMPANIES.find((c) => nameKey(comp.companyOrPeer) === nameKey(c.name) || comp.companyOrPeer.trim().toUpperCase() === c.ticker.replace('.NS', ''));
      if (!compCompany) continue; // peer outside FINN's universe
      const compId = await companyIdBySymbol(compCompany.ticker);
      if (!compId) continue;
      const start = fyStart(comp.year);
      const months = Number(/within (\d+) months/i.exec(comp.outcome)?.[1] ?? NaN);
      const onSchedule = /on schedule/i.test(comp.outcome);
      const expectedEnd = Number.isFinite(months) && onSchedule ? new Date(Date.UTC(Number(start.slice(0, 4)), 3 + months, 1)).toISOString().slice(0, 10) : null;
      const outcome = /delayed/i.test(comp.outcome) ? 'delayed' : 'completed';
      const compDoc = await upsertSourceDocument(
        { title: `${comp.pastEvent} — FINN demo fixture`, url: null, documentType: 'other', publishedAt: start, periodLabel: comp.year, excerpt: DEMO_NOTICE },
        { companyId: compId, provider: 'demo', isDemo: true },
      );
      const prior = await insertEvent({
        companyId: compId,
        category,
        projectType: projectTypeFor(`${comp.pastEvent} ${item.title}`),
        title: comp.pastEvent,
        originalAnnouncement: `${comp.pastEvent}. Demo fixture: only the fiscal year (${comp.year}) is recorded, so the date is set to the start of that fiscal year.`,
        announcedAt: start,
        sourceDocumentId: compDoc,
        expectedCompletionDate: expectedEnd,
        status: outcome,
        extractionMethod: 'demo-fixture',
        dedupHash: sha256(`demo-precedent|${item.id}|${comp.pastEvent}`),
        isDemo: true,
      });
      await db
        .insert(eventExecutionRecords)
        .values({
          eventId: prior.id,
          outcome,
          actualCompletionDate: expectedEnd,
          delayDays: expectedEnd ? 0 : null,
          plannedDurationDays: Number.isFinite(months) ? Math.round(months * 30.44) : null,
          actualDurationDays: Number.isFinite(months) ? Math.round(months * 30.44) : null,
          guidanceAccuracy: /missed/i.test(comp.outcome) ? 'missed' : onSchedule ? 'accurate' : null,
          sourceDocumentId: compDoc,
          evidenceExcerpt: `Recorded outcome: ${comp.outcome}. (${DEMO_NOTICE})`,
          isDemo: true,
        })
        .onConflictDoNothing();
      createdIds.push(prior.id);
      count++;
    }
  }
  for (const id of createdIds) await matchSimilarEvents(id);
  return count;
}

async function seedResearch() {
  let count = 0;
  for (const [ticker, r] of Object.entries(MOCK_COMPANY_RESEARCH)) {
    const companyId = await companyIdBySymbol(ticker);
    if (!companyId) continue;
    const [existing] = await db.select({ id: researchReports.id }).from(researchReports).where(sql`${researchReports.companyId} = ${companyId} and ${researchReports.generator} = 'demo-fixture'`);
    if (existing) continue;
    const doc = await upsertSourceDocument(
      { title: `FINN demo research fixture — ${r.name}`, url: null, documentType: 'other', publishedAt: '2026-10-28', periodLabel: null, excerpt: DEMO_NOTICE },
      { companyId, provider: 'demo', isDemo: true },
    );
    const fact = (label: string, text: string) => ({ label, text, claimType: 'reported_fact' as const, sourceDocumentId: doc, sourceTitle: 'FINN demo research fixture' });
    const note = (label: string, text: string) => ({ label, text, claimType: 'analyst_note' as const, sourceDocumentId: doc, sourceTitle: 'FINN demo research fixture' });
    const fs = r.financialSnapshot;
    const sections = {
      businessSnapshot: {
        status: 'partial',
        reason: 'Geographic exposure, industry overview and competitor list are not in the demo fixture.',
        claims: [note('Overview', r.businessSnapshot.summary), note('Competitive position', r.businessSnapshot.keyMoat), ...r.businessSnapshot.segments.map((s) => fact('Segment', `${s.name}: ${s.sharePercent}% of revenue, ${s.growthYoY}% YoY growth`))],
        data: { segments: r.businessSnapshot.segments },
      },
      financialSnapshot: {
        status: 'partial',
        reason: 'EBIT, PAT, EPS and valuation multiples are not in the demo fixture.',
        claims: [
          fact('Revenue (TTM)', `Revenue (TTM): ${fs.revenueTtm}`),
          fact('EBITDA margin', `EBITDA margin: ${fs.ebitdaMargin}`),
          fact('ROCE', `ROCE: ${fs.roce}`),
          fact('ROE', `ROE: ${fs.roe}`),
          fact('Debt to equity', `Debt to equity: ${fs.debtToEquity}`),
          fact('Market capitalisation', `Market capitalisation: ${r.marketCap}`),
        ],
      },
      businessTrajectory: { status: 'unavailable', reason: 'Multi-period financial history is not in the demo fixture.', claims: [] },
      balanceSheet: { status: 'unavailable', reason: 'Balance-sheet line items are not in the demo fixture.', claims: [] },
      cashQuality: {
        status: 'available',
        claims: [
          fact('CFO / PAT', `CFO / PAT: ${fs.cfoPatConversion}×`),
          fact('Free cash flow (TTM)', `Free cash flow (TTM): ${fs.fcfTtm}`),
          fact('Working capital days', `Working capital days: ${fs.workingCapitalDays}`),
          note('Cash conversion', r.cashQualityAnalysis.cfoVsPatCommentary.replace(/\$|\\times/g, (m) => (m === '$' ? '' : '×'))),
          note('Working capital trend', r.cashQualityAnalysis.workingCapitalTrend),
          note('FCF yield', r.cashQualityAnalysis.fcfYield),
          ...(r.cashQualityAnalysis.redFlagsDetected && r.cashQualityAnalysis.flagsDetail ? [note('Red flag', r.cashQualityAnalysis.flagsDetail)] : []),
        ],
      },
      narrativeVsNumbers: {
        status: 'available',
        claims: r.narrativeVsNumbers.map((n) => note(n.period, `${n.managementGuidance} → ${n.actualDelivered} (${n.varianceType}: ${n.variance})`)),
        data: r.narrativeVsNumbers.map((n) => ({ period: n.period, statement: n.managementGuidance, actualText: n.actualDelivered, variance: n.variance, assessment: n.varianceType, source: n.sourceDoc })),
      },
      forwardGuidance: {
        status: 'available',
        claims: r.guidanceLedger.map((g) => note(g.metric, `${g.managementStatement} (target: ${g.targetPeriod}; source: ${g.concallSource})`)),
      },
      bullBear: {
        status: 'available',
        claims: [...r.bullBear.bullCase.map((b) => note('Bull', b)), ...r.bullBear.bearCase.map((b) => note('Bear', b))],
        data: { bull: r.bullBear.bullCase, bear: r.bullBear.bearCase },
      },
    };
    await db.transaction(async (tx) => {
      const [report] = await tx
        .insert(researchReports)
        .values({
          companyId,
          status: 'partial',
          generator: 'demo-fixture',
          sections,
          limitations: ['Hand-written demonstration research. Figures and management statements are illustrative, not sourced from filings.'],
          isDemo: true,
        })
        .returning();
      const rows = Object.entries(sections).flatMap(([section, s]) =>
        s.claims.map((c) => ({ reportId: report.id, section, claim: c.text, claimType: c.claimType, sourceDocumentId: doc, excerpt: DEMO_NOTICE })),
      );
      if (rows.length) await tx.insert(researchEvidence).values(rows);
    });
    count++;
  }
  return count;
}

async function main() {
  console.log('[seed] companies:', await seedCompanies());
  console.log('[seed] event memory (incl. precedents):', await seedEventMemory());
  console.log('[seed] demo research reports:', await seedResearch());
  console.log('[seed] market data:', JSON.stringify(await ingestMarketData()));
  const market = await generateMarketSignals();
  console.log('[seed] market signals created:', market.created);
  console.log('[seed] announcements:', JSON.stringify(await ingestAnnouncements({ since: new Date('2020-01-01') })));
  console.log('[seed] reviewer demo account:', await ensureDemoAccount());
  const fanned = await fanOutNotifications({ sinceDays: 30 });
  console.log('[seed] notifications fanned out:', fanned.created);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    await pool.end();
    process.exit(1);
  });
