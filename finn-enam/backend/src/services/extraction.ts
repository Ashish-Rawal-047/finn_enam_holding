/**
 * Corporate event extraction from announcements.
 *
 * Tier 0 (always): deterministic rules for category, project type, capex, capacity and the
 * expected completion date.
 * Tier 1 (when the AI Gateway is configured): a fast model proposes structured fields from
 * the same text. AI numbers and dates are accepted only when they are traceable to the
 * source text; anything else is discarded.
 */
import { z } from 'zod';
import { features } from '../config/env.js';
import { AiUnavailableError, generateStructured } from '../ai/gateway.js';
import { extractCroreAmount, type AnnouncementCategory } from './classify.js';
import { EVENT_CATEGORIES, type CreateEventInput } from './events.js';

type EventCategory = (typeof EVENT_CATEGORIES)[number];

const PROJECT_TYPES: Array<[RegExp, string]> = [
  [/\b(semiconductor|osat|chip|wafer)\b/i, 'semiconductor'],
  [/\b(notebook|laptop|it hardware|display module|smartphone|mobile phone|electronics manufacturing|ems)\b/i, 'electronics assembly'],
  [/\b(store|outlet|showroom)s?\b/i, 'retail stores'],
  [/\b(wind|solar|renewable|turbine)\b/i, 'renewable energy'],
  [/\b(api|formulation|pharma|drug)\b/i, 'pharmaceutical'],
  [/\b(cable|wire)s?\b/i, 'cables & wires'],
  [/\b(ev|electric vehicle|battery|cell)\b/i, 'ev & batteries'],
  [/\b(data cent(er|re)|cloud)\b/i, 'data centre'],
  [/\b(refinery|petrochemical)\b/i, 'refining'],
];

const FACILITY = /\b(plant|facility|factory|campus|unit|greenfield|brownfield|manufacturing)\b/i;

export function inferProjectType(text: string): string | null {
  for (const [re, type] of PROJECT_TYPES) if (re.test(text)) return type;
  return FACILITY.test(text) ? 'manufacturing plant' : null;
}

