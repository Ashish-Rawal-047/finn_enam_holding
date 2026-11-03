/**
 * Company research reports.
 *
 * Pipeline (stages are timed; see `timings` on the report):
 *   1–2. resolve + retrieve: refresh only stale datasets, in one concurrent provider call
 *   3.   normalise: stored statements → reported facts, calculated metrics, trajectories
 *        (shown to the user immediately via job progress)
 *   4.   AI: three analysis groups in parallel over a compact, numbered evidence pack —
 *        skipped when an identical report (same evidence + model) already exists
 *   5.   persist report + evidence
 *
 *   reported facts      – values from stored statements, profile and filings
 *   calculated metrics  – deterministic formulas over those facts (formula shown)
 *   AI interpretations  – only claims whose citations resolve AND whose figures appear in
 *                         the cited evidence survive
 * Sections without support are returned as `unavailable` with the reason.
 */
import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { features } from '../config/env.js';
import { db } from '../db/client.js';
import {
  companies,
  corporateAnnouncements,
  corporateEvents,
  eventExecutionRecords,
  financialStatements,
  managementChanges,
  marketPrices,
  researchEvidence,
  researchReports,
  sourceDocuments,
} from '../db/schema.js';
import { AiError, aiLabel, generateStructuredWithMeta, keepCited, numbersGrounded, type EvidenceItem } from '../ai/gateway.js';
import { ApiError } from '../lib/http.js';
import { freshness, syncCompany } from './companyData.js';
import { analyseFinancials, analysisEvidence, type FinancialAnalysis } from './financialAnalysis.js';

export type ClaimType = 'reported_fact' | 'calculated_metric' | 'ai_interpretation' | 'analyst_note';

export interface Claim {
  label?: string;
  text: string;
  value?: number | null;
  unit?: string | null;
  period?: string | null;
  formula?: string;
  claimType: ClaimType;
  sourceDocumentId?: string | null;
  sourceTitle?: string | null;
}

export interface Section {
  status: 'available' | 'partial' | 'unavailable';
  reason?: string;
  claims: Claim[];
  data?: unknown;
}

export const SECTION_KEYS = [
  'businessSnapshot',
  'financialSnapshot',
  'businessTrajectory',
  'balanceSheet',
  'cashQuality',
  'narrativeVsNumbers',
  'forwardGuidance',
  'bullBear',
  'investmentRisks',
  'summary',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const unavailable = (reason: string): Section => ({ status: 'unavailable', reason, claims: [] });

type Statement = typeof financialStatements.$inferSelect;

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const pct = (num: number | null | undefined, den: number | null | undefined) => (num !== null && num !== undefined && den ? round((num / den) * 100) : null);
const ratio = (num: number | null | undefined, den: number | null | undefined, dp = 2) => (num !== null && num !== undefined && den ? round(num / den, dp) : null);

const SYMBOL: Record<string, string> = { INR: '₹', USD: 'US$', EUR: '€', GBP: '£', JPY: '¥' };

/** Formats a statement amount in its own currency and unit (never converted). */
export function money(value: number | null | undefined, s: Pick<Statement, 'currency' | 'unit'>): string {
  if (value === null || value === undefined) return 'Data unavailable';
  const sym = SYMBOL[s.currency] ?? `${s.currency} `;
  const locale = s.currency === 'INR' ? 'en-IN' : 'en-US';
  const n = value.toLocaleString(locale, { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2 });
  return s.unit === 'crore' ? `${sym}${n} Cr` : `${sym}${n} M`;
}

/** EBITDA as reported, else operating income + depreciation (flagged as derived). */
function ebitdaOf(s: Statement): { value: number | null; derived: boolean } {
  if (s.ebitda !== null) return { value: s.ebitda, derived: false };
  if (s.operatingIncome !== null && s.depreciation !== null) return { value: round(s.operatingIncome + s.depreciation, 2), derived: true };
  return { value: null, derived: false };
}

/** Deterministic metrics with their formulas. Exported for tests. */
export function computeMetrics(s: Statement, prior?: Statement) {
  const e = ebitdaOf(s);
  const days = s.periodType === 'quarterly' ? 91 : 365;
  const avgEquity = prior?.totalEquity && s.totalEquity ? (prior.totalEquity + s.totalEquity) / 2 : s.totalEquity;
  return [
    { label: 'Revenue growth', value: prior ? pct(s.revenue !== null && prior.revenue ? s.revenue - prior.revenue : null, prior.revenue) : null, unit: '%', formula: '(Revenue − prior-period revenue) ÷ prior-period revenue' },
    { label: 'Gross margin', value: pct(s.grossProfit, s.revenue), unit: '%', formula: 'Gross profit ÷ Revenue' },
    { label: 'EBITDA margin', value: pct(e.value, s.revenue), unit: '%', formula: e.derived ? '(Operating income + D&A) ÷ Revenue' : 'EBITDA ÷ Revenue' },
    { label: 'Operating margin', value: pct(s.operatingIncome, s.revenue), unit: '%', formula: 'Operating income ÷ Revenue' },
    { label: 'Net profit margin', value: pct(s.pat, s.revenue), unit: '%', formula: 'Net income ÷ Revenue' },
    { label: 'ROE', value: s.periodType === 'annual' ? pct(s.pat, avgEquity) : null, unit: '%', formula: prior?.totalEquity ? 'Net income ÷ average shareholders’ equity' : 'Net income ÷ shareholders’ equity' },
    { label: 'ROA', value: s.periodType === 'annual' ? pct(s.pat, s.totalAssets) : null, unit: '%', formula: 'Net income ÷ Total assets' },
    { label: 'ROCE', value: s.periodType === 'annual' ? pct(s.ebit ?? s.operatingIncome, s.capitalEmployed) : null, unit: '%', formula: 'EBIT ÷ (Total assets − current liabilities)' },
    { label: 'Debt to equity', value: ratio(s.borrowings, s.totalEquity), unit: 'x', formula: 'Total debt ÷ Shareholders’ equity' },
    { label: 'Current ratio', value: ratio(s.currentAssets, s.currentLiabilities), unit: 'x', formula: 'Current assets ÷ Current liabilities' },
    { label: 'Interest coverage', value: ratio(s.ebit ?? s.operatingIncome, s.interestExpense, 1), unit: 'x', formula: 'EBIT ÷ Interest expense' },
    { label: 'CFO / PAT', value: ratio(s.operatingCashFlow, s.pat), unit: 'x', formula: 'Operating cash flow ÷ Net income' },
    {
      label: 'Free cash flow',
      value: s.freeCashFlow ?? (s.operatingCashFlow !== null && s.capex !== null ? round(s.operatingCashFlow - s.capex, 2) : null),
      unit: 'money',
      formula: s.freeCashFlow !== null ? 'As reported by provider' : 'Operating cash flow − Capex',
    },
    { label: 'Receivable days', value: s.receivables !== null && s.revenue ? round((s.receivables / s.revenue) * days, 0) : null, unit: 'days', formula: 'Receivables ÷ Revenue × days in period' },
    { label: 'Inventory days', value: s.inventory !== null && s.revenue ? round((s.inventory / s.revenue) * days, 0) : null, unit: 'days', formula: 'Inventory ÷ Revenue × days in period' },
    {
      label: 'Net working capital',
      value: s.currentAssets !== null && s.currentLiabilities !== null ? round(s.currentAssets - s.currentLiabilities, 2) : null,
      unit: 'money',
      formula: 'Current assets − Current liabilities',
    },
  ];
}

const fmtMetric = (m: { label: string; value: number | null; unit: string }, s: Statement) =>
  m.unit === 'money' ? money(m.value, s) : m.unit === '%' ? `${m.value}%` : m.unit === 'x' ? `${m.value}×` : `${m.value} ${m.unit}`;

const REPORTED_FIELDS: Array<[keyof Statement, string]> = [
  ['revenue', 'Revenue'],
  ['grossProfit', 'Gross profit'],
  ['operatingIncome', 'Operating income'],
  ['ebitda', 'EBITDA'],
  ['ebit', 'EBIT'],
  ['pbt', 'Profit before tax'],
  ['pat', 'Net income (PAT)'],
  ['eps', 'Diluted EPS'],
];

const BALANCE_FIELDS: Array<[keyof Statement, string]> = [
  ['totalAssets', 'Total assets'],
  ['currentAssets', 'Current assets'],
  ['cashAndEquivalents', 'Cash & equivalents'],
  ['receivables', 'Receivables'],
  ['inventory', 'Inventory'],
  ['totalLiabilities', 'Total liabilities'],
  ['currentLiabilities', 'Current liabilities'],
  ['longTermDebt', 'Long-term debt'],
  ['shortTermDebt', 'Short-term debt'],
  ['borrowings', 'Total debt'],
  ['totalEquity', 'Shareholders’ equity'],
  ['retainedEarnings', 'Retained earnings'],
  ['contingentLiabilities', 'Contingent liabilities'],
];

const CASH_FIELDS: Array<[keyof Statement, string]> = [
  ['operatingCashFlow', 'Operating cash flow'],
  ['investingCashFlow', 'Investing cash flow'],
  ['financingCashFlow', 'Financing cash flow'],
  ['capex', 'Capital expenditure'],
];

async function loadContext(companyId: string) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) throw ApiError.notFound('Company not found');
  const [statements, announcements, events, mgmt, quote, syncs] = await Promise.all([
    db.select().from(financialStatements).where(eq(financialStatements.companyId, companyId)).orderBy(desc(financialStatements.periodEnd)),
    db.select().from(corporateAnnouncements).where(eq(corporateAnnouncements.companyId, companyId)).orderBy(desc(corporateAnnouncements.materialityScore), desc(corporateAnnouncements.announcedAt)).limit(15),
    db
      .select({ event: corporateEvents, execution: eventExecutionRecords })
      .from(corporateEvents)
      .leftJoin(eventExecutionRecords, eq(eventExecutionRecords.eventId, corporateEvents.id))
      .where(eq(corporateEvents.companyId, companyId))
      .orderBy(desc(corporateEvents.announcedAt)),
    db.select().from(managementChanges).where(eq(managementChanges.companyId, companyId)).orderBy(desc(managementChanges.effectiveDate)),
    db.query.marketPrices.findFirst({ where: eq(marketPrices.companyId, companyId) }),
    freshness(companyId),
  ]);
  const docIds = [
    ...statements.map((s) => s.sourceDocumentId),
    ...announcements.map((a) => a.sourceDocumentId),
    ...events.map((e) => e.event.sourceDocumentId),
    ...events.map((e) => e.execution?.sourceDocumentId ?? null),
  ].filter((x): x is string => Boolean(x));
  const docs = docIds.length ? await db.select().from(sourceDocuments).where(inArray(sourceDocuments.id, [...new Set(docIds)])) : [];
  const profileDoc = await db.query.sourceDocuments.findFirst({
    where: and(eq(sourceDocuments.companyId, companyId), eq(sourceDocuments.provider, 'yfinance'), eq(sourceDocuments.documentType, 'other')),
    orderBy: desc(sourceDocuments.createdAt),
  });
  const docMap = new Map(docs.map((d) => [d.id, d]));
  const analysis = analyseFinancials(statements, {
    sector: company.sector,
    industry: company.industry,
    docs: new Map(docs.map((d) => [d.id, { title: d.title, url: d.url, provider: d.provider }])),
  });
  return {
    company,
    statements,
    analysis,
    annual: statements.filter((s) => s.periodType === 'annual'),
    quarterly: statements.filter((s) => s.periodType === 'quarterly'),
    announcements,
    events,
    mgmt,
    quote,
    syncs,
    profileDoc: profileDoc ?? null,
    docs: docMap,
  };
}

