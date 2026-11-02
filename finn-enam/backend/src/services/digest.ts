/**
 * Windowed filings digest: every announcement across the user's portfolio inside a window the
 * user picks — the last 24 hours by default, 48 hours, 7 days, or a custom date range read in the
 * user's time zone. Material filings come first (materiality, then recency); routine paperwork
 * (the same rule that keeps it from ever alerting) is returned separately so it can be collapsed.
 */
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, corporateAnnouncements, portfolioHoldings, signals, sourceDocuments, userProfiles } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { CATEGORY_LABELS, isRoutineFiling, priorityFromScore, type AnnouncementCategory, type Priority } from './classify.js';

export const DIGEST_WINDOWS = ['24h', '48h', '7d', 'custom'] as const;
export type DigestWindow = (typeof DIGEST_WINDOWS)[number];

const ROLLING_HOURS: Record<Exclude<DigestWindow, 'custom'>, number> = { '24h': 24, '48h': 48, '7d': 168 };
export const MAX_CUSTOM_DAYS = 366;
/** Items returned per group; counts always cover the whole window. */
const GROUP_LIMIT = 100;

/** Milliseconds `tz` is ahead of UTC at `at`. */
function tzOffsetMs(at: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant local midnight starts on `date` (YYYY-MM-DD) in `tz`. */
export function zonedMidnight(date: string, tz: string) {
  const guess = new Date(`${date}T00:00:00Z`);
  const first = new Date(guess.getTime() - tzOffsetMs(guess, tz));
  // Second pass corrects for an offset change (DST) between the guess and the answer.
  return new Date(guess.getTime() - tzOffsetMs(first, tz));
}

const localDate = (at: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export interface ResolvedWindow {
  id: DigestWindow;
  start: Date;
  end: Date;
  /** Inclusive local dates, for custom ranges. */
  fromDate: string | null;
  toDate: string | null;
  timezone: string;
}

/** Rolling windows end now; a custom range covers whole local days, `from` through `to`. */
export function resolveWindow(q: { window: DigestWindow; from?: string; to?: string }, now: Date, tz: string): ResolvedWindow {
  if (q.window !== 'custom') {
    return { id: q.window, start: new Date(now.getTime() - ROLLING_HOURS[q.window] * 3_600_000), end: now, fromDate: null, toDate: null, timezone: tz };
  }
  if (!q.from || !q.to) throw ApiError.badRequest('A custom window needs both "from" and "to" dates (YYYY-MM-DD)');
  if (q.from > q.to) throw ApiError.badRequest('"from" must be on or before "to"');
  if (q.from > localDate(now, tz)) throw ApiError.badRequest('"from" cannot be in the future');
  if (Date.parse(`${q.to}T00:00:00Z`) - Date.parse(`${q.from}T00:00:00Z`) >= MAX_CUSTOM_DAYS * 86_400_000) {
    throw ApiError.badRequest(`A custom window can span at most ${MAX_CUSTOM_DAYS} days`);
  }
  return { id: 'custom', start: zonedMidnight(q.from, tz), end: zonedMidnight(addDays(q.to, 1), tz), fromDate: q.from, toDate: q.to, timezone: tz };
}

export interface DigestItem {
  id: string;
  company: { id: string; name: string; nseSymbol: string | null };
  category: AnnouncementCategory;
  categoryLabel: string;
  title: string;
  summary: string | null;
  announcedAt: Date;
  exchange: string | null;
  materialityScore: number;
  priority: Priority;
  routine: boolean;
  signalId: string | null;
  sourceDocument: { id: string; title: string; url: string | null } | null;
  isDemo: boolean;
}

export async function getDigest(userId: string, q: { window: DigestWindow; from?: string; to?: string }, now = new Date()) {
  const [profile] = await db.select({ timezone: userProfiles.timezone }).from(userProfiles).where(eq(userProfiles.userId, userId));
  const window = resolveWindow(q, now, profile?.timezone ?? 'Asia/Kolkata');

  const held = db.select({ id: portfolioHoldings.companyId }).from(portfolioHoldings).where(eq(portfolioHoldings.userId, userId));
  const inPortfolio = inArray(corporateAnnouncements.companyId, held);

  const [rows, [latest]] = await Promise.all([
    db
      .select({
        a: corporateAnnouncements,
        company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol },
        doc: { id: sourceDocuments.id, title: sourceDocuments.title, url: sourceDocuments.url },
      })
      .from(corporateAnnouncements)
      .innerJoin(companies, eq(companies.id, corporateAnnouncements.companyId))
      .leftJoin(sourceDocuments, eq(sourceDocuments.id, corporateAnnouncements.sourceDocumentId))
      .where(and(inPortfolio, gte(corporateAnnouncements.announcedAt, window.start), lt(corporateAnnouncements.announcedAt, window.end)))
      .orderBy(desc(corporateAnnouncements.materialityScore), desc(corporateAnnouncements.announcedAt)),
    // Newest filing on the portfolio at all, so an empty window can say how far back to look.
    db.select({ at: corporateAnnouncements.announcedAt }).from(corporateAnnouncements).where(inPortfolio).orderBy(desc(corporateAnnouncements.announcedAt)).limit(1),
  ]);

  const ids = rows.map((r) => r.a.id);
  const linked = ids.length ? await db.select({ id: signals.id, announcementId: signals.announcementId }).from(signals).where(inArray(signals.announcementId, ids)) : [];
  const signalFor = new Map(linked.map((s) => [s.announcementId!, s.id]));

  const items: DigestItem[] = rows.map(({ a, company, doc }) => ({
    id: a.id,
    company,
    category: a.category,
    categoryLabel: CATEGORY_LABELS[a.category],
    title: a.title,
    summary: a.summary,
    announcedAt: a.announcedAt,
    exchange: a.exchange,
    materialityScore: a.materialityScore,
    priority: priorityFromScore(a.materialityScore),
    routine: isRoutineFiling(a.category, a.materialityScore),
    signalId: signalFor.get(a.id) ?? null,
    sourceDocument: doc?.id ? doc : null,
    isDemo: a.isDemo,
  }));
  const material = items.filter((i) => !i.routine);
  // Routine paperwork reads best newest first; materiality barely separates it.
  const routine = items.filter((i) => i.routine).sort((x, y) => y.announcedAt.getTime() - x.announcedAt.getTime());
  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of material) byPriority[i.priority]++;

  return {
    window,
    total: items.length,
    materialCount: material.length,
    routineCount: routine.length,
    byPriority,
    material: material.slice(0, GROUP_LIMIT),
    routine: routine.slice(0, GROUP_LIMIT),
    latestFilingAt: latest?.at ?? null,
    isDemo: items.some((i) => i.isDemo),
  };
}
