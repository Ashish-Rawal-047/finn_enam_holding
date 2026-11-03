/**
 * Deterministic financial analysis over stored statements (no AI, no network).
 *
 *   series       – one row per period for charts. Missing periods inside the range become explicit
 *                  `missing` slots (never interpolated). Growth is computed only against the
 *                  comparable period one year earlier (annual: previous FY; quarterly: same quarter
 *                  last year), matched by period-end date, so gaps never produce a false comparison.
 *   assessments  – growth, profitability, cash generation and balance sheet, each from stated rules
 *                  (shown to the user) with the figures behind it. No overall score.
 *   insights     – latest fiscal year vs the previous one, ranked by size of change, each with the
 *                  metric, the comparison, the direction and rule-based context.
 *
 * Every value is either reported by the source or calculated from reported values with a stated
 * formula. Exported for tests.
 */
export interface StatementRow {
  periodType: 'annual' | 'quarterly' | string;
  periodLabel: string;
  periodEnd: string | Date;
  currency: string;
  unit: string;
  revenue: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  ebit: number | null;
  depreciation: number | null;
  interestExpense: number | null;
  pat: number | null;
  eps: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  borrowings: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  sourceDocumentId: string | null;
  provider?: string | null;
  isDemo?: boolean | null;
}

export interface SourceRef {
  documentId: string | null;
  title: string | null;
  url: string | null;
  provider: string | null;
}

export interface PeriodPoint {
  period: string;
  periodEnd: string | null;
  /** True for a period inside the range that the source did not report (a gap slot). */
  missing: boolean;
  revenue: number | null;
  pat: number | null;
  ebitda: number | null;
  ebitdaDerived: boolean;
  operatingIncome: number | null;
  eps: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  cfoToPat: number | null;
  borrowings: number | null;
  cash: number | null;
  netDebt: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;
  /** Growth vs the comparable period one year earlier, in %; null when not comparable. */
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  /** Label of the period the growth figures compare against. */
  comparedWith: string | null;
  sourceDocumentId: string | null;
}

export type Tone = 'positive' | 'negative' | 'neutral';

export interface Assessment {
  key: 'growth' | 'profitability' | 'cash' | 'balanceSheet';
  title: string;
  label: string;
  tone: Tone;
  value: string | null;
  detail: string;
  rule: string;
  period: string | null;
}

export interface Insight {
  key: string;
  headline: string;
  metric: string;
  value: number;
  display: string;
  previous: number | null;
  previousDisplay: string | null;
  change: string | null;
  direction: 'up' | 'down' | 'flat';
  tone: Tone;
  whyItMatters: string;
  period: string;
  previousPeriod: string | null;
  formula: string;
  source: SourceRef;
  /** Used for ranking only. */
  weight: number;
}