type Context = Awaited<ReturnType<typeof loadContext>>;

const titleOf = (ctx: Context, id: string | null | undefined) => (id ? ctx.docs.get(id)?.title ?? null : null);

function factClaim(ctx: Context, s: Statement, label: string, value: number | null): Claim | null {
  if (value === null || value === undefined) return null;
  const text = label === 'Diluted EPS' ? `${label}: ${SYMBOL[s.currency] ?? s.currency + ' '}${value} (${s.periodLabel})` : `${label}: ${money(value, s)} (${s.periodLabel})`;
  return { label, text, value, unit: label === 'Diluted EPS' ? s.currency : `${s.currency} ${s.unit}`, period: s.periodLabel, claimType: 'reported_fact', sourceDocumentId: s.sourceDocumentId, sourceTitle: titleOf(ctx, s.sourceDocumentId) };
}

function metricClaims(ctx: Context, s: Statement, prior: Statement | undefined, labels: string[]): Claim[] {
  return computeMetrics(s, prior)
    .filter((m) => labels.includes(m.label) && m.value !== null)
    .map((m) => ({
      label: m.label,
      text: `${m.label}: ${fmtMetric(m, s)} (${s.periodLabel})`,
      value: m.value,
      unit: m.unit,
      period: s.periodLabel,
      formula: m.formula,
      claimType: 'calculated_metric' as const,
      sourceDocumentId: s.sourceDocumentId,
      sourceTitle: titleOf(ctx, s.sourceDocumentId),
    }));
}

function missing(s: Statement, prior: Statement | undefined, labels: string[]) {
  return computeMetrics(s, prior)
    .filter((m) => labels.includes(m.label) && m.value === null)
    .map((m) => m.label);
}

