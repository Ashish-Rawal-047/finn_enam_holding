/**
 * Similar-event scoring. Pure functions so the weighting is unit-testable.
 *
 * Structured score (0..1):
 *   same company          0.30
 *   same event category   0.25
 *   same project type     0.15
 *   wording overlap       0.15  (Jaccard over content tokens of title + announcement)
 *   capex scale           0.10  (min/max ratio when both disclose capex)
 *   same capacity unit    0.05
 * Combined = 0.65·structured + 0.35·semantic when both events have embeddings,
 * otherwise the structured score alone. A candidate must share the company or the
 * category to qualify, so embeddings can never match unrelated events on their own.
 */

export interface ComparableEvent {
  id: string;
  companyId: string;
  category: string;
  projectType: string | null;
  title: string;
  originalAnnouncement: string;
  expectedCapexCr: number | null;
  expectedCapacityUnit: string | null;
}

export const MATCH_THRESHOLD = 0.45;

const STOPWORDS = new Set(
  'the a an of for and to in on by with at from as is are was be this that its it new our we will crore cr rs inr fy q1 q2 q3 q4 approval board company limited ltd'.split(' '),
);

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function scoreStructured(a: ComparableEvent, b: ComparableEvent) {
  const matchedOn: string[] = [];
  let score = 0;
  if (a.companyId === b.companyId) {
    score += 0.3;
    matchedOn.push('same company');
  }
  if (a.category === b.category) {
    score += 0.25;
    matchedOn.push('same event category');
  }
  if (a.projectType && b.projectType && a.projectType.toLowerCase() === b.projectType.toLowerCase()) {
    score += 0.15;
    matchedOn.push(`same project type (${a.projectType})`);
  }
  const overlap = jaccard(tokens(`${a.title} ${a.originalAnnouncement}`), tokens(`${b.title} ${b.originalAnnouncement}`));
  if (overlap > 0) {
    // Scale so ~40% token overlap earns the full weight.
    score += 0.15 * Math.min(1, overlap / 0.4);
    if (overlap >= 0.1) matchedOn.push('similar wording');
  }
  if (a.expectedCapexCr && b.expectedCapexCr) {
    const ratio = Math.min(a.expectedCapexCr, b.expectedCapexCr) / Math.max(a.expectedCapexCr, b.expectedCapexCr);
    score += 0.1 * ratio;
    if (ratio >= 0.5) matchedOn.push('comparable capex scale');
  }
  if (a.expectedCapacityUnit && b.expectedCapacityUnit && a.expectedCapacityUnit.toLowerCase() === b.expectedCapacityUnit.toLowerCase()) {
    score += 0.05;
    matchedOn.push('same capacity unit');
  }
  return { score: Math.round(score * 1000) / 1000, matchedOn };
}

export function combineScores(structured: number, semantic: number | null): number {
  const combined = semantic === null ? structured : 0.65 * structured + 0.35 * semantic;
  return Math.round(combined * 1000) / 1000;
}

export function qualifies(a: ComparableEvent, b: ComparableEvent, combined: number): boolean {
  return (a.companyId === b.companyId || a.category === b.category) && combined >= MATCH_THRESHOLD;
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const ms = new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.round((ms / (86_400_000 * 30.44)) * 10) / 10;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / 86_400_000);
}