export interface FinancialAnalysis {
  currency: string;
  unit: string;
  isFinancialSector: boolean;
  isDemo: boolean;
  annual: PeriodPoint[];
  quarterly: PeriodPoint[];
  latestPeriod: string | null;
  previousPeriod: string | null;
  assessments: Assessment[];
  insights: Insight[];
  sources: SourceRef[];
  gaps: string[];
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const pct = (num: number | null, den: number | null) => (num !== null && den ? round((num / den) * 100) : null);
const ratio = (num: number | null, den: number | null, dp = 2) => (num !== null && den ? round(num / den, dp) : null);
const DAY = 86_400_000;
const time = (d: string | Date) => new Date(d).getTime();

const SYMBOL: Record<string, string> = { INR: '₹', USD: 'US$', EUR: '€', GBP: '£', JPY: '¥' };

export function formatMoney(value: number | null, currency: string, unit: string): string {
  if (value === null) return 'n/a';
  const sym = SYMBOL[currency] ?? `${currency} `;
  const n = Math.abs(value).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1 });
  return `${value < 0 ? '−' : ''}${sym}${n} ${unit === 'crore' ? 'Cr' : 'M'}`;
}
const fmtPct = (v: number | null) => (v === null ? 'n/a' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`);
const fmtX = (v: number | null) => (v === null ? 'n/a' : `${v.toFixed(2)}×`);
const fmtPp = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)} pp`;
const fmtRel = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)}%`;

/** Periods the source reported but with no figures at all are treated like gaps. */
const isEmpty = (s: StatementRow) => s.revenue === null && s.pat === null && s.operatingCashFlow === null && s.borrowings === null && s.totalEquity === null;

/** "Q1 FY26" → next "Q2 FY26"; "FY25" → "FY26". Null when the label has another shape. */
function nextLabel(label: string, type: string): string | null {
  if (type === 'annual') {
    const m = /^FY(\d{2,4})$/.exec(label);
    if (!m) return null;
    const n = Number(m[1]) + 1;
    return `FY${String(n).padStart(m[1].length, '0')}`;
  }
  const m = /^Q([1-4]) FY(\d{2,4})$/.exec(label);
  if (!m) return null;
  const q = Number(m[1]);
  const fy = Number(m[2]);
  return q === 4 ? `Q1 FY${String(fy + 1).padStart(m[2].length, '0')}` : `Q${q + 1} FY${m[2]}`;
}

const blank = (period: string): PeriodPoint => ({
  period,
  periodEnd: null,
  missing: true,
  revenue: null,
  pat: null,
  ebitda: null,
  ebitdaDerived: false,
  operatingIncome: null,
  eps: null,
  ebitdaMargin: null,
  operatingMargin: null,
  netMargin: null,
  operatingCashFlow: null,
  capex: null,
  freeCashFlow: null,
  cfoToPat: null,
  borrowings: null,
  cash: null,
  netDebt: null,
  debtToEquity: null,
  interestCoverage: null,
  revenueGrowth: null,
  profitGrowth: null,
  epsGrowth: null,
  comparedWith: null,
  sourceDocumentId: null,
});

function pointOf(s: StatementRow): PeriodPoint {
  const derivedEbitda = s.ebitda === null && s.operatingIncome !== null && s.depreciation !== null;
  const ebitda = s.ebitda ?? (derivedEbitda ? round(s.operatingIncome! + s.depreciation!, 2) : null);
  const fcf = s.freeCashFlow ?? (s.operatingCashFlow !== null && s.capex !== null ? round(s.operatingCashFlow - Math.abs(s.capex), 2) : null);
  const ebit = s.ebit ?? s.operatingIncome;
  return {
    period: s.periodLabel,
    periodEnd: new Date(s.periodEnd).toISOString().slice(0, 10),
    missing: isEmpty(s),
    revenue: s.revenue,
    pat: s.pat,
    ebitda,
    ebitdaDerived: derivedEbitda,
    operatingIncome: s.operatingIncome,
    eps: s.eps,
    ebitdaMargin: pct(ebitda, s.revenue),
    operatingMargin: pct(s.operatingIncome, s.revenue),
    netMargin: pct(s.pat, s.revenue),
    operatingCashFlow: s.operatingCashFlow,
    capex: s.capex === null ? null : Math.abs(s.capex),
    freeCashFlow: fcf,
    // Only meaningful while profit is positive.
    cfoToPat: s.pat !== null && s.pat > 0 ? ratio(s.operatingCashFlow, s.pat) : null,
    borrowings: s.borrowings,
    cash: s.cashAndEquivalents,
    netDebt: s.borrowings !== null && s.cashAndEquivalents !== null ? round(s.borrowings - s.cashAndEquivalents, 2) : null,
    debtToEquity: s.totalEquity !== null && s.totalEquity > 0 ? ratio(s.borrowings, s.totalEquity) : null,
    interestCoverage: s.interestExpense && s.interestExpense > 0 ? ratio(ebit, s.interestExpense, 1) : null,
    revenueGrowth: null,
    profitGrowth: null,
    epsGrowth: null,
    comparedWith: null,
    sourceDocumentId: s.sourceDocumentId,
  };
}

/** Growth only while the base is positive (a change from a loss is not a growth rate). */
const growth = (now: number | null, before: number | null) => (now !== null && before !== null && before > 0 ? round(((now - before) / before) * 100) : null);

/** Oldest → newest, gap slots inserted, growth vs the period one year earlier. */
export function buildSeries(rows: StatementRow[], type: 'annual' | 'quarterly', limit: number): PeriodPoint[] {
  const sorted = rows.filter((r) => r.periodType === type).sort((a, b) => time(a.periodEnd) - time(b.periodEnd));
  const points: PeriodPoint[] = [];
  const stepDays = type === 'annual' ? 365 : 91;
  for (const row of sorted) {
    const prev = points[points.length - 1];
    if (prev?.periodEnd) {
      // Insert labelled gap slots for periods the source skipped (e.g. a missing quarter).
      const gapCount = Math.round((time(row.periodEnd) - time(prev.periodEnd)) / DAY / stepDays) - 1;
      let label = prev.period;
      for (let k = 0; k < Math.min(gapCount, 8); k++) {
        const next = nextLabel(label, type);
        if (!next || next === row.periodLabel) break;
        points.push(blank(next));
        label = next;
      }
    }
    points.push(pointOf(row));
  }
  // Year-ago comparison by date: 350–380 days earlier.
  for (const p of points) {
    if (p.missing || !p.periodEnd) continue;
    const base = points.find((q) => !q.missing && q.periodEnd && Math.abs(time(p.periodEnd!) - time(q.periodEnd) - 365 * DAY) <= 15 * DAY);
    if (!base) continue;
    p.revenueGrowth = growth(p.revenue, base.revenue);
    p.profitGrowth = growth(p.pat, base.pat);
    p.epsGrowth = growth(p.eps, base.eps);
    if (p.revenueGrowth !== null || p.profitGrowth !== null || p.epsGrowth !== null) p.comparedWith = base.period;
  }
  // Leading/trailing empty slots carry no information; keep gaps that sit between reported periods.
  while (points.length && points[0].missing) points.shift();
  while (points.length && points[points.length - 1].missing) points.pop();
  return points.slice(-limit);
}

// ---------------------------------------------------------------------------

const GROWTH_RULE = 'Latest revenue growth vs the previous year: a change of 2 pp or more is accelerating or slowing; negative growth is declining.';
const PROFIT_RULE = 'Change in EBITDA margin (net margin for lenders) vs the previous year: ±1 pp or more is improving or weakening.';
const CASH_RULE = 'Operating cash flow ÷ net profit: 0.9× or more is cash-backed, 0.7–0.9× moderate, below 0.7× weak; free cash flow sign shown.';
const BS_RULE = 'Cash at least equal to debt is net cash; otherwise debt ÷ equity below 0.5× is low, 0.5–1.5× moderate, above 1.5× high leverage.';

function assess(latest: PeriodPoint | undefined, prior: PeriodPoint | undefined, lender: boolean, ccy: string, unit: string): Assessment[] {
  const out: Assessment[] = [];
  const period = latest?.period ?? null;

  // Growth
  if (latest?.revenueGrowth !== null && latest?.revenueGrowth !== undefined) {
    const g = latest.revenueGrowth;
    const g0 = prior?.revenueGrowth ?? null;
    const label = g < 0 ? 'Declining' : g0 === null ? 'Growing' : g - g0 >= 2 ? 'Accelerating' : g0 - g >= 2 ? 'Slowing' : 'Steady';
    out.push({
      key: 'growth',
      title: 'Revenue growth',
      label,
      tone: label === 'Declining' || label === 'Slowing' ? 'negative' : label === 'Accelerating' ? 'positive' : 'neutral',
      value: fmtPct(g),
      detail: g0 === null ? `${latest.period} vs ${latest.comparedWith}` : `${fmtPct(g)} in ${latest.period} vs ${fmtPct(g0)} in ${prior!.period}`,
      rule: GROWTH_RULE,
      period,
    });
  } else {
    out.push({ key: 'growth', title: 'Revenue growth', label: 'Not computable', tone: 'neutral', value: null, detail: 'Two consecutive years of revenue are needed.', rule: GROWTH_RULE, period });
  }

  // Profitability
  const marginKey = lender || latest?.ebitdaMargin === null ? 'netMargin' : 'ebitdaMargin';
  const marginName = marginKey === 'netMargin' ? 'Net margin' : 'EBITDA margin';
  const m = latest?.[marginKey] ?? null;
  const m0 = prior?.[marginKey] ?? null;
  if (m !== null) {
    const d = m0 !== null ? round(m - m0) : null;
    const label = d === null ? 'Single period' : d >= 1 ? 'Improving' : d <= -1 ? 'Weakening' : 'Stable';
    out.push({
      key: 'profitability',
      title: 'Profitability',
      label,
      tone: label === 'Improving' ? 'positive' : label === 'Weakening' ? 'negative' : 'neutral',
      value: `${marginName} ${fmtPct(m)}`,
      detail: d === null ? `${marginName} ${fmtPct(m)} in ${latest!.period}` : `${marginName} ${fmtPct(m)} vs ${fmtPct(m0)} (${fmtPp(d)})`,
      rule: PROFIT_RULE,
      period,
    });
  } else {
    out.push({ key: 'profitability', title: 'Profitability', label: 'Not computable', tone: 'neutral', value: null, detail: 'Revenue and profit are needed.', rule: PROFIT_RULE, period });
  }

  // Cash generation
  const cf = latest?.cfoToPat ?? null;
  if (lender) {
    out.push({
      key: 'cash',
      title: 'Cash generation',
      label: 'Not meaningful for lenders',
      tone: 'neutral',
      value: null,
      detail: 'New loans are paid out of operating cash flow, so a growing loan book makes it negative by design; profit-to-cash conversion does not apply.',
      rule: CASH_RULE,
      period,
    });
  } else if (cf !== null) {
    const fcf = latest!.freeCashFlow;
    const label = fcf !== null && fcf < 0 ? 'Negative free cash flow' : cf >= 0.9 ? 'Cash-backed profits' : cf >= 0.7 ? 'Moderate conversion' : 'Weak conversion';
    out.push({
      key: 'cash',
      title: 'Cash generation',
      label,
      tone: cf >= 0.9 && (fcf === null || fcf > 0) ? 'positive' : cf < 0.7 || (fcf !== null && fcf < 0) ? 'negative' : 'neutral',
      value: `${fmtX(cf)} CFO/PAT`,
      detail: `Operating cash flow ${formatMoney(latest!.operatingCashFlow, ccy, unit)}${fcf !== null ? ` · free cash flow ${formatMoney(fcf, ccy, unit)}` : ''}`,
      rule: CASH_RULE,
      period,
    });
  } else {
    out.push({ key: 'cash', title: 'Cash generation', label: 'Not computable', tone: 'neutral', value: null, detail: latest?.pat !== null && latest?.pat !== undefined && latest.pat <= 0 ? 'Net profit is not positive, so cash conversion is not meaningful.' : 'Cash-flow data is not available.', rule: CASH_RULE, period });
  }

  // Balance sheet
  if (lender) {
    out.push({
      key: 'balanceSheet',
      title: 'Balance sheet',
      label: 'Lender',
      tone: 'neutral',
      value: latest?.debtToEquity !== null && latest?.debtToEquity !== undefined ? `${fmtX(latest.debtToEquity)} debt/equity` : null,
      detail: 'Borrowing funds the loan book, so leverage is structural and not comparable with non-financial companies. Capital adequacy and asset quality are not in the data.',
      rule: BS_RULE,
      period,
    });
  } else if (latest && latest.borrowings !== null && latest.cash !== null) {
    const netCash = latest.cash >= latest.borrowings;
    const de = latest.debtToEquity;
    const label = netCash ? 'Net cash' : de === null ? 'Net debt' : de < 0.5 ? 'Low leverage' : de <= 1.5 ? 'Moderate leverage' : 'High leverage';
    out.push({
      key: 'balanceSheet',
      title: 'Balance sheet',
      label,
      tone: netCash || label === 'Low leverage' ? 'positive' : label === 'High leverage' ? 'negative' : 'neutral',
      value: netCash ? formatMoney(latest.cash - latest.borrowings, ccy, unit) : de !== null ? `${fmtX(de)} debt/equity` : formatMoney(latest.netDebt, ccy, unit),
      detail: `Debt ${formatMoney(latest.borrowings, ccy, unit)} · cash ${formatMoney(latest.cash, ccy, unit)}${latest.interestCoverage !== null ? ` · interest cover ${latest.interestCoverage.toFixed(1)}×` : ''}`,
      rule: BS_RULE,
      period,
    });
  } else {
    out.push({ key: 'balanceSheet', title: 'Balance sheet', label: 'Not computable', tone: 'neutral', value: null, detail: 'Debt and cash are not both available.', rule: BS_RULE, period });
  }
  return out;
}

// ---------------------------------------------------------------------------

interface InsightCtx {
  latest: PeriodPoint;
  prior: PeriodPoint;
  ccy: string;
  unit: string;
  lender: boolean;
  source: SourceRef;
}

function insightsOf(c: InsightCtx): Insight[] {
  const { latest: l, prior: p, ccy, unit, lender, source } = c;
  const money = (v: number | null) => formatMoney(v, ccy, unit);
  const out: Insight[] = [];
  const base = { period: l.period, previousPeriod: p.period, source };

  // Revenue growth: acceleration or slowdown.
  if (l.revenueGrowth !== null && p.revenueGrowth !== null) {
    const d = round(l.revenueGrowth - p.revenueGrowth);
    const dir = Math.abs(d) < 0.5 ? 'flat' : d > 0 ? 'up' : 'down';
    out.push({
      ...base,
      key: 'revenueGrowth',
      metric: 'Revenue growth',
      headline: l.revenueGrowth < 0 ? 'Revenue declined' : dir === 'up' ? 'Revenue growth accelerated' : dir === 'down' ? 'Revenue growth slowed' : 'Revenue growth held steady',
      value: l.revenueGrowth,
      display: fmtPct(l.revenueGrowth),
      previous: p.revenueGrowth,
      previousDisplay: fmtPct(p.revenueGrowth),
      change: fmtPp(d),
      direction: dir,
      tone: dir === 'flat' ? 'neutral' : dir === 'up' ? 'positive' : 'negative',
      whyItMatters:
        dir === 'down'
          ? 'With slower sales growth, profit growth depends more on margins and costs. The data has no segment split, so it cannot show whether volume, pricing or mix caused the slowdown.'
          : dir === 'up'
            ? 'Faster sales growth can lift profit more than proportionally if costs grow slower than revenue (operating leverage).'
            : 'Growth is consistent with the previous year; the margin and cash trends show whether it is converting into profit.',
      formula: '(Revenue − prior-year revenue) ÷ prior-year revenue; change in percentage points',
      weight: Math.min(3, Math.abs(d) / 2),
    });
  }

  // Net profit.
  if (l.profitGrowth !== null && l.pat !== null && p.pat !== null) {
    const g = l.profitGrowth;
    const outpaced = l.revenueGrowth !== null ? g - l.revenueGrowth : null;
    out.push({
      ...base,
      key: 'profitGrowth',
      metric: 'Net profit',
      headline: g < 0 ? 'Net profit fell' : outpaced !== null && outpaced >= 2 ? 'Profit grew faster than revenue' : outpaced !== null && outpaced <= -2 ? 'Profit grew slower than revenue' : 'Net profit grew',
      value: l.pat,
      display: money(l.pat),
      previous: p.pat,
      previousDisplay: money(p.pat),
      change: fmtRel(g),
      direction: Math.abs(g) < 0.5 ? 'flat' : g > 0 ? 'up' : 'down',
      tone: g < 0 || (outpaced !== null && outpaced <= -2) ? 'negative' : outpaced !== null && outpaced >= 2 ? 'positive' : 'neutral',
      whyItMatters:
        outpaced !== null && outpaced <= -2
          ? `${g < 0 ? `Net profit fell ${fmtPct(Math.abs(g))} while revenue grew` : `Profit grew ${fmtPct(g)} against revenue growth of`} ${fmtPct(l.revenueGrowth)}, so costs, interest, depreciation or tax rose faster than sales.`
          : outpaced !== null && outpaced >= 2
            ? `Profit grew ${fmtPct(g)} against revenue growth of ${fmtPct(l.revenueGrowth)}: each rupee of extra sales added more profit than before.`
            : g < 0
              ? 'Lower profit reduces what is available for reinvestment and dividends; the margin trend shows where it was lost.'
              : 'Profit moved broadly in line with revenue.',
      formula: '(Net profit − prior-year net profit) ÷ prior-year net profit',
      weight: Math.min(3, Math.abs(outpaced ?? g) / 3),
    });
  }

  // Margin.
  const mk = lender || l.ebitdaMargin === null ? 'netMargin' : 'ebitdaMargin';
  const mName = mk === 'netMargin' ? 'Net margin' : 'EBITDA margin';
  const m = l[mk];
  const m0 = p[mk];
  if (m !== null && m0 !== null) {
    const d = round(m - m0);
    const dir = Math.abs(d) < 0.3 ? 'flat' : d > 0 ? 'up' : 'down';
    const onePoint = l.revenue !== null ? round(l.revenue / 100, l.revenue / 100 >= 100 ? 0 : 1) : null;
    out.push({
      ...base,
      key: 'margin',
      metric: mName,
      headline: dir === 'up' ? `${mName} widened` : dir === 'down' ? `${mName} narrowed` : `${mName} stable`,
      value: m,
      display: fmtPct(m),
      previous: m0,
      previousDisplay: fmtPct(m0),
      change: fmtPp(d),
      direction: dir,
      tone: dir === 'flat' ? 'neutral' : dir === 'up' ? 'positive' : 'negative',
      whyItMatters:
        onePoint !== null
          ? `On ${l.period} revenue of ${money(l.revenue)}, each percentage point of margin is worth about ${money(onePoint)} of ${mk === 'netMargin' ? 'net' : 'operating'} profit.`
          : 'Margin shows how much of each rupee of sales is kept as profit.',
      formula: mk === 'netMargin' ? 'Net profit ÷ Revenue' : l.ebitdaDerived ? '(Operating income + D&A) ÷ Revenue' : 'EBITDA ÷ Revenue',
      weight: Math.min(3, Math.abs(d)),
    });
  }

  // Cash conversion.
  if (!lender && l.cfoToPat !== null && p.cfoToPat !== null) {
    const d = round(l.cfoToPat - p.cfoToPat, 2);
    const dir = Math.abs(d) < 0.05 ? 'flat' : d > 0 ? 'up' : 'down';
    out.push({
      ...base,
      key: 'cashConversion',
      metric: 'Cash conversion',
      headline: l.cfoToPat < 0.7 ? 'Profit not converting to cash' : dir === 'up' ? 'Cash conversion improved' : dir === 'down' ? 'Cash conversion weakened' : 'Cash conversion steady',
      value: l.cfoToPat,
      display: `${fmtX(l.cfoToPat)}`,
      previous: p.cfoToPat,
      previousDisplay: fmtX(p.cfoToPat),
      change: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(2)}×`,
      direction: dir,
      tone: l.cfoToPat < 0.7 || (dir === 'down' && l.cfoToPat < 0.9) ? 'negative' : l.cfoToPat >= 0.9 && dir !== 'down' ? 'positive' : 'neutral',
      whyItMatters:
        l.cfoToPat >= 1
          ? `Operating cash flow (${money(l.operatingCashFlow)}) exceeded net profit (${money(l.pat)}), so reported earnings are backed by cash.`
          : `Only ${Math.round(l.cfoToPat * 100)}% of net profit arrived as operating cash. Rising receivables or inventory are common causes and are worth checking in the balance sheet.`,
      formula: 'Operating cash flow ÷ Net profit',
      weight: Math.min(3, Math.abs(d) * 4 + (l.cfoToPat < 0.7 ? 1.5 : 0)),
    });
  }

  // Free cash flow.
  if (!lender && l.freeCashFlow !== null && p.freeCashFlow !== null) {
    const g = p.freeCashFlow > 0 ? round(((l.freeCashFlow - p.freeCashFlow) / p.freeCashFlow) * 100) : null;
    const turnedNegative = l.freeCashFlow < 0 && p.freeCashFlow >= 0;
    out.push({
      ...base,
      key: 'freeCashFlow',
      metric: 'Free cash flow',
      headline: turnedNegative ? 'Free cash flow turned negative' : l.freeCashFlow < 0 ? 'Free cash flow negative' : g !== null && g >= 5 ? 'Free cash flow rose' : g !== null && g <= -5 ? 'Free cash flow fell' : 'Free cash flow steady',
      value: l.freeCashFlow,
      display: money(l.freeCashFlow),
      previous: p.freeCashFlow,
      previousDisplay: money(p.freeCashFlow),
      change: g !== null ? fmtRel(g) : null,
      direction: l.freeCashFlow > p.freeCashFlow ? 'up' : l.freeCashFlow < p.freeCashFlow ? 'down' : 'flat',
      tone: l.freeCashFlow < 0 || (g !== null && g <= -5) ? 'negative' : g !== null && g >= 5 ? 'positive' : 'neutral',
      whyItMatters:
        l.freeCashFlow < 0
          ? `Capital expenditure (${money(l.capex)}) exceeded operating cash flow (${money(l.operatingCashFlow)}); the shortfall has to come from cash reserves or new funding.`
          : `After capital expenditure of ${money(l.capex)}, ${money(l.freeCashFlow)} remained for dividends, buybacks, acquisitions or debt reduction.`,
      formula: 'Operating cash flow − Capital expenditure',
      weight: turnedNegative ? 3 : Math.min(2.5, Math.abs(g ?? 0) / 10),
    });
  }

  // Leverage (non-lenders).
  if (!lender && l.debtToEquity !== null && p.debtToEquity !== null && l.netDebt !== null && l.netDebt > 0) {
    const d = round(l.debtToEquity - p.debtToEquity, 2);
    const dir = Math.abs(d) < 0.05 ? 'flat' : d > 0 ? 'up' : 'down';
    out.push({
      ...base,
      key: 'leverage',
      metric: 'Debt to equity',
      headline: dir === 'up' ? 'Leverage increased' : dir === 'down' ? 'Leverage reduced' : 'Leverage steady',
      value: l.debtToEquity,
      display: fmtX(l.debtToEquity),
      previous: p.debtToEquity,
      previousDisplay: fmtX(p.debtToEquity),
      change: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(2)}×`,
      direction: dir,
      tone: dir === 'up' ? 'negative' : dir === 'down' ? 'positive' : 'neutral',
      whyItMatters: `Net debt is ${money(l.netDebt)}. Higher leverage raises fixed interest costs and leaves less room if earnings weaken.`,
      formula: 'Total debt ÷ Shareholders’ equity',
      weight: Math.min(3, Math.abs(d) * 5),
    });
  }

  // Interest coverage when it is tight or moving.
  if (!lender && l.interestCoverage !== null && p.interestCoverage !== null && l.interestCoverage < 10) {
    const d = round(l.interestCoverage - p.interestCoverage, 1);
    out.push({
      ...base,
      key: 'interestCoverage',
      metric: 'Interest coverage',
      headline: d < 0 ? 'Interest cover fell' : d > 0 ? 'Interest cover improved' : 'Interest cover steady',
      value: l.interestCoverage,
      display: `${l.interestCoverage.toFixed(1)}×`,
      previous: p.interestCoverage,
      previousDisplay: `${p.interestCoverage.toFixed(1)}×`,
      change: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)}×`,
      direction: d > 0 ? 'up' : d < 0 ? 'down' : 'flat',
      tone: l.interestCoverage < 3 || d < -1 ? 'negative' : d > 1 ? 'positive' : 'neutral',
      whyItMatters: 'Operating profit covers interest this many times; below about 3× a fall in earnings quickly strains debt service.',
      formula: 'EBIT ÷ Interest expense',
      weight: Math.min(3, Math.abs(d) / 2 + (l.interestCoverage < 3 ? 1.5 : 0)),
    });
  }

  // EPS growth.
  if (l.epsGrowth !== null && l.eps !== null && p.eps !== null) {
    out.push({
      ...base,
      key: 'eps',
      metric: 'Earnings per share',
      headline: l.epsGrowth < 0 ? 'EPS declined' : 'EPS grew',
      value: l.eps,
      display: `${SYMBOL[ccy] ?? ccy + ' '}${l.eps.toFixed(2)}`,
      previous: p.eps,
      previousDisplay: `${SYMBOL[ccy] ?? ccy + ' '}${p.eps.toFixed(2)}`,
      change: fmtRel(l.epsGrowth),
      direction: Math.abs(l.epsGrowth) < 0.5 ? 'flat' : l.epsGrowth > 0 ? 'up' : 'down',
      tone: l.epsGrowth < 0 ? 'negative' : l.profitGrowth !== null && l.epsGrowth - l.profitGrowth <= -2 ? 'negative' : 'neutral',
      whyItMatters:
        l.profitGrowth !== null && l.epsGrowth - l.profitGrowth <= -2
          ? `EPS ${l.epsGrowth < 0 ? `fell ${fmtPct(-l.epsGrowth)}` : `grew ${fmtPct(l.epsGrowth)}`} while net profit ${l.profitGrowth < 0 ? `fell ${fmtPct(-l.profitGrowth)}` : `grew ${fmtPct(l.profitGrowth)}`}; the weaker per-share result suggests a higher share count (dilution).`
          : 'EPS is the per-share profit that valuation multiples are based on.',
      formula: 'Diluted EPS as reported; growth vs prior year',
      weight: 0.5,
    });
  }
  return out;
}