function buildDeterministic(ctx: Context): Record<SectionKey, Section> {
  const { company, annual, quarterly, events, quote } = ctx;
  const latest = annual[0] ?? quarterly[0];
  const priorAnnual = annual[1];
  const profileSrc = { sourceDocumentId: ctx.profileDoc?.id ?? null, sourceTitle: ctx.profileDoc?.title ?? null };

  // A. Business snapshot
  const profile: Claim[] = [];
  const pf = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') profile.push({ label, text: `${label}: ${value}`, claimType: 'reported_fact', ...profileSrc });
  };
  pf('Sector', company.sector);
  pf('Industry', company.industry);
  pf('Exchange', company.exchange);
  pf('Country', company.country);
  pf('Employees', company.employees?.toLocaleString('en-IN'));
  pf('Website', company.website);
  if (quote?.marketCap) pf('Market capitalisation', money(quote.marketCap / (quote.currency === 'INR' ? 1e7 : 1e6), { currency: quote.currency, unit: quote.currency === 'INR' ? 'crore' : 'million' }));
  if (quote?.enterpriseValue) pf('Enterprise value', money(quote.enterpriseValue / (quote.currency === 'INR' ? 1e7 : 1e6), { currency: quote.currency, unit: quote.currency === 'INR' ? 'crore' : 'million' }));
  if (company.description) profile.push({ label: 'Business description', text: company.description, claimType: 'reported_fact', ...profileSrc });
  const businessSnapshot: Section = profile.length
    ? { status: 'partial', reason: 'Revenue segments and competitor lists are not provided by Yahoo Finance; they require annual-report ingestion.', claims: profile }
    : unavailable('No company profile data is available.');

  // B. Financial snapshot (latest annual, plus latest quarter)
  const FIN_METRICS = ['Revenue growth', 'Gross margin', 'EBITDA margin', 'Operating margin', 'Net profit margin', 'ROE', 'ROA', 'ROCE', 'Debt to equity', 'Interest coverage'];
  let financialSnapshot: Section = unavailable('No financial statements are stored for this company.');
  if (latest) {
    const facts = REPORTED_FIELDS.map(([k, label]) => factClaim(ctx, latest, label, latest[k] as number | null)).filter((c): c is Claim => c !== null);
    const derivedEbitda = latest.ebitda === null ? ebitdaOf(latest) : null;
    if (derivedEbitda?.value !== null && derivedEbitda) {
      facts.push({ label: 'EBITDA', text: `EBITDA: ${money(derivedEbitda.value, latest)} (${latest.periodLabel})`, value: derivedEbitda.value, period: latest.periodLabel, formula: 'Operating income + depreciation & amortisation', claimType: 'calculated_metric', sourceDocumentId: latest.sourceDocumentId, sourceTitle: titleOf(ctx, latest.sourceDocumentId) });
    }
    const calcs = metricClaims(ctx, latest, latest.periodType === 'annual' ? priorAnnual : undefined, FIN_METRICS);
    const gaps = missing(latest, priorAnnual, FIN_METRICS);
    const latestQ = quarterly[0];
    const qFacts = latestQ ? (['revenue', 'pat'] as const).map((k) => factClaim(ctx, latestQ, k === 'revenue' ? 'Latest quarter revenue' : 'Latest quarter net income', latestQ[k])).filter((c): c is Claim => c !== null) : [];
    financialSnapshot = {
      status: gaps.length ? 'partial' : 'available',
      reason: gaps.length ? `Data unavailable for ${latest.periodLabel}: ${gaps.join(', ')}.` : undefined,
      claims: [...facts, ...qFacts, ...calcs],
    };
  }

  // C. Trajectory: annual + quarterly series and growth.
  const seriesOf = (rows: Statement[]) =>
    [...rows].reverse().map((s) => {
      const e = ebitdaOf(s);
      return {
        period: s.periodLabel,
        periodEnd: s.periodEnd,
        revenue: s.revenue,
        ebitda: e.value,
        pat: s.pat,
        operatingCashFlow: s.operatingCashFlow,
        freeCashFlow: s.freeCashFlow ?? (s.operatingCashFlow !== null && s.capex !== null ? round(s.operatingCashFlow - s.capex, 2) : null),
        borrowings: s.borrowings,
        ebitdaMargin: pct(e.value, s.revenue),
        netMargin: pct(s.pat, s.revenue),
      };
    });
  const annualSeries = seriesOf(annual.slice(0, 6));
  const quarterlySeries = seriesOf(quarterly.slice(0, 8));
  const growth: Claim[] = [];
  for (let i = 1; i < annualSeries.length; i++) {
    const a = annualSeries[i - 1];
    const b = annualSeries[i];
    const src = annual[annualSeries.length - 1 - i];
    if (a.revenue && b.revenue !== null) growth.push({ label: 'Revenue growth', text: `Revenue growth ${b.period} vs ${a.period}: ${pct(b.revenue - a.revenue, a.revenue)}%`, value: pct(b.revenue - a.revenue, a.revenue), unit: '%', period: b.period, formula: '(Revenue_t − Revenue_t−1) ÷ Revenue_t−1', claimType: 'calculated_metric', sourceDocumentId: src?.sourceDocumentId, sourceTitle: titleOf(ctx, src?.sourceDocumentId) });
    if (a.pat && b.pat !== null) growth.push({ label: 'Profit growth', text: `Net income growth ${b.period} vs ${a.period}: ${pct(b.pat - a.pat, Math.abs(a.pat))}%`, value: pct(b.pat - a.pat, Math.abs(a.pat)), unit: '%', period: b.period, formula: '(PAT_t − PAT_t−1) ÷ |PAT_t−1|', claimType: 'calculated_metric', sourceDocumentId: src?.sourceDocumentId, sourceTitle: titleOf(ctx, src?.sourceDocumentId) });
  }
  if (annualSeries.length >= 3) {
    const first = annualSeries[0];
    const last = annualSeries[annualSeries.length - 1];
    const years = annualSeries.length - 1;
    if (first.revenue && last.revenue && first.revenue > 0 && last.revenue > 0) {
      const cagr = round((Math.pow(last.revenue / first.revenue, 1 / years) - 1) * 100);
      growth.push({ label: 'Revenue CAGR', text: `Revenue CAGR ${first.period}–${last.period}: ${cagr}%`, value: cagr, unit: '%', formula: '(Revenue_last ÷ Revenue_first)^(1/years) − 1', claimType: 'calculated_metric', sourceDocumentId: annual[0]?.sourceDocumentId, sourceTitle: titleOf(ctx, annual[0]?.sourceDocumentId) });
    }
  }
  const capacityClaims: Claim[] = events
    .filter((e) => ['manufacturing_facility', 'capacity_expansion', 'new_business_division', 'rnd_project', 'acquisition'].includes(e.event.category))
    .map((e) => ({
      label: 'Expansion',
      text: `${e.event.title} — status: ${e.event.status.replace(/_/g, ' ')}${e.event.expectedCompletionDate ? `; expected ${e.event.expectedCompletionDate}` : ''}`,
      claimType: 'reported_fact' as const,
      sourceDocumentId: e.event.sourceDocumentId,
      sourceTitle: titleOf(ctx, e.event.sourceDocumentId),
    }));
  const statementUnit = latest ? { currency: latest.currency, unit: latest.unit } : null;
  const businessTrajectory: Section =
    annualSeries.length >= 2 || quarterlySeries.length >= 2 || capacityClaims.length
      ? { status: annualSeries.length >= 3 ? 'available' : 'partial', reason: annualSeries.length < 3 ? 'Fewer than three annual periods are available; trend analysis is limited.' : undefined, claims: [...growth, ...capacityClaims], data: { annual: annualSeries, quarterly: quarterlySeries, ...statementUnit } }
      : unavailable('At least two periods of financial statements, or tracked projects, are needed to describe a trajectory.');

  // D. Balance sheet
  const latestBs = annual.find((s) => s.totalAssets !== null) ?? quarterly.find((s) => s.totalAssets !== null);
  const balanceSheet: Section = latestBs
    ? {
        status: 'available',
        claims: [
          ...BALANCE_FIELDS.map(([k, label]) => factClaim(ctx, latestBs, label, latestBs[k] as number | null)).filter((c): c is Claim => c !== null),
          ...metricClaims(ctx, latestBs, undefined, ['Debt to equity', 'Current ratio', 'Net working capital']),
          ...(latestBs.borrowings !== null && latestBs.cashAndEquivalents !== null
            ? [{ label: 'Net debt', text: `Net debt: ${money(round(latestBs.borrowings - latestBs.cashAndEquivalents, 2), latestBs)} (${latestBs.periodLabel})`, value: round(latestBs.borrowings - latestBs.cashAndEquivalents, 2), period: latestBs.periodLabel, formula: 'Total debt − Cash & equivalents', claimType: 'calculated_metric' as const, sourceDocumentId: latestBs.sourceDocumentId, sourceTitle: titleOf(ctx, latestBs.sourceDocumentId) }]
            : []),
        ],
        data: { debtTrend: seriesOf(annual.slice(0, 6)).map((s) => ({ period: s.period, borrowings: s.borrowings })), ...statementUnit },
      }
    : unavailable('No balance-sheet data is stored for this company.');

  // E. Quality of cash
  const latestCf = annual.find((s) => s.operatingCashFlow !== null) ?? quarterly.find((s) => s.operatingCashFlow !== null);
  let cashQuality: Section = unavailable('No cash-flow statement data is stored for this company.');
  if (latestCf) {
    const conversion = annual
      .filter((s) => s.operatingCashFlow !== null && s.pat)
      .slice(0, 5)
      .reverse()
      .map((s) => ({ period: s.periodLabel, cfoPat: ratio(s.operatingCashFlow, s.pat) }));
    const redFlags: Claim[] = [];
    const cfoPat = ratio(latestCf.operatingCashFlow, latestCf.pat);
    if (cfoPat !== null && cfoPat < 0.7) {
      redFlags.push({ label: 'Red flag', text: `Weak cash conversion: CFO/PAT of ${cfoPat}× in ${latestCf.periodLabel} is below 0.7×.`, claimType: 'calculated_metric', formula: 'CFO ÷ PAT < 0.7', sourceDocumentId: latestCf.sourceDocumentId, sourceTitle: titleOf(ctx, latestCf.sourceDocumentId) });
    }
    const weakYears = conversion.filter((c) => c.cfoPat !== null && c.cfoPat < 0.7).length;
    if (weakYears >= 2) redFlags.push({ label: 'Red flag', text: `CFO/PAT was below 0.7× in ${weakYears} of the last ${conversion.length} years.`, claimType: 'calculated_metric', formula: 'Count of years with CFO ÷ PAT < 0.7', sourceDocumentId: latestCf.sourceDocumentId, sourceTitle: titleOf(ctx, latestCf.sourceDocumentId) });
    cashQuality = {
      status: 'available',
      claims: [
        ...CASH_FIELDS.map(([k, label]) => factClaim(ctx, latestCf, label, latestCf[k] as number | null)).filter((c): c is Claim => c !== null),
        ...metricClaims(ctx, latestCf, undefined, ['CFO / PAT', 'Free cash flow', 'Receivable days', 'Inventory days']),
        ...redFlags,
      ],
      data: { conversion },
    };
  }

  // F. Narrative vs numbers — only from recorded commitments with outcomes.
  const tracked = events.filter((e) => e.execution);
  const narrativeVsNumbers: Section = tracked.length
    ? {
        status: 'available',
        claims: tracked.map((e) => {
          const x = e.execution!;
          const variance = x.delayDays !== null ? (x.delayDays <= 30 ? 'on schedule' : `${Math.round(x.delayDays / 30.44)} months late`) : 'timeline variance not computable';
          return {
            label: e.event.title,
            text: `Committed ${e.event.announcedAt}${e.event.expectedCompletionDate ? ` for ${e.event.expectedCompletionDate}` : ''}. Outcome: ${x.outcome}${x.actualCompletionDate ? ` on ${x.actualCompletionDate}` : ''} — ${variance}.`,
            claimType: 'calculated_metric' as const,
            formula: 'Actual completion − expected completion',
            sourceDocumentId: x.sourceDocumentId ?? e.event.sourceDocumentId,
            sourceTitle: titleOf(ctx, x.sourceDocumentId ?? e.event.sourceDocumentId),
          };
        }),
        data: tracked.map((e) => ({
          eventId: e.event.id,
          statement: e.event.originalAnnouncement,
          statementDate: e.event.announcedAt,
          expected: { completion: e.event.expectedCompletionDate, capexCr: e.event.expectedCapexCr, capacity: e.event.expectedCapacityValue },
          actual: { completion: e.execution!.actualCompletionDate, capexCr: e.execution!.actualCapexCr, capacity: e.execution!.actualCapacityValue },
          delayDays: e.execution!.delayDays,
          capexVariancePct: e.execution!.capexVariancePct,
          assessment: e.execution!.guidanceAccuracy,
        })),
      }
    : unavailable('The comparison cannot be completed: no earnings-call transcripts or management commentary with verified outcomes are stored for this company. FINN does not reconstruct management statements.');

  // G. Forward guidance — open commitments only.
  const open = events.filter((e) => !['completed', 'abandoned'].includes(e.event.status));
  const forwardGuidance: Section = open.length
    ? {
        status: 'available',
        claims: open.map((e) => ({
          label: e.event.category.replace(/_/g, ' '),
          text: `${e.event.title}${e.event.expectedCapexCr ? ` · outlay ₹${e.event.expectedCapexCr} Cr` : ''}${e.event.expectedCapacityValue ? ` · ${e.event.expectedCapacityValue} ${e.event.expectedCapacityUnit ?? ''}` : ''}${e.event.expectedCompletionDate ? ` · target ${e.event.expectedCompletionDate}` : ' · no completion date disclosed'}`,
          claimType: 'reported_fact' as const,
          sourceDocumentId: e.event.sourceDocumentId,
          sourceTitle: titleOf(ctx, e.event.sourceDocumentId),
        })),
      }
    : unavailable('No management targets are recorded for this company. Guidance requires earnings-call transcripts or disclosures, which are not ingested.');

  const aiReason = features.ai ? 'Generated on request from the evidence above.' : 'Requires AI. Configure AI_PROVIDER, AI_API_KEY and AI_MODEL to generate it from stored evidence.';
  return {
    businessSnapshot,
    financialSnapshot,
    businessTrajectory,
    balanceSheet,
    cashQuality,
    narrativeVsNumbers,
    forwardGuidance,
    bullBear: unavailable(aiReason),
    investmentRisks: unavailable(aiReason),
    summary: unavailable(aiReason),
  };
}

