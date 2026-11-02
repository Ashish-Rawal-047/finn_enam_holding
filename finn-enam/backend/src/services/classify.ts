/**
 * Deterministic (tier-0) classification and materiality scoring for corporate
 * announcements. Provider category labels are mapped when recognised; otherwise the title
 * is matched against keyword rules. Materiality, not announcement volume, drives priority.
 */

export const ANNOUNCEMENT_CATEGORIES = [
  'results',
  'acquisition',
  'merger',
  'fund_raise',
  'expansion',
  'new_project',
  'capacity_addition',
  'order_win',
  'management_change',
  'regulatory',
  'litigation',
  'credit_rating',
  'debt',
  'dividend',
  'corporate_action',
  'promoter_pledge',
  'insider_trading',
  'earnings_call',
  'investor_meeting',
  'routine',
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  results: 'Financial results',
  acquisition: 'Acquisition',
  merger: 'Merger / restructuring',
  fund_raise: 'Fundraising',
  expansion: 'Expansion',
  new_project: 'New project',
  capacity_addition: 'Capacity addition',
  order_win: 'Order win',
  management_change: 'Management change',
  regulatory: 'Regulatory development',
  litigation: 'Litigation / tax',
  credit_rating: 'Credit rating',
  debt: 'Debt development',
  dividend: 'Dividend',
  corporate_action: 'Bonus / split',
  promoter_pledge: 'Promoter pledge',
  insider_trading: 'Insider trading',
  earnings_call: 'Earnings call',
  investor_meeting: 'Investor meeting',
  routine: 'Routine compliance',
};

/** Base materiality (0-100) before modifiers. */
const BASE_SCORE: Record<AnnouncementCategory, number> = {
  results: 70,
  acquisition: 72,
  merger: 75,
  fund_raise: 62,
  expansion: 60,
  new_project: 58,
  capacity_addition: 60,
  order_win: 60,
  management_change: 55,
  regulatory: 55,
  litigation: 55,
  credit_rating: 40,
  debt: 50,
  dividend: 25,
  corporate_action: 30,
  promoter_pledge: 60,
  insider_trading: 35,
  earnings_call: 20,
  investor_meeting: 10,
  routine: 5,
};

const PROVIDER_LABELS: Record<string, AnnouncementCategory> = {
  results: 'results',
  'm&a': 'acquisition',
  fund_raise: 'fund_raise',
  management_change: 'management_change',
  litigation: 'litigation',
  insider_trading: 'insider_trading',
  earnings_call: 'earnings_call',
  investor_meetings: 'investor_meeting',
  credit_rating: 'credit_rating',
  dividend: 'dividend',
  bonus_split: 'corporate_action',
  pledging: 'promoter_pledge',
  postal_ballot: 'routine',
  agm_egm: 'routine',
  unclassified: 'routine',
};

const KEYWORD_RULES: Array<[RegExp, AnnouncementCategory]> = [
  [/\b(financial results?|quarterly results?|audited results|unaudited results)\b/i, 'results'],
  [/\b(amalgamation|merger|demerger|scheme of arrangement)\b/i, 'merger'],
  [/\b(acquisition|acquire|share purchase agreement|stake purchase)\b/i, 'acquisition'],
  [/\b(qip|qualified institutions? placement|rights issue|preferential (issue|allotment)|fund ?rais)/i, 'fund_raise'],
  [/\b(appointment|resignation|cessation|re-?designation|retire(ment)?)\b.*\b(ceo|cfo|coo|md|chief (executive|financial|operating) officer|managing director|chairman|chairperson|director|key managerial|kmp|company secretary)\b/i, 'management_change'],
  [/\b(ceo|cfo|chief (executive|financial|operating) officer|managing director|chairman)\b.*\b(appoint|resign|step(s|ped)? down|retire)/i, 'management_change'],
  [/\b(capacity|commission(ing|ed)|greenfield|brownfield|new (plant|facility|manufacturing))\b/i, 'capacity_addition'],
  [/\b(capex|capital expenditure|expansion)\b/i, 'expansion'],
  [/\b(order|contract) (win|award|received|bagged)|\bletter of award\b|\bcontract award\b/i, 'order_win'],
  [/\b(credit rating|rating action|crisil|icra|care ratings|india ratings)\b/i, 'credit_rating'],
  [/\b(search|survey|show cause|penalty|demand notice|assessment order|tax (notice|demand)|litigation|lawsuit|arbitration|nclt|insolvency)\b/i, 'litigation'],
  [/\b(sebi|rbi|usfda|warning letter|import alert|regulatory approval|licen[cs]e)\b/i, 'regulatory'],
  [/\b(pledge|encumbrance)\b/i, 'promoter_pledge'],
  [/\b(ncd|debenture|borrowing|refinanc|loan|repayment|deleverag)/i, 'debt'],
  [/\bdividend\b/i, 'dividend'],
  [/\b(bonus|stock split|sub-division)\b/i, 'corporate_action'],
  [/\b(sast|insider trading|pit regulations)\b/i, 'insider_trading'],
  [/\b(earnings call|conference call|concall|transcript)\b/i, 'earnings_call'],
  [/\b(analyst|investor) (meet|meeting|conference)\b/i, 'investor_meeting'],
];