/** Picks the most informative insights, keeping at least one of each available tone. */
function rank(insights: Insight[], max = 6): Insight[] {
  const sorted = [...insights].sort((a, b) => b.weight - a.weight);
  const picked = sorted.slice(0, max);
  for (const tone of ['positive', 'negative'] as const) {
    if (!picked.some((i) => i.tone === tone)) {
      const extra = sorted.find((i) => i.tone === tone && !picked.includes(i));
      if (extra) picked.splice(picked.length - 1, 1, extra);
    }
  }
  return picked.sort((a, b) => b.weight - a.weight);
}

export function analyseFinancials(
  rows: StatementRow[],
  opts: { sector?: string | null; industry?: string | null; docs?: Map<string, { title: string | null; url: string | null; provider: string | null }> } = {},
): FinancialAnalysis {
  const docs = opts.docs ?? new Map();
  const lender = /financial|bank|insurance|nbfc|credit/i.test(`${opts.sector ?? ''} ${opts.industry ?? ''}`) && rows.every((r) => r.ebitda === null);
  const annual = buildSeries(rows, 'annual', 6);
  const quarterly = buildSeries(rows, 'quarterly', 8);
  const first = rows.find((r) => r.revenue !== null) ?? rows[0];
  const ccy = first?.currency ?? 'INR';
  const unit = first?.unit ?? 'crore';
  const reported = annual.filter((p) => !p.missing);
  const latest = reported[reported.length - 1];
  // The comparison base is the period the latest growth was computed against (one year earlier).
  const prior = latest?.comparedWith ? reported.find((p) => p.period === latest.comparedWith) : undefined;
  const sourceOf = (id: string | null): SourceRef => {
    const d = id ? docs.get(id) : undefined;
    return { documentId: id, title: d?.title ?? null, url: d?.url ?? null, provider: d?.provider ?? rows[0]?.provider ?? null };
  };
  const insights = latest && prior ? rank(insightsOf({ latest, prior, ccy, unit, lender, source: sourceOf(latest.sourceDocumentId) })) : [];
  const gaps: string[] = [];
  const missingSlots = [...annual, ...quarterly].filter((p) => p.missing).map((p) => p.period);
  if (missingSlots.length) gaps.push(`The source did not report figures for ${missingSlots.join(', ')}; those periods are shown as gaps.`);
  if (quarterly.length && quarterly.every((q) => q.operatingCashFlow === null)) gaps.push('Quarterly cash-flow statements are not available from the source.');
  if (annual.length && !prior) gaps.push('The two latest fiscal years are not consecutive, so year-on-year changes are not computed.');
  const sourceIds = [...new Set(rows.map((r) => r.sourceDocumentId).filter((x): x is string => Boolean(x)))];
  return {
    currency: ccy,
    unit,
    isFinancialSector: lender,
    isDemo: rows.length > 0 && rows.every((r) => r.isDemo),
    annual,
    quarterly,
    latestPeriod: latest?.period ?? null,
    previousPeriod: prior?.period ?? null,
    assessments: rows.length ? assess(latest, prior, lender, ccy, unit) : [],
    insights,
    sources: sourceIds.map(sourceOf),
    gaps,
  };
}