// ---------------------------------------------------------------------------
// AI layer
// ---------------------------------------------------------------------------

// Limits are given to the model as descriptions and enforced after validation (see `capped`):
// schema-level max lengths make a whole response fail when a smaller model overruns one string.
const point = z.object({ text: z.string().describe('At most 2 sentences'), evidenceIds: z.array(z.string()).describe('Evidence ids, e.g. ["E3"]') });
const points = (max: number, describe: string) => z.array(point).describe(`${describe}. At most ${max} points.`);
const capped = (pts: Point[], max = 6) => pts.slice(0, max).map((p) => ({ text: p.text.length > 500 ? `${p.text.slice(0, 499)}…` : p.text, evidenceIds: p.evidenceIds.slice(0, 6) }));
type Point = z.infer<typeof point>;

/**
 * The analysis runs as three independent groups in parallel. Each group sees only the evidence
 * it needs (same ids as the full pack), so prompts stay small and sections fill as each finishes.
 */
export const AI_GROUPS = {
  business: {
    sections: ['businessSnapshot', 'businessTrajectory'] as SectionKey[],
    evidenceFrom: ['businessSnapshot', 'financialSnapshot', 'businessTrajectory'] as SectionKey[],
    withFilings: true,
    task: 'Assess the business model, positioning, growth drivers and business risks of {company}.',
    schema: z.object({
      businessOverview: points(4, 'Business model, products/services, segments, geography and positioning — only as supported by the evidence'),
      growthDrivers: points(4, 'Growth drivers and profitability trends supported by the evidence'),
      businessRisks: points(4, 'Business risks visible in the trajectory'),
    }),
  },
  financial: {
    sections: ['balanceSheet', 'cashQuality', 'narrativeVsNumbers', 'forwardGuidance'] as SectionKey[],
    evidenceFrom: ['financialSnapshot', 'balanceSheet', 'cashQuality', 'narrativeVsNumbers', 'forwardGuidance'] as SectionKey[],
    withFilings: true,
    task: 'Assess the financial stability, cash-flow quality, delivery against recorded commitments and forward guidance of {company}.',
    schema: z.object({
      balanceSheetView: points(3, 'Financial stability: leverage, liquidity, working capital'),
      cashQualityView: points(3, 'Cash conversion, free cash flow, capex intensity'),
      financialRisks: points(3, 'Financial risks'),
      narrativeAssessment: points(4, 'How recorded commitments compare with outcomes; empty if none are recorded'),
      guidanceView: points(3, 'What recorded open commitments imply for the outlook; empty if none are recorded'),
    }),
  },
  debate: {
    sections: ['bullBear', 'investmentRisks', 'summary'] as SectionKey[],
    evidenceFrom: [...SECTION_KEYS] as SectionKey[],
    withFilings: true,
    task: 'Debate the investment case for {company}: bull and bear arguments, industry and execution risks, and a structured analyst summary — what changed and why it matters, what supports the business, what concerns investors, and what to monitor next.',
    schema: z.object({
      bullCase: points(5, 'Bull case'),
      bearCase: points(5, 'Bear case'),
      industryRisks: points(3, 'Industry risks — only if evidence supports them'),
      executionRisks: points(3, 'Execution risks'),
      changes: z
        .array(
          z.object({
            change: z.string().describe('One sentence: what changed between the latest period and the previous comparable period, with the exact figures from the evidence'),
            implication: z.string().describe('One or two sentences: why it matters for the business. Present causes only as possibilities ("may reflect …") and say what data would settle it; never repeat the figure as the explanation'),
            evidenceIds: z.array(z.string()),
          }),
        )
        .describe('The most significant changes, largest first. At most 4.'),
      supports: points(4, 'What supports the business: e.g. improving profitability, strong cash generation, lower debt, efficiency gains, commitments delivered. Only with evidence; empty if none'),
      concerns: points(4, 'What concerns investors: e.g. slowing revenue, falling margins, weak cash conversion, rising receivables or debt, capex risk, missed commitments. Only with evidence; empty if none — never add a concern to fill the list'),
      monitor: z
        .array(z.object({ question: z.string().describe('A specific question or indicator to check in the next results, tied to this company’s figures'), evidenceIds: z.array(z.string()) }))
        .describe('3 to 5 things to monitor next'),
      unanswered: z.array(z.string()).describe('Important questions the evidence cannot answer (at most 5)'),
    }),
  },
} as const;
export type AiGroup = keyof typeof AI_GROUPS;
const GROUPS = Object.keys(AI_GROUPS) as AiGroup[];

