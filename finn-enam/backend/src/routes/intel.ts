/**
 * Research, Event Memory, notifications, settings and the Home overview.
 */
import { Router } from 'express';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { quoteOfTheDay } from '../content/quotes.js';
import { db } from '../db/client.js';
import { alertPreferences, companies, notifications, signals, userProfiles, users } from '../db/schema.js';
import { ApiError, handle, paginated, paginationQuery, parse, uuidParam } from '../lib/http.js';
import { userId } from '../middleware/auth.js';
import { sealNotifications } from '../realtime/notifications.js';
import { categoryLabel, fanOutNotifications, getPreferences } from '../services/alerts.js';
import { audit } from '../services/audit.js';
import { ANNOUNCEMENT_CATEGORIES, PRIORITY_RANK, type Priority } from '../services/classify.js';
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  addMilestone,
  createEvent,
  createEventInput,
  getEventDetail,
  getMilestones,
  listEvents,
  milestoneInput,
  similarForCompany,
  updateEvent,
  updateEventInput,
} from '../services/events.js';
import { forbidDemo, isDemoAccount } from '../services/demo.js';
import { DIGEST_WINDOWS, getDigest } from '../services/digest.js';
import { deleteNote, getNote, listNotifications, markAllRead, markRead, saveNote, setArchived, setFavourite } from '../services/notifications.js';
import { getPortfolio } from '../services/portfolio.js';
import { askResearch, getEvidence, getFinancialAnalysis, getLatestReport } from '../services/research.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { activeResearchJob, getResearchJob, startResearchJob } from '../services/researchJobs.js';

export const intelRouter = Router();

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------
const reportQuery = z.object({ reportId: z.string().uuid().optional() });

// Job status first: '/research/jobs/:id' must not be read as a company id.
intelRouter.get(
  '/research/jobs/:jobId',
  handle(async (req, res) => {
    res.json({ job: await getResearchJob(parse(uuidParam, req.params.jobId), userId(req)) });
  }),
);

intelRouter.get(
  '/research/:companyId',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    const { reportId } = parse(reportQuery, req.query);
    const [latest, activeJob] = await Promise.all([getLatestReport(companyId, reportId), activeResearchJob(companyId, userId(req))]);
    res.json({ ...latest, activeJob });
  }),
);

const researchBody = z.object({ refreshData: z.boolean().default(false) });

/** Starts research in the background (202 + job). Reuses an identical existing report when possible. */
intelRouter.post(
  '/research/:companyId/generate',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    const { refreshData } = parse(researchBody, req.body ?? {});
    const { job, deduplicated } = await startResearchJob(companyId, userId(req), refreshData ? 'refresh_all' : 'generate');
    if (!deduplicated) await audit({ userId: userId(req), action: 'research.generate', entityType: 'research_job', entityId: job.id, metadata: { refreshData }, req });
    res.status(202).json({ job, deduplicated });
  }),
);

/** Regenerates the AI analysis even if unchanged; `refreshData` also refetches provider data. */
intelRouter.post(
  '/research/:companyId/refresh',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    const { refreshData } = parse(researchBody, req.body ?? {});
    const { job, deduplicated } = await startResearchJob(companyId, userId(req), refreshData ? 'refresh_all' : 'refresh_ai');
    if (!deduplicated) await audit({ userId: userId(req), action: 'research.refresh', entityType: 'research_job', entityId: job.id, metadata: { refreshData }, req });
    res.status(202).json({ job, deduplicated });
  }),
);

/** Charts, assessments and period comparisons computed from stored statements (no AI). */
intelRouter.get(
  '/research/:companyId/financials',
  handle(async (req, res) => {
    res.json(await getFinancialAnalysis(parse(uuidParam, req.params.companyId)));
  }),
);

// Each new question is an AI call on a shared daily quota; repeats are served from cache.
const askLimiter = rateLimit({ windowMs: 10 * 60_000, max: 12, key: 'research-ask' });
const askBody = z.object({ question: z.string().trim().min(3, 'Ask a question of at least 3 characters').max(300, 'Keep the question under 300 characters') });

/** Ask FINN: answers a question about the company from its stored evidence, with citations. */
intelRouter.post(
  '/research/:companyId/ask',
  askLimiter,
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    const { question } = parse(askBody, req.body ?? {});
    res.json(await askResearch(companyId, userId(req), question));
  }),
);

intelRouter.get(
  '/research/:companyId/evidence',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    const { reportId } = parse(reportQuery, req.query);
    res.json(await getEvidence(companyId, reportId));
  }),
);

