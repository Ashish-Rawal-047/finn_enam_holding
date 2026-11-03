/**
 * Financial analysis: values match hand calculations, gaps are never filled, growth compares only
 * like periods, lenders are treated separately, and AI intelligence keeps only verifiable points.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseFinancials, analysisEvidence, buildSeries, type StatementRow } from '../src/services/financialAnalysis.js';
import { buildIntelligence } from '../src/services/research.js';

const row = (o: Partial<StatementRow> & Pick<StatementRow, 'periodType' | 'periodLabel' | 'periodEnd'>): StatementRow => ({
  currency: 'INR',
  unit: 'crore',
  revenue: null,
  operatingIncome: null,
  ebitda: null,
  ebit: null,
  depreciation: null,
  interestExpense: null,
  pat: null,
  eps: null,
  totalEquity: null,
  cashAndEquivalents: null,
  borrowings: null,
  operatingCashFlow: null,
  capex: null,
  freeCashFlow: null,
  sourceDocumentId: 'doc-annual',
  provider: 'yfinance',
  ...o,
});

// TCS figures as stored from Yahoo Finance (₹ crore).
const tcs: StatementRow[] = [
  row({ periodType: 'annual', periodLabel: 'FY23', periodEnd: '2023-03-31', revenue: 225458, pat: 42147, eps: 115.19, operatingCashFlow: 41965, capex: 3100, freeCashFlow: 38865, borrowings: 7688, cashAndEquivalents: 7115, totalEquity: 90424, ebitda: 59259 }),
  row({ periodType: 'annual', periodLabel: 'FY24', periodEnd: '2024-03-31', revenue: 240893, pat: 45908, eps: 125.88, operatingCashFlow: 44338, capex: 2674, freeCashFlow: 41664, borrowings: 8021, cashAndEquivalents: 9007, totalEquity: 90489, ebitda: 64296 }),
  row({ periodType: 'annual', periodLabel: 'FY25', periodEnd: '2025-03-31', revenue: 255324, pat: 48553, eps: 134.19, operatingCashFlow: 48908, capex: 3937, freeCashFlow: 44971, borrowings: 9392, cashAndEquivalents: 8331, totalEquity: 94756, ebitda: 67407 }),
  row({ periodType: 'annual', periodLabel: 'FY26', periodEnd: '2026-03-31', revenue: 267021, pat: 49210, eps: 136.01, operatingCashFlow: 52094, capex: 4146, freeCashFlow: 47948, borrowings: 11283, cashAndEquivalents: 6405, totalEquity: 95000, ebitda: 69425 }),
  // Quarterly: Q4 FY25 reported with no figures; Q2 FY26 absent entirely.
  row({ periodType: 'quarterly', periodLabel: 'Q4 FY25', periodEnd: '2025-03-31', sourceDocumentId: 'doc-q' }),
  row({ periodType: 'quarterly', periodLabel: 'Q1 FY26', periodEnd: '2025-06-30', revenue: 63437, pat: 12760, sourceDocumentId: 'doc-q' }),
  row({ periodType: 'quarterly', periodLabel: 'Q3 FY26', periodEnd: '2025-12-31', revenue: 67087, pat: 10657, sourceDocumentId: 'doc-q' }),
  row({ periodType: 'quarterly', periodLabel: 'Q4 FY26', periodEnd: '2026-03-31', revenue: 70698, pat: 13718, sourceDocumentId: 'doc-q' }),
  row({ periodType: 'quarterly', periodLabel: 'Q1 FY27', periodEnd: '2026-06-30', revenue: 72275, pat: 13349, sourceDocumentId: 'doc-q' }),
  row({ periodType: 'quarterly', periodLabel: 'Q2 FY27', periodEnd: '2026-09-30', revenue: 73188, pat: 13884, sourceDocumentId: 'doc-q' }),
];

const docs = new Map([
  ['doc-annual', { title: 'Yahoo Finance annual financial statements', url: 'https://finance.yahoo.com/quote/TCS.NS/financials', provider: 'yfinance' }],
  ['doc-q', { title: 'Yahoo Finance quarterly financial statements', url: 'https://finance.yahoo.com/quote/TCS.NS/financials', provider: 'yfinance' }],
]);

test('annual series: values and growth match hand calculations', () => {
  const a = analyseFinancials(tcs, { sector: 'Technology', docs });
  const fy26 = a.annual.find((p) => p.period === 'FY26')!;
  assert.equal(fy26.revenueGrowth, Math.round(((267021 - 255324) / 255324) * 1000) / 10); // 4.6
  assert.equal(fy26.profitGrowth, Math.round(((49210 - 48553) / 48553) * 1000) / 10); // 1.4
  assert.equal(fy26.netMargin, Math.round((49210 / 267021) * 1000) / 10);
  assert.equal(fy26.ebitdaMargin, Math.round((69425 / 267021) * 1000) / 10);
  assert.equal(fy26.cfoToPat, Math.round((52094 / 49210) * 100) / 100);
  assert.equal(fy26.netDebt, 11283 - 6405);
  assert.equal(fy26.comparedWith, 'FY25');
  assert.equal(a.annual[0].revenueGrowth, null, 'the first year has nothing to compare against');
  assert.equal(a.latestPeriod, 'FY26');
  assert.equal(a.previousPeriod, 'FY25');
});

test('quarterly series: gaps are labelled slots, never interpolated; growth is year-on-year only', () => {
  const q = buildSeries(tcs, 'quarterly', 8);
  assert.deepEqual(
    q.map((p) => `${p.period}${p.missing ? '*' : ''}`),
    ['Q1 FY26', 'Q2 FY26*', 'Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27'],
    'leading empty Q4 FY25 dropped; missing Q2 FY26 inserted as a gap',
  );
  const gap = q.find((p) => p.period === 'Q2 FY26')!;
  assert.equal(gap.revenue, null);
  const q1fy27 = q.find((p) => p.period === 'Q1 FY27')!;
  assert.equal(q1fy27.comparedWith, 'Q1 FY26');
  assert.equal(q1fy27.revenueGrowth, Math.round(((72275 - 63437) / 63437) * 1000) / 10);
  // Q2 FY27's year-ago quarter is missing, and Q4 FY26's year-ago row is empty: no growth.
  assert.equal(q.find((p) => p.period === 'Q2 FY27')!.revenueGrowth, null);
  assert.equal(q.find((p) => p.period === 'Q4 FY26')!.revenueGrowth, null);
  // Never quarter-on-quarter.
  assert.equal(q.find((p) => p.period === 'Q3 FY26')!.revenueGrowth, null);
});

test('insights: latest year vs previous, with direction, tone and source', () => {
  const a = analyseFinancials(tcs, { sector: 'Technology', docs });
  const growth = a.insights.find((i) => i.key === 'revenueGrowth')!;
  const fy25Growth = Math.round(((255324 - 240893) / 240893) * 1000) / 10; // 6.0
  assert.equal(growth.previous, fy25Growth);
  assert.equal(growth.headline, 'Revenue growth slowed');
  assert.equal(growth.tone, 'negative');
  assert.equal(growth.source.url, 'https://finance.yahoo.com/quote/TCS.NS/financials');
  assert.ok(a.insights.length >= 4 && a.insights.length <= 6);
  for (const i of a.insights) assert.ok(i.whyItMatters.length > 20 && i.period === 'FY26' && i.previousPeriod === 'FY25');
  const assessments = Object.fromEntries(a.assessments.map((s) => [s.key, s.label]));
  assert.equal(assessments.cash, 'Cash-backed profits');
  assert.equal(assessments.balanceSheet, 'Low leverage');
  assert.ok(a.gaps.some((g) => g.includes('Q2 FY26')));
});

test('a missing fiscal year is not bridged: no growth across the gap', () => {
  const rows = tcs.filter((r) => r.periodLabel !== 'FY25');
  const a = analyseFinancials(rows, { sector: 'Technology', docs });
  assert.deepEqual(a.annual.map((p) => `${p.period}${p.missing ? '*' : ''}`), ['FY23', 'FY24', 'FY25*', 'FY26']);
  assert.equal(a.annual.find((p) => p.period === 'FY26')!.revenueGrowth, null);
  assert.equal(a.insights.length, 0);
  assert.ok(a.gaps.some((g) => g.includes('not consecutive')));
});

test('lenders: no EBITDA, net margin used, leverage marked structural', () => {
  const bank = tcs.filter((r) => r.periodType === 'annual').map((r) => ({ ...r, ebitda: null, operatingCashFlow: -5000 }));
  const a = analyseFinancials(bank, { sector: 'Financial Services', docs });
  assert.equal(a.isFinancialSector, true);
  const bs = a.assessments.find((s) => s.key === 'balanceSheet')!;
  assert.equal(bs.label, 'Lender');
  assert.ok(a.insights.every((i) => !['cashConversion', 'freeCashFlow', 'leverage'].includes(i.key)));
  assert.equal(a.insights.find((i) => i.key === 'margin')?.metric, 'Net margin');
});

test('analysis evidence carries the exact changes, so AI figures can be verified', () => {
  const lines = analysisEvidence(analyseFinancials(tcs, { sector: 'Technology', docs })).map((l) => l.text);
  assert.ok(lines.some((l) => l.startsWith('Revenue growth: 4.6% in FY26 vs 6.0% in FY25 (change −1.4 pp)')));
});

test('FINN Intelligence keeps only cited, number-grounded points', () => {
  const evidence = [
    { id: 'E1', kind: 'calculated_metric' as const, text: 'Revenue growth: 4.6% in FY26 vs 6.0% in FY25 (change −1.4 pp).', sourceDocumentId: 'doc-annual', sourceTitle: 'Yahoo Finance annual financial statements', sourceUrl: 'https://finance.yahoo.com/quote/TCS.NS/financials' },
    { id: 'E2', kind: 'calculated_metric' as const, text: 'Cash conversion: 1.06× in FY26 vs 1.01× in FY25.', sourceDocumentId: 'doc-annual', sourceTitle: 'Yahoo Finance annual financial statements', sourceUrl: null },
  ];
  const out = {
    changes: [
      { change: 'Revenue growth slowed to 4.6% from 6.0%.', implication: 'This may reflect weaker demand; segment data would settle it.', evidenceIds: ['E1'] },
      { change: 'Revenue growth slowed to 4.6%.', implication: 'Peers grew 12%.', evidenceIds: ['E1'] }, // invented figure
      { change: 'Margins fell.', implication: 'Costs rose.', evidenceIds: ['E9'] }, // unknown citation
    ],
    supports: [{ text: 'Operating cash flow exceeded profit (1.06×).', evidenceIds: ['E2'] }],
    concerns: [{ text: 'Growth is slowing.', evidenceIds: [] }], // uncited
    monitor: [{ question: 'Can revenue growth recover above 6.0%?', evidenceIds: ['E1'] }],
  };
  const r = buildIntelligence(out, evidence);
  assert.equal(r.changes.length, 1);
  assert.equal(r.changes[0].evidence[0].sourceUrl, 'https://finance.yahoo.com/quote/TCS.NS/financials');
  assert.equal(r.supports.length, 1);
  assert.equal(r.concerns.length, 0);
  assert.equal(r.monitor.length, 1);
  assert.equal(r.dropped, 3);
});