/** Bumped when prompts or schemas change, so cached reports are not reused across versions. */
const PROMPT_VERSION = 'research-v5';

interface PackItem extends EvidenceItem {
  section: SectionKey | 'filings';
  sourceUrl?: string | null;
}

/** Full evidence pack with stable ids. Texts are compacted; duplicates are dropped. */
export function evidencePack(ctx: Context, sections: Record<SectionKey, Section>): PackItem[] {
  const items: PackItem[] = [];
  const seen = new Set<string>();
  const push = (section: PackItem['section'], kind: EvidenceItem['kind'], text: string, docId: string | null | undefined) => {
    const compact = text.replace(/\s+/g, ' ').trim().slice(0, 400);
    if (!compact || seen.has(compact)) return;
    seen.add(compact);
    const doc = docId ? ctx.docs.get(docId) ?? (docId === ctx.profileDoc?.id ? ctx.profileDoc : undefined) : undefined;
    items.push({ id: `E${items.length + 1}`, section, kind, text: compact, sourceDocumentId: docId ?? null, sourceTitle: doc?.title ?? null, sourceUrl: doc?.url ?? null });
  };
  // Period-on-period comparisons first: they carry the exact changes an analysis cites.
  for (const line of analysisEvidence(ctx.analysis)) push('financialSnapshot', 'calculated_metric', line.text, line.sourceDocumentId);
  for (const key of SECTION_KEYS) for (const c of sections[key].claims) push(key, c.claimType === 'calculated_metric' ? 'calculated_metric' : 'reported_fact', c.text, c.sourceDocumentId);
  for (const a of ctx.announcements) push('filings', 'document_excerpt', `${a.announcedAt.toISOString().slice(0, 10)} ${a.category}: ${a.title}. ${a.summary ?? ''}${a.isDemo ? ' [demonstration fixture]' : ''}`, a.sourceDocumentId);
  for (const m of ctx.mgmt) push('filings', 'reported_fact', `${m.changeType} of ${m.personName} as ${m.role}${m.effectiveDate ? ` effective ${m.effectiveDate}` : ''}.`, m.sourceDocumentId);
  return items.slice(0, 120);
}

const evidenceFor = (pack: PackItem[], group: AiGroup) => {
  const g = AI_GROUPS[group];
  return pack.filter((e) => (g.evidenceFrom as readonly string[]).includes(e.section) || (g.withFilings && e.section === 'filings'));
};

/** Keeps points that cite valid evidence and whose figures appear in that evidence. */
export function groundPoints(raw: Point[], evidence: EvidenceItem[]) {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const cited = keepCited(raw, evidence);
  const kept = cited.filter((p) => numbersGrounded(p.text, p.evidenceIds.map((id) => byId.get(id)!)));
  return { kept, dropped: raw.length - kept.length };
}

function toAiClaims(pts: Point[], evidence: EvidenceItem[], label?: string): Claim[] {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  return pts.map((p) => {
    const first = byId.get(p.evidenceIds[0]);
    return { label, text: p.text, claimType: 'ai_interpretation', sourceDocumentId: first?.sourceDocumentId ?? null, sourceTitle: first?.sourceTitle ?? `Evidence ${p.evidenceIds.join(', ')}` };
  });
}

function addAi(section: Section, claims: Claim[]) {
  if (!claims.length) return;
  section.claims.push(...claims);
  if (section.status === 'unavailable') {
    section.status = 'partial';
    section.reason = undefined;
  }
}