// ---------------------------------------------------------------------------
// Event Memory
// ---------------------------------------------------------------------------
const eventsQuery = paginationQuery.extend({
  scope: z.enum(['portfolio', 'all']).default('all'),
  status: z.enum(EVENT_STATUSES).optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  companyId: z.string().uuid().optional(),
  q: z.string().trim().max(80).optional(),
});

intelRouter.get(
  '/events',
  handle(async (req, res) => {
    const q = parse(eventsQuery, req.query);
    const { total, items } = await listEvents({ userId: userId(req), ...q, limit: q.pageSize, offset: (q.page - 1) * q.pageSize });
    res.json(paginated(items, total, q));
  }),
);

intelRouter.post(
  '/events',
  forbidDemo('change Event Memory, which is shared with every user'),
  handle(async (req, res) => {
    const input = parse(createEventInput, req.body);
    const result = await createEvent(input, { userId: userId(req), extractionMethod: 'manual' });
    if (!result.created) throw ApiError.conflict('This event is already recorded', { eventId: result.event.id });
    await audit({ userId: userId(req), action: 'event.create', entityType: 'corporate_event', entityId: result.event.id, req });
    res.status(201).json({ event: await getEventDetail(result.event.id), matches: result.matches, precedentSignalId: result.precedentSignalId });
  }),
);

// Must precede /events/:id so "similar" is not parsed as an id.
intelRouter.get(
  '/events/similar/:companyId',
  handle(async (req, res) => {
    const companyId = parse(uuidParam, req.params.companyId);
    res.json({ items: await similarForCompany(companyId) });
  }),
);

intelRouter.get(
  '/events/:id',
  handle(async (req, res) => {
    res.json(await getEventDetail(parse(uuidParam, req.params.id)));
  }),
);

intelRouter.patch(
  '/events/:id',
  forbidDemo('change Event Memory, which is shared with every user'),
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const patch = parse(updateEventInput, req.body);
    await updateEvent(id, patch, userId(req));
    await audit({ userId: userId(req), action: 'event.update', entityType: 'corporate_event', entityId: id, metadata: { fields: Object.keys(patch) }, req });
    res.json(await getEventDetail(id));
  }),
);

intelRouter.get(
  '/events/:id/milestones',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    res.json({ items: await getMilestones(id) });
  }),
);

intelRouter.post(
  '/events/:id/milestones',
  forbidDemo('change Event Memory, which is shared with every user'),
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const input = parse(milestoneInput, req.body);
    const milestone = await addMilestone(id, input, userId(req));
    await audit({ userId: userId(req), action: 'event.milestone', entityType: 'corporate_event', entityId: id, req });
    res.status(201).json(milestone);
  }),
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const priority = z.enum(['low', 'medium', 'high', 'critical']);

intelRouter.get(
  '/notifications',
  handle(async (req, res) => {
    const q = parse(
      paginationQuery.extend({
        status: z.enum(['all', 'unread', 'read', 'favourites', 'archived']).default('all'),
        priority: priority.optional(),
        sort: z.enum(['recent', 'attention']).default('recent'),
      }),
      req.query,
    );
    const { total, unread, read, favourites, archived, items } = await listNotifications(userId(req), { ...q, limit: q.pageSize, offset: (q.page - 1) * q.pageSize });
    res.json({ ...paginated(items, total, q), unread, read, favourites, archived });
  }),
);

// Favourite alerts ("alertId" is the user's notification id; other users' ids are 404).
intelRouter.get(
  '/alerts/favourites',
  handle(async (req, res) => {
    const q = parse(paginationQuery.extend({ sort: z.enum(['recent', 'attention']).default('attention') }), req.query);
    const { total, unread, read, favourites, archived, items } = await listNotifications(userId(req), { ...q, status: 'favourites', limit: q.pageSize, offset: (q.page - 1) * q.pageSize });
    res.json({ ...paginated(items, total, q), unread, read, favourites, archived });
  }),
);

// Archived alerts: out of the active feed, never deleted ("alertId" is the user's notification id).
intelRouter.get(
  '/alerts/archived',
  handle(async (req, res) => {
    const q = parse(paginationQuery, req.query);
    const { total, unread, read, favourites, archived, items } = await listNotifications(userId(req), { ...q, status: 'archived', limit: q.pageSize, offset: (q.page - 1) * q.pageSize });
    res.json({ ...paginated(items, total, q), unread, read, favourites, archived });
  }),
);