export function mapEventCategory(category: AnnouncementCategory, text: string): EventCategory | null {
  switch (category) {
    case 'capacity_addition':
    case 'expansion':
      return FACILITY.test(text) ? 'manufacturing_facility' : 'capacity_expansion';
    case 'new_project':
      if (/\b(r&d|research|development cent(er|re)|innovation)\b/i.test(text)) return 'rnd_project';
      if (/\b(division|vertical|new business|subsidiary)\b/i.test(text)) return 'new_business_division';
      return FACILITY.test(text) ? 'manufacturing_facility' : 'other';
    case 'acquisition':
      return 'acquisition';
    case 'merger':
      return /\bdemerger\b/i.test(text) ? 'restructuring' : 'merger';
    case 'fund_raise':
      return 'fundraise';
    default:
      return null;
  }
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function lastDayOfMonth(year: number, month1: number): string {
  return new Date(Date.UTC(year, month1, 0)).toISOString().slice(0, 10);
}

/** Parses "by Q3 FY25", "by December 2026", "within 18 months", "by FY27". */
export function parseExpectedCompletion(text: string, announcedAt: string): string | null {
  const q = /\b(?:by|in|during|before)\s+(?:the\s+)?Q([1-4])\s*FY\s?'?(\d{2,4})\b/i.exec(text);
  if (q) {
    const fy = Number(q[2].length === 2 ? `20${q[2]}` : q[2]);
    return [`${fy - 1}-06-30`, `${fy - 1}-09-30`, `${fy - 1}-12-31`, `${fy}-03-31`][Number(q[1]) - 1];
  }
  const m = new RegExp(`\\b(?:by|in|before)\\s+(?:end\\s+of\\s+)?(${MONTHS.join('|')})\\s+(\\d{4})\\b`, 'i').exec(text);
  if (m) return lastDayOfMonth(Number(m[2]), MONTHS.indexOf(m[1].toLowerCase()) + 1);
  const within = /\b(?:within|over|in)\s+(?:the\s+next\s+)?(\d{1,2})\s+months\b/i.exec(text);
  if (within) {
    const d = new Date(`${announcedAt}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + Number(within[1]));
    return d.toISOString().slice(0, 10);
  }
  const fy = /\b(?:by|in|during)\s+(?:the\s+end\s+of\s+)?FY\s?'?(\d{2,4})\b/i.exec(text);
  if (fy) return `${fy[1].length === 2 ? `20${fy[1]}` : fy[1]}-03-31`;
  const year = /\b(?:by|before)\s+(?:the\s+end\s+of\s+)?(20\d{2})\b/i.exec(text);
  if (year) return `${year[1]}-12-31`;
  return null;
}

export function parseCapacity(text: string): { value: number; unit: string } | null {
  const m = /([\d,]+(?:\.\d+)?)\s*(MW|GW|MTPA|TPA|tonnes?|million units|units|stores|beds|lines)\b/i.exec(text);
  if (!m) return null;
  const value = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(value) ? { value, unit: m[2] } : null;
}

const aiEventSchema = z.object({
  isTrackableCommitment: z.boolean(),
  category: z.enum(EVENT_CATEGORIES),
  projectType: z.string().max(80).nullable(),
  title: z.string().max(200),
  expectedCapexCr: z.number().nullable(),
  expectedCapacityValue: z.number().nullable(),
  expectedCapacityUnit: z.string().max(40).nullable(),
  expectedCompletionText: z.string().max(120).nullable().describe('Exact phrase from the text stating the timeline, or null'),
  commitments: z.array(z.string().max(300)).max(5).describe('Verbatim or near-verbatim commitments stated in the text'),
  investmentSignificance: z.string().max(500).nullable().describe('One-sentence interpretation; omit if unsupported'),
});

const digitsIn = (text: string) => text.replace(/,/g, '');

export interface AnnouncementForExtraction {
  companyId: string;
  category: AnnouncementCategory;
  title: string;
  summary: string | null;
  announcedAt: string; // YYYY-MM-DD
  sourceDocumentId: string | null;
}

export async function extractEvent(a: AnnouncementForExtraction): Promise<{ input: CreateEventInput; method: 'rules' | 'ai' } | null> {
  const text = `${a.title}. ${a.summary ?? ''}`.trim();
  const category = mapEventCategory(a.category, text);
  if (!category) return null;

  const capacity = parseCapacity(text);
  const base: CreateEventInput = {
    companyId: a.companyId,
    category,
    projectType: inferProjectType(text),
    title: a.title.length > 200 ? `${a.title.slice(0, 197)}...` : a.title,
    originalAnnouncement: text,
    announcedAt: a.announcedAt,
    sourceDocumentId: a.sourceDocumentId,
    expectedCapexCr: extractCroreAmount(text),
    expectedCapacityValue: capacity?.value ?? null,
    expectedCapacityUnit: capacity?.unit ?? null,
    expectedCompletionDate: parseExpectedCompletion(text, a.announcedAt),
    commitments: [],
  };

  if (!features.ai) return { input: base, method: 'rules' };
  try {
    const ai = await generateStructured({
      schema: aiEventSchema,
      task: 'Extract one trackable corporate commitment from this announcement. Use only the text in E1.',
      evidence: [{ id: 'E1', kind: 'document_excerpt', text, sourceDocumentId: a.sourceDocumentId, sourceTitle: a.title }],
    });
    if (!ai.isTrackableCommitment) return { input: base, method: 'rules' };
    const source = digitsIn(text);
    const traceable = (n: number | null) => (n !== null && source.includes(String(n)) ? n : null);
    const completion = ai.expectedCompletionText && text.includes(ai.expectedCompletionText)
      ? parseExpectedCompletion(ai.expectedCompletionText.startsWith('by') ? ai.expectedCompletionText : `by ${ai.expectedCompletionText}`, a.announcedAt)
      : null;
    return {
      method: 'ai',
      input: {
        ...base,
        category: ai.category,
        projectType: ai.projectType ?? base.projectType,
        expectedCapexCr: base.expectedCapexCr ?? traceable(ai.expectedCapexCr),
        expectedCapacityValue: base.expectedCapacityValue ?? traceable(ai.expectedCapacityValue),
        expectedCapacityUnit: base.expectedCapacityUnit ?? ai.expectedCapacityUnit,
        expectedCompletionDate: base.expectedCompletionDate ?? completion,
        commitments: ai.commitments.filter((c) => c.length >= 3),
        investmentSignificance: ai.investmentSignificance ? `AI interpretation: ${ai.investmentSignificance}` : null,
      },
    };
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) console.warn('[extraction] AI extraction failed, using rules:', (err as Error).message);
    return { input: base, method: 'rules' };
  }
}