/** Merges one group's grounded output into the sections. Returns the number of dropped points. */
function applyGroup(group: AiGroup, out: Record<string, unknown>, evidence: EvidenceItem[], sections: Record<SectionKey, Section>): number {
  let dropped = 0;
  const g = (pts: unknown, label?: string) => {
    const r = groundPoints(capped((pts as Point[]) ?? []), evidence);
    dropped += r.dropped;
    return toAiClaims(r.kept, evidence, label);
  };
  if (group === 'business') {
    addAi(sections.businessSnapshot, g(out.businessOverview, 'Interpretation'));
    addAi(sections.businessTrajectory, [...g(out.growthDrivers, 'Growth driver'), ...g(out.businessRisks, 'Business risk')]);
  } else if (group === 'financial') {
    addAi(sections.balanceSheet, g(out.balanceSheetView, 'Assessment'));
    addAi(sections.cashQuality, g(out.cashQualityView, 'Assessment'));
    addAi(sections.narrativeVsNumbers, g(out.narrativeAssessment, 'Assessment'));
    addAi(sections.forwardGuidance, g(out.guidanceView, 'Outlook'));
    const financialRisks = g(out.financialRisks, 'Financial risk');
    if (financialRisks.length) {
      // Investment risks are owned by the debate group; financial risks are appended to it.
      const risks = sections.investmentRisks;
      risks.claims.push(...financialRisks);
      if (risks.status === 'unavailable') sections.investmentRisks = { status: 'partial', claims: risks.claims };
    }
  } else {
    const bull = g(out.bullCase, 'Bull');
    const bear = g(out.bearCase, 'Bear');
    sections.bullBear = bull.length || bear.length ? { status: 'available', claims: [...bull, ...bear] } : unavailable('No bull or bear point could be supported by the stored evidence.');
    const prior = sections.investmentRisks.claims.filter((c) => c.claimType === 'ai_interpretation');
    const risks = [...prior, ...g(out.industryRisks, 'Industry risk'), ...g(out.executionRisks, 'Execution risk')];
    sections.investmentRisks = risks.length ? { status: 'available', claims: risks } : unavailable('No risk could be supported by the stored evidence.');
    const intel = buildIntelligence(out, evidence);
    dropped += intel.dropped;
    const claimsOf = (items: Array<{ text: string; evidence: EvidenceRef[] }>, label: string): Claim[] =>
      items.map((i) => ({ label, text: i.text, claimType: 'ai_interpretation', sourceDocumentId: i.evidence[0]?.sourceDocumentId ?? null, sourceTitle: i.evidence[0]?.sourceTitle ?? null }));
    const summary = [
      ...claimsOf(intel.changes.map((c) => ({ text: `${c.change} ${c.implication}`, evidence: c.evidence })), 'What changed'),
      ...claimsOf(intel.supports, 'Supports'),
      ...claimsOf(intel.concerns, 'Concern'),
      ...claimsOf(intel.monitor.map((m) => ({ text: m.question, evidence: m.evidence })), 'Monitor'),
    ];
    sections.summary = {
      status: summary.length ? 'available' : 'partial',
      claims: summary,
      data: { intelligence: { changes: intel.changes, supports: intel.supports, concerns: intel.concerns, monitor: intel.monitor }, unanswered: ((out.unanswered as string[]) ?? []).slice(0, 5).map((q) => q.slice(0, 300)) },
    };
  }
  return dropped;
}