intelRouter.post(
  '/alerts/:alertId/archive',
  handle(async (req, res) => {
    res.json(await setArchived(userId(req), parse(uuidParam, req.params.alertId), true));
  }),
);

intelRouter.post(
  '/alerts/:alertId/restore',
  handle(async (req, res) => {
    res.json(await setArchived(userId(req), parse(uuidParam, req.params.alertId), false));
  }),
);

// Personal notes: one per user per alert, visible only to the account that wrote it.
const noteBody = z.object({ content: z.string().trim().min(1, 'Write a note first').max(4000, 'Notes are limited to 4,000 characters') });

intelRouter.get(
  '/alerts/:alertId/note',
  handle(async (req, res) => {
    res.json({ note: await getNote(userId(req), parse(uuidParam, req.params.alertId)) });
  }),
);

intelRouter.put(
  '/alerts/:alertId/note',
  handle(async (req, res) => {
    const { content } = parse(noteBody, req.body);
    res.json({ note: await saveNote(userId(req), parse(uuidParam, req.params.alertId), content) });
  }),
);

intelRouter.delete(
  '/alerts/:alertId/note',
  handle(async (req, res) => {
    res.json(await deleteNote(userId(req), parse(uuidParam, req.params.alertId)));
  }),
);

intelRouter.post(
  '/alerts/:alertId/favourite',
  handle(async (req, res) => {
    res.json(await setFavourite(userId(req), parse(uuidParam, req.params.alertId), true));
  }),
);

intelRouter.delete(
  '/alerts/:alertId/favourite',
  handle(async (req, res) => {
    res.json(await setFavourite(userId(req), parse(uuidParam, req.params.alertId), false));
  }),
);

intelRouter.patch(
  '/notifications/:id/read',
  handle(async (req, res) => {
    const id = parse(uuidParam, req.params.id);
    const { read } = parse(z.object({ read: z.boolean().default(true) }), req.body ?? {});
    const row = await markRead(userId(req), id, read);
    res.json({ ...row, txid: null });
  }),
);

intelRouter.post(
  '/notifications/read-all',
  handle(async (req, res) => {
    res.json({ updated: await markAllRead(userId(req)) });
  }),
);

intelRouter.post(
  '/notifications/live',
  handle(async (req, res) => {
    const live = await sealNotifications(userId(req));
    if (!live) throw ApiError.unavailable('Realtime is not configured; poll GET /api/notifications instead.');
    res.json(live);
  }),
);

// ---------------------------------------------------------------------------
// Filings digest
// ---------------------------------------------------------------------------
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().startsWith(d);
  }, 'Not a calendar date');

/** Every filing on the user's portfolio in a window: 24h (default), 48h, 7d or custom from/to dates. */
intelRouter.get(
  '/digest',
  handle(async (req, res) => {
    const q = parse(z.object({ window: z.enum(DIGEST_WINDOWS).default('24h'), from: isoDate.optional(), to: isoDate.optional() }), req.query);
    res.json(await getDigest(userId(req), q));
  }),
);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const validTimezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Unknown IANA time zone');