export function classifyAnnouncement(rawCategory: string | null, title: string): AnnouncementCategory {
  const mapped = rawCategory ? PROVIDER_LABELS[rawCategory.trim().toLowerCase()] : undefined;
  // Provider labels like "press_release" or "capex" are too coarse; refine them by title.
  if (mapped && mapped !== 'routine') return mapped;
  for (const [pattern, category] of KEYWORD_RULES) {
    if (pattern.test(title)) return category;
  }
  if (rawCategory?.toLowerCase() === 'capex') return 'expansion';
  return mapped ?? 'routine';
}

const SENIOR_ROLES = /\b(chief executive|ceo|chief financial|cfo|managing director|\bmd\b|chair(man|person)|whole[- ]time director|executive director)\b/i;

export function isSeniorRole(role: string): boolean {
  return SENIOR_ROLES.test(role);
}

/** Parses "₹1,200 Crore", "Rs 26,000 cr" etc. Returns crore. */
export function extractCroreAmount(text: string): number | null {
  const m = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(crore|cr\b|lakh crore)/i.exec(text);
  if (!m) return null;
  const value = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return /lakh crore/i.test(m[2]) ? value * 100_000 : value;
}

export function materialityScore(input: {
  category: AnnouncementCategory;
  title: string;
  summary?: string | null;
  managementRole?: string | null;
  resultsYoY?: number | null;
}): number {
  let score = BASE_SCORE[input.category];
  const text = `${input.title} ${input.summary ?? ''}`;
  if (input.category === 'management_change') {
    score += input.managementRole && isSeniorRole(input.managementRole) ? 25 : -15;
  }
  const amount = extractCroreAmount(text);
  if (amount !== null && ['acquisition', 'merger', 'fund_raise', 'expansion', 'new_project', 'capacity_addition', 'order_win', 'litigation', 'debt'].includes(input.category)) {
    score += amount >= 5_000 ? 20 : amount >= 1_000 ? 12 : amount >= 250 ? 6 : 0;
  }
  if (input.resultsYoY !== null && input.resultsYoY !== undefined) {
    const mag = Math.abs(input.resultsYoY);
    score += mag >= 30 ? 18 : mag >= 15 ? 10 : mag >= 5 ? 4 : 0;
  }
  if (/\b(search|raid|fraud|default|downgrade|resign)/i.test(text)) score += 10;
  return Math.max(0, Math.min(100, score));
}

/** Routine paperwork (or anything scored this low) never alerts and is collapsed in the digest. */
export const ROUTINE_BELOW = 20;
export const isRoutineFiling = (category: string, score: number) => category === 'routine' || score < ROUTINE_BELOW;

export function priorityFromScore(score: number): Priority {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Price / volume priority relative to a threshold (used per user). */
export function priorityFromMultiple(multipleOfThreshold: number): Priority {
  if (multipleOfThreshold >= 3) return 'critical';
  if (multipleOfThreshold >= 2) return 'high';
  if (multipleOfThreshold >= 1) return 'medium';
  return 'low';
}