/** A cited evidence item, resolved so the UI can show it and link to its source. */
export interface EvidenceRef {
  id: string;
  text: string;
  kind: EvidenceItem['kind'];
  sourceDocumentId: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

const refsOf = (ids: string[], byId: Map<string, EvidenceItem & { sourceUrl?: string | null }>): EvidenceRef[] =>
  ids.map((id) => byId.get(id)!).map((e) => ({ id: e.id, text: e.text, kind: e.kind, sourceDocumentId: e.sourceDocumentId, sourceTitle: e.sourceTitle, sourceUrl: e.sourceUrl ?? null }));

/**
 * FINN Intelligence: keeps only items whose citations resolve and whose every figure appears in
 * the cited evidence (for a change, across both the change and its implication). Exported for tests.
 */
export function buildIntelligence(out: Record<string, unknown>, evidence: Array<EvidenceItem & { sourceUrl?: string | null }>) {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  let dropped = 0;
  const clip = (t: unknown, n = 400) => (typeof t === 'string' ? (t.length > n ? `${t.slice(0, n - 1)}…` : t).trim() : '');
  const verified = <T extends { evidenceIds: string[] }>(items: T[], textOf: (i: T) => string, max: number) => {
    const list = (Array.isArray(items) ? items : []).slice(0, max).map((i) => ({ ...i, evidenceIds: (i.evidenceIds ?? []).slice(0, 6) }));
    const kept = keepCited(list, evidence).filter((i) => textOf(i) && numbersGrounded(textOf(i), i.evidenceIds.map((id) => byId.get(id)!)));
    dropped += list.length - kept.length;
    return kept;
  };
  type Change = { change: string; implication: string; evidenceIds: string[] };
  type Monitor = { question: string; evidenceIds: string[] };
  const changes = verified((out.changes as Change[]) ?? [], (c) => `${clip(c.change)} ${clip(c.implication)}`.trim(), 4).map((c) => ({
    change: clip(c.change),
    implication: clip(c.implication),
    evidence: refsOf(c.evidenceIds, byId),
  }));
  const pointsOf = (key: string, max: number) =>
    verified((out[key] as Point[]) ?? [], (p) => clip(p.text), max).map((p) => ({ text: clip(p.text), evidence: refsOf(p.evidenceIds, byId) }));
  const monitor = verified((out.monitor as Monitor[]) ?? [], (m) => clip(m.question, 300), 5).map((m) => ({ question: clip(m.question, 300), evidence: refsOf(m.evidenceIds, byId) }));
  return { changes, supports: pointsOf('supports', 4), concerns: pointsOf('concerns', 4), monitor, dropped };
}

export type SectionProgress = 'loading' | 'available' | 'partial' | 'unavailable';
export interface ResearchProgress {
  stage: 'data' | 'analysis' | 'ai' | 'saving';
  sections?: Record<SectionKey, Section>;
  progress?: Record<SectionKey, SectionProgress>;
  timings?: Record<string, unknown>;
}

const statusMap = (sections: Record<SectionKey, Section>, loading: Set<SectionKey> = new Set()) =>
  Object.fromEntries(SECTION_KEYS.map((k) => [k, loading.has(k) ? 'loading' : sections[k].status])) as Record<SectionKey, SectionProgress>;

const clone = <T>(v: T): T => structuredClone(v);

/**
 * Builds and stores a research report.
 *   refreshData – refetch all provider data instead of using fresh cached data
 *   forceAi     – regenerate the AI analysis even when an identical report already exists
 *   onProgress  – called as stages complete (used by research jobs for progressive display)
 */
export async function generateReport(
  companyId: string,
  userId: string | null,
  opts: { refreshData?: boolean; forceAi?: boolean; onProgress?: (p: ResearchProgress) => Promise<void> | void } = {},
) {
  const t0 = performance.now();
  const ms = (since: number) => Math.round(performance.now() - since);
  const timings: Record<string, unknown> = {};
  const progress = async (p: ResearchProgress) => {
    try {
      await opts.onProgress?.(p);
    } catch (err) {
      console.warn('[research] progress update failed:', (err as Error).message);
    }
  };

  // Stage 1–2: resolve + retrieve (only stale datasets; one concurrent provider call).
  await progress({ stage: 'data' });
  let t = performance.now();
  const sync = await syncCompany(companyId, { force: Boolean(opts.refreshData) });
  timings.data = { totalMs: ms(t), ...(sync.timings ?? {}), datasets: Object.fromEntries(sync.results.map((r) => [r.dataset, r.status])) };

  // Stage 3: normalise + validate (stored statements → facts and calculated metrics).
  t = performance.now();
  const ctx = await loadContext(companyId);
  timings.contextMs = ms(t);
  t = performance.now();
  const sections = buildDeterministic(ctx);
  timings.analysisMs = ms(t);
  const limitations: string[] = [];
  let generator = ctx.statements.some((s) => s.provider === 'yfinance') ? 'finn-rules+yfinance' : 'finn-rules';

  const failed = sync.results.filter((r) => r.status === 'failed');
  if (failed.length) limitations.push(`Latest data could not be refreshed (${failed.map((f) => `${f.dataset}: ${f.detail}`).join('; ')}); the report uses the most recent stored data.`);
  const isDemo = ctx.statements.length > 0 ? ctx.statements.every((s) => s.isDemo) : ctx.company.isDemo;
  if (isDemo) limitations.push('Built from demonstration data; figures are not live market or filing data.');
  if (ctx.statements.some((s) => s.provider === 'yfinance')) {
    limitations.push('Financial statements come from Yahoo Finance via yfinance (unofficial). Coverage varies; quarterly balance-sheet and cash-flow data are often incomplete.');
    const ccy = ctx.statements[0]?.currency;
    if (ccy && ccy !== 'INR') limitations.push(`Statements are reported in ${ccy} (millions) on Yahoo Finance and are shown unconverted.`);
  }
  if (ctx.statements.length === 0) limitations.push('No financial statements are available for this company.');
  limitations.push('Earnings-call transcripts and annual reports are not ingested; segment data, guidance and management commentary are therefore limited.');

  const pack = evidencePack(ctx, sections);
  const aiOn = features.ai && pack.length >= 5;
  const aiSections = new Set<SectionKey>(aiOn ? GROUPS.flatMap((g) => AI_GROUPS[g].sections) : []);
  await progress({ stage: aiOn ? 'ai' : 'saving', sections: clone(sections), progress: statusMap(sections, aiSections), timings: { ...timings } });

  // Reuse: an identical evidence pack analysed by the same model yields the same report.
  const inputHash = createHash('sha256')
    .update(JSON.stringify({ v: PROMPT_VERSION, model: aiOn ? aiLabel() : null, pack: pack.map((e) => [e.kind, e.text]), limitations }))
    .digest('hex');
  if (!opts.forceAi) {
    const existing = await db.query.researchReports.findFirst({
      where: and(eq(researchReports.companyId, companyId), eq(researchReports.inputHash, inputHash)),
      orderBy: desc(researchReports.createdAt),
    });
    if (existing && existing.status !== 'failed') {
      timings.totalMs = ms(t0);
      return { report: existing, reused: true, timings };
    }
  }

  // Stage 4: AI analysis — three groups in parallel; each fills its sections when it lands.
  if (aiOn) {
    t = performance.now();
    const pending = new Set(aiSections);
    const aiTimings: Record<string, unknown> = {};
    let dropped = 0;
    let fallbackUsed = false;
    const modelsUsed = new Set<string>();
    const results = await Promise.allSettled(
      GROUPS.map(async (group) => {
        const def = AI_GROUPS[group];
        const evidence = evidenceFor(pack, group);
        const started = performance.now();
        try {
          const res = await generateStructuredWithMeta({
            schema: def.schema,
            tier: 'reasoning',
            task: `${def.task.replace('{company}', ctx.company.name)} Cite evidence ids for every point; prefer fewer, well-supported points; leave a list empty rather than speculate.`,
            evidence,
            meta: { feature: `research.${group}`, userId },
          });
          dropped += applyGroup(group, res.output as Record<string, unknown>, evidence, sections);
          fallbackUsed ||= res.usedFallback;
          modelsUsed.add(res.model);
          aiTimings[group] = { ms: ms(started), model: res.model, attempts: res.attempts, evidenceItems: evidence.length, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, reasoningTokens: res.usage.reasoningTokens };
        } catch (err) {
          const e = err instanceof AiError ? err : null;
          aiTimings[group] = { ms: ms(started), error: e?.code ?? 'error' };
          const reason = `AI analysis could not be generated: ${e?.userMessage ?? (err as Error).message.slice(0, 200)}`;
          for (const key of def.sections) if (sections[key].status === 'unavailable') sections[key] = unavailable(reason);
          throw err;
        } finally {
          for (const key of def.sections) pending.delete(key);
          await progress({ stage: 'ai', sections: clone(sections), progress: statusMap(sections, pending) });
        }
      }),
    );
    timings.ai = { totalMs: ms(t), groups: aiTimings };
    const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason as Error);
    // Name the models that actually produced the analysis (a fallback may have been used).
    if (errors.length < results.length) generator = `${generator}+${(aiLabel() ?? '').split(' · ')[0]} · ${[...modelsUsed].join(', ')}`;
    if (errors.length) {
      const first = errors[0] instanceof AiError ? (errors[0] as AiError).userMessage : errors[0].message.slice(0, 200);
      // Every AI group failed (quota, overload, outage): never replace existing research with a
      // facts-only report. The job fails with a retryable message and the previous report stays.
      if (errors.length === results.length) {
        const previous = await db.query.researchReports.findFirst({ where: and(eq(researchReports.companyId, companyId), ne(researchReports.status, 'failed')), columns: { id: true } });
        const reason = first.replace(/\s*Please try again[^.]*\.?$/i, '').replace(/\.$/, '');
        if (previous) throw new Error(`${reason}. Your previous research is unchanged; please try again in a few minutes.`);
      }
      limitations.push(`AI analysis was incomplete: ${errors.length} of ${results.length} analysis groups failed (${first}). Reported facts and calculated metrics are unaffected.`);
    }
    if (fallbackUsed) limitations.push(`The reasoning model was unavailable (quota, rate limit or overload); the analysis used the faster model (${[...modelsUsed].join(', ')}), which is less thorough.`);
    if (dropped > 0) limitations.push(`${dropped} AI point(s) were discarded because their citations or figures could not be verified against the evidence.`);
  } else if (!features.ai) {
    limitations.push('AI is not configured; only reported facts and calculated metrics are shown.');
  } else {
    limitations.push('Too little evidence for AI interpretation; AI sections were skipped.');
  }

  // Stage 5: persist.
  await progress({ stage: 'saving', sections: clone(sections), progress: statusMap(sections) });
  t = performance.now();
  const dataAsOf = ctx.syncs.filter((s) => s.status === 'ok').reduce<Date | null>((max, s) => (!max || s.fetchedAt > max ? s.fetchedAt : max), null);
  const report = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(researchReports)
      .values({
        companyId,
        requestedBy: userId,
        status: Object.values(sections).every((s) => s.status === 'unavailable') ? 'failed' : SECTION_KEYS.every((k) => sections[k].status === 'available') ? 'complete' : 'partial',
        generator,
        sections: sections as unknown as Record<string, unknown>,
        limitations,
        dataAsOf,
        inputHash,
        isDemo,
      })
      .returning();
    const evidenceRows = SECTION_KEYS.flatMap((section) =>
      sections[section].claims.map((c) => ({ reportId: row.id, section, claim: c.text.slice(0, 4000), claimType: c.claimType, sourceDocumentId: c.sourceDocumentId ?? null, excerpt: c.formula ? `Formula: ${c.formula}` : null })),
    );
    if (evidenceRows.length) await tx.insert(researchEvidence).values(evidenceRows);
    return row;
  });
  timings.persistMs = ms(t);
  timings.totalMs = ms(t0);
  await db.update(researchReports).set({ timings }).where(eq(researchReports.id, report.id));
  console.log(`[research] ${ctx.company.yahooSymbol ?? ctx.company.nseSymbol ?? ctx.company.id}: ${JSON.stringify({ totalMs: timings.totalMs, dataMs: (timings.data as { totalMs: number }).totalMs, aiMs: (timings.ai as { totalMs?: number } | undefined)?.totalMs ?? null, persistMs: timings.persistMs })}`);
  return { report: { ...report, timings }, reused: false, timings };
}