const profilePatch = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    timezone: validTimezone.optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    theme: z.enum(['light', 'dark']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');

const alertsPatch = z
  .object({
    priceMoveThresholdPct: z.number().min(1).max(20).optional(),
    volumeSurgeMultiple: z.number().min(1.5).max(10).optional(),
    announcementCategories: z.array(z.enum(ANNOUNCEMENT_CATEGORIES)).max(ANNOUNCEMENT_CATEGORIES.length).optional(),
    managementChangeAlerts: z.boolean().optional(),
    financialResultAlerts: z.boolean().optional(),
    eventAlerts: z.boolean().optional(),
    minimumPriority: priority.optional(),
    inAppNotifications: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');

async function settingsFor(id: string) {
  const [profile] = await db
    .select({ email: users.email, fullName: userProfiles.fullName, timezone: userProfiles.timezone, bio: userProfiles.bio, theme: userProfiles.theme })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, id));
  return { profile, alerts: await getPreferences(id) };
}

intelRouter.get(
  '/settings',
  handle(async (req, res) => {
    res.json(await settingsFor(userId(req)));
  }),
);

intelRouter.patch(
  '/settings',
  handle(async (req, res) => {
    const patch = parse(profilePatch, req.body);
    // The shared demo account keeps its identity; only the display theme can change.
    if (Object.keys(patch).some((k) => k !== 'theme') && (await isDemoAccount(userId(req)))) {
      throw ApiError.forbidden('The shared reviewer demo account can only change its theme. Create your own account to edit a profile.');
    }
    await db.update(userProfiles).set({ ...patch, updatedAt: new Date() }).where(eq(userProfiles.userId, userId(req)));
    await audit({ userId: userId(req), action: 'settings.profile', metadata: { fields: Object.keys(patch) }, req });
    res.json(await settingsFor(userId(req)));
  }),
);

intelRouter.get(
  '/settings/alerts',
  handle(async (req, res) => {
    res.json({ ...(await getPreferences(userId(req))), categories: ANNOUNCEMENT_CATEGORIES.map((c) => ({ id: c, label: categoryLabel(c) })) });
  }),
);

intelRouter.patch(
  '/settings/alerts',
  handle(async (req, res) => {
    const patch = parse(alertsPatch, req.body);
    await getPreferences(userId(req)); // ensure row exists
    const [prefs] = await db
      .update(alertPreferences)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(alertPreferences.userId, userId(req)))
      .returning();
    // Re-run the alert engine for this user so newly qualifying signals notify immediately.
    const fanned = await fanOutNotifications({ userId: userId(req), sinceDays: 7 });
    await audit({ userId: userId(req), action: 'settings.alerts', metadata: patch, req });
    res.json({ ...prefs, newNotifications: fanned.created });
  }),
);

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
intelRouter.get(
  '/home',
  handle(async (req, res) => {
    const id = userId(req);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, id));
    const portfolio = await getPortfolio(id);
    const quoted = portfolio.filter((p) => p.quote);
    const advancing = quoted.filter((p) => p.quote!.changePercent > 0).length;
    const declining = quoted.filter((p) => p.quote!.changePercent < 0).length;
    const avg = quoted.length ? Math.round((quoted.reduce((s, p) => s + p.quote!.changePercent, 0) / quoted.length) * 100) / 100 : null;
    const lastUpdated = quoted.reduce<Date | null>((max, p) => (!max || p.quote!.asOf > max ? p.quote!.asOf : max), null);

    const unreadRows = await db
      .select({
        notification: notifications,
        signal: { id: signals.id, type: signals.type, category: signals.category, materialityScore: signals.materialityScore, metrics: signals.metrics, evidence: signals.evidence, occurredAt: signals.occurredAt, detectedAt: signals.detectedAt, isDemo: signals.isDemo },
        company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol },
      })
      .from(notifications)
      .innerJoin(signals, eq(signals.id, notifications.signalId))
      .innerJoin(companies, eq(companies.id, signals.companyId))
      .where(and(eq(notifications.userId, id), isNull(notifications.readAt), isNull(notifications.archivedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(200);
    // Rank by materiality: priority first, then the signal's materiality score, then recency.
    const priorityAlerts = unreadRows
      .sort(
        (a, b) =>
          PRIORITY_RANK[b.notification.priority as Priority] - PRIORITY_RANK[a.notification.priority as Priority] ||
          b.signal.materialityScore - a.signal.materialityScore ||
          b.signal.occurredAt.getTime() - a.signal.occurredAt.getTime(),
      )
      .slice(0, 5)
      .map((r) => ({ ...r.notification, signal: { ...r.signal, categoryLabel: categoryLabel(r.signal.category) }, company: r.company }));

    const [{ eventCount }] = await db
      .select({ eventCount: sql<number>`count(*)::int` })
      .from(sql`corporate_events e`)
      .where(sql`exists (select 1 from portfolio_holdings ph where ph.company_id = e.company_id and ph.user_id = ${id}) and e.status not in ('completed','abandoned')`);

    res.json({
      greetingName: profile?.fullName.split(/\s+/)[0] ?? null,
      timezone: profile?.timezone ?? 'Asia/Kolkata',
      quote: quoteOfTheDay(new Date(), profile?.timezone ?? 'Asia/Kolkata'),
      overview: {
        trackedCompanies: portfolio.length,
        withMarketData: quoted.length,
        advancing,
        declining,
        unchanged: quoted.length - advancing - declining,
        averageChangePercent: avg,
        averageMethod: 'equal-weighted mean of daily % change',
        activeAlerts: unreadRows.length,
        openEvents: eventCount,
        lastUpdated,
        isDemo: quoted.some((p) => p.quote!.isDemo),
        demoCompanies: quoted.filter((p) => p.quote!.isDemo).length,
        provider: quoted[0]?.quote?.provider ?? null,
      },
      priorityAlerts,
    });
  }),
);