/**
 * Evidence lines for the AI: the period comparisons with their exact figures (including the
 * changes), so an interpretation can cite them and its numbers can be verified.
 */
export function analysisEvidence(a: FinancialAnalysis): Array<{ text: string; sourceDocumentId: string | null }> {
  const lines: Array<{ text: string; sourceDocumentId: string | null }> = [];
  for (const i of a.insights) {
    lines.push({
      text: `${i.metric}: ${i.display} in ${i.period} vs ${i.previousDisplay ?? 'n/a'} in ${i.previousPeriod}${i.change ? ` (change ${i.change})` : ''}. Formula: ${i.formula}.`,
      sourceDocumentId: i.source.documentId,
    });
  }
  // Assessments are computed from the latest reported fiscal year.
  const latestSource = [...a.annual].reverse().find((p) => !p.missing)?.sourceDocumentId ?? null;
  for (const s of a.assessments) if (s.value) lines.push({ text: `${s.title} (${s.period}): ${s.label} — ${s.detail}.`, sourceDocumentId: latestSource });
  // Recent quarters (year-on-year where comparable).
  for (const q of a.quarterly.slice(-4)) {
    if (q.missing || q.revenue === null) continue;
    const yoy = q.revenueGrowth !== null ? `; revenue growth ${fmtPct(q.revenueGrowth)} vs ${q.comparedWith}` : '';
    const pyoy = q.profitGrowth !== null ? `; net profit growth ${fmtPct(q.profitGrowth)}` : '';
    lines.push({ text: `${q.period}: revenue ${formatMoney(q.revenue, a.currency, a.unit)}, net profit ${formatMoney(q.pat, a.currency, a.unit)}${q.netMargin !== null ? `, net margin ${fmtPct(q.netMargin)}` : ''}${yoy}${pyoy}.`, sourceDocumentId: q.sourceDocumentId });
  }
  return lines;
}