export async function getLatestReport(companyId: string, reportId?: string) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) throw ApiError.notFound('Company not found');
  const [history, quote, dataFreshness] = await Promise.all([
    db
      .select({ id: researchReports.id, generator: researchReports.generator, status: researchReports.status, createdAt: researchReports.createdAt, isDemo: researchReports.isDemo })
      .from(researchReports)
      .where(eq(researchReports.companyId, companyId))
      .orderBy(desc(researchReports.createdAt))
      .limit(20),
    db.query.marketPrices.findFirst({ where: eq(marketPrices.companyId, companyId) }),
    freshness(companyId),
  ]);
  const targetId = reportId ?? history[0]?.id;
  if (!targetId) return { company, quote: quote ?? null, freshness: dataFreshness, report: null, history };
  const report = await db.query.researchReports.findFirst({ where: and(eq(researchReports.id, targetId), eq(researchReports.companyId, companyId)) });
  if (!report) throw ApiError.notFound('Report not found');
  return { company, quote: quote ?? null, freshness: dataFreshness, report, history };
}

export async function getEvidence(companyId: string, reportId?: string) {
  const latest = await getLatestReport(companyId, reportId);
  if (!latest.report) return { reportId: null, items: [], documents: [] };
  const rows = await db
    .select({ evidence: researchEvidence, document: sourceDocuments })
    .from(researchEvidence)
    .leftJoin(sourceDocuments, eq(sourceDocuments.id, researchEvidence.sourceDocumentId))
    .where(eq(researchEvidence.reportId, latest.report.id));
  const documents = await db.select().from(sourceDocuments).where(eq(sourceDocuments.companyId, companyId)).orderBy(desc(sourceDocuments.publishedAt)).limit(50);
  return { reportId: latest.report.id, items: rows.map((r) => ({ ...r.evidence, document: r.document })), documents };
}

// ---------------------------------------------------------------------------
// Financial analysis (charts, assessments, insights) and Ask FINN
// ---------------------------------------------------------------------------

/** Deterministic analysis of the stored statements; available with or without a research report. */
export async function getFinancialAnalysis(companyId: string): Promise<FinancialAnalysis & { dataAsOf: Date | null; company: { name: string; sector: string | null } }> {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) throw ApiError.notFound('Company not found');
  const [statements, syncs] = await Promise.all([
    db.select().from(financialStatements).where(eq(financialStatements.companyId, companyId)).orderBy(desc(financialStatements.periodEnd)),
    freshness(companyId),
  ]);
  const ids = [...new Set(statements.map((s) => s.sourceDocumentId).filter((x): x is string => Boolean(x)))];
  const docs = ids.length
    ? await db.select({ id: sourceDocuments.id, title: sourceDocuments.title, url: sourceDocuments.url, provider: sourceDocuments.provider }).from(sourceDocuments).where(inArray(sourceDocuments.id, ids))
    : [];
  const analysis = analyseFinancials(statements, { sector: company.sector, industry: company.industry, docs: new Map(docs.map((d) => [d.id, d])) });
  const fin = syncs.find((s) => s.dataset === 'financials' && s.status === 'ok');
  return { ...analysis, dataAsOf: fin?.fetchedAt ?? null, company: { name: company.name, sector: company.sector } };
}

const askSchema = z.object({
  answer: points(5, 'The answer as 1–5 short points, most important first. Each point cites evidence. State reported figures as facts and label interpretations as such'),
  notCovered: z.string().describe('What the question asks that the evidence cannot answer (e.g. segment data, management commentary); empty string if fully answered'),
});

/** Answers are cached per company, question, evidence and model, so repeats cost no AI call. */
const askCache = new Map<string, { at: number; value: AskResult }>();
const ASK_TTL_MS = 12 * 60 * 60_000;

export interface AskResult {
  question: string;
  answer: Array<{ text: string; evidence: EvidenceRef[] }>;
  notCovered: string | null;
  model: string;
  generatedAt: string;
  dataAsOf: string | null;
  cached: boolean;
}

export async function askResearch(companyId: string, userId: string | null, rawQuestion: string): Promise<AskResult> {
  const question = rawQuestion.replace(/\s+/g, ' ').trim();
  if (!features.ai) throw ApiError.unavailable('AI is not configured on this server, so Ask FINN is unavailable. Reported figures and charts are unaffected.');
  const ctx = await loadContext(companyId);
  const pack = evidencePack(ctx, buildDeterministic(ctx));
  if (pack.length < 5) throw ApiError.unprocessable('There is too little stored data about this company to answer questions. Refresh its data first.');
  const dataAsOf = ctx.syncs.filter((s) => s.status === 'ok').reduce<Date | null>((max, s) => (!max || s.fetchedAt > max ? s.fetchedAt : max), null);
  const key = createHash('sha256')
    .update(JSON.stringify({ v: PROMPT_VERSION, companyId, q: question.toLowerCase(), model: aiLabel(), pack: pack.map((e) => e.text) }))
    .digest('hex');
  const hit = askCache.get(key);
  if (hit && Date.now() - hit.at < ASK_TTL_MS) return { ...hit.value, cached: true };

  let res;
  try {
    res = await generateStructuredWithMeta({
      schema: askSchema,
      tier: 'fast',
      task: `An investor asks about ${ctx.company.name}: "${question}". Answer only from the evidence, citing evidence ids for every point. Explain what the figures show and why it matters; where the cause is not in the evidence, say what data would be needed instead of guessing. Do not give buy, sell or price-target recommendations.`,
      evidence: pack,
      meta: { feature: 'research.ask', userId },
    });
  } catch (err) {
    const e = err instanceof AiError ? err : null;
    throw ApiError.unavailable(e?.userMessage ?? 'FINN could not answer right now. Please try again shortly.');
  }
  const byId = new Map(pack.map((e) => [e.id, e]));
  const raw = capped(((res.output as z.infer<typeof askSchema>).answer ?? []) as Point[], 5);
  const { kept } = groundPoints(raw, pack);
  const notCovered = ((res.output as z.infer<typeof askSchema>).notCovered ?? '').trim().slice(0, 400);
  const value: AskResult = {
    question,
    answer: kept.map((p) => ({ text: p.text, evidence: refsOf(p.evidenceIds, byId) })),
    notCovered: kept.length ? notCovered || null : notCovered || 'FINN could not support an answer to this question with the stored evidence.',
    model: res.model,
    generatedAt: new Date().toISOString(),
    dataAsOf: dataAsOf?.toISOString() ?? null,
    cached: false,
  };
  if (askCache.size >= 200) askCache.delete(askCache.keys().next().value!);
  askCache.set(key, { at: Date.now(), value });
  return value;
}
