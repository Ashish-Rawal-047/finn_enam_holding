import { and, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { alertNotes, companies, notifications, signals } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { categoryLabel } from './alerts.js';
import { PRIORITY_RANK, type Priority } from './classify.js';
import { historicalMatchesFor } from './eventLinks.js';

/**
 * recent    – newest first (notification history)
 * attention – unread first (priority → materiality → recency), then read by when they were read.
 *             Read alerts are never hidden; they sink below unread ones.
 *
 * Favourites, archive and notes are per-user and independent of each other and of read state:
 *  - favourites (notifications.favourited_at) list bookmarked alerts, archived or not;
 *  - archived alerts (notifications.archived_at) leave the active feed (all / unread / read and
 *    their counts) and are listed under `archived`, newest archive first; nothing is deleted;
 *  - a personal note (alert_notes) is reported as `hasNote` / `noteUpdatedAt` on each item.
 */
export type NotificationSort = 'recent' | 'attention';
export type NotificationStatus = 'all' | 'unread' | 'read' | 'favourites' | 'archived';

export async function listNotifications(
  userId: string,
  opts: { status: NotificationStatus; priority?: Priority; limit: number; offset: number; sort?: NotificationSort },
) {
  const conditions: SQL[] = [eq(notifications.userId, userId)];
  if (opts.status === 'archived') conditions.push(isNotNull(notifications.archivedAt));
  else if (opts.status === 'favourites') conditions.push(isNotNull(notifications.favouritedAt));
  else conditions.push(isNull(notifications.archivedAt));
  if (opts.status === 'unread') conditions.push(isNull(notifications.readAt));
  if (opts.status === 'read') conditions.push(isNotNull(notifications.readAt));
  if (opts.priority) {
    const allowed = (Object.keys(PRIORITY_RANK) as Priority[]).filter((p) => PRIORITY_RANK[p] >= PRIORITY_RANK[opts.priority!]);
    conditions.push(inArray(notifications.priority, allowed));
  }
  const where = and(...conditions);
  const order =
    opts.status === 'archived'
      ? [desc(notifications.archivedAt), desc(notifications.createdAt)]
      : opts.sort === 'attention'
        ? [
            sql`(${notifications.readAt} is null) desc`,
            sql`case when ${notifications.readAt} is null then array_position(array['low','medium','high','critical']::priority[], ${notifications.priority}) end desc nulls last`,
            sql`case when ${notifications.readAt} is null then ${signals.materialityScore} end desc nulls last`,
            sql`case when ${notifications.readAt} is null then ${signals.occurredAt} end desc nulls last`,
            desc(notifications.readAt),
            desc(notifications.createdAt),
          ]
        : [desc(notifications.createdAt), desc(signals.materialityScore)];

  const [[{ total }], [counts], rows] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(notifications).where(where),
    db
      .select({
        unread: sql<number>`count(*) filter (where ${notifications.readAt} is null and ${notifications.archivedAt} is null)::int`,
        read: sql<number>`count(*) filter (where ${notifications.readAt} is not null and ${notifications.archivedAt} is null)::int`,
        favourites: sql<number>`count(*) filter (where ${notifications.favouritedAt} is not null)::int`,
        archived: sql<number>`count(*) filter (where ${notifications.archivedAt} is not null)::int`,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
    db
      .select({
        notification: notifications,
        signal: {
          id: signals.id,
          type: signals.type,
          category: signals.category,
          materialityScore: signals.materialityScore,
          metrics: signals.metrics,
          evidence: signals.evidence,
          eventId: signals.eventId,
          occurredAt: signals.occurredAt,
          detectedAt: signals.detectedAt,
          isDemo: signals.isDemo,
        },
        company: { id: companies.id, name: companies.name, nseSymbol: companies.nseSymbol },
        noteUpdatedAt: alertNotes.updatedAt,
      })
      .from(notifications)
      .innerJoin(signals, eq(signals.id, notifications.signalId))
      .innerJoin(companies, eq(companies.id, signals.companyId))
      .leftJoin(alertNotes, and(eq(alertNotes.notificationId, notifications.id), eq(alertNotes.userId, userId)))
      .where(where)
      .orderBy(...order)
      .limit(opts.limit)
      .offset(opts.offset),
  ]);
  const matches = await historicalMatchesFor(rows.map((r) => r.signal.eventId).filter((x): x is string => Boolean(x)));
  return {
    total,
    unread: counts.unread,
    read: counts.read,
    favourites: counts.favourites,
    archived: counts.archived,
    items: rows.map((r) => ({
      ...r.notification,
      favourited: r.notification.favouritedAt !== null,
      archived: r.notification.archivedAt !== null,
      hasNote: r.noteUpdatedAt !== null,
      noteUpdatedAt: r.noteUpdatedAt,
      signal: { ...r.signal, categoryLabel: categoryLabel(r.signal.category) },
      company: r.company,
      historicalMatch: r.signal.eventId ? matches.get(r.signal.eventId) ?? null : null,
    })),
  };
}

export async function markRead(userId: string, id: string, read = true) {
  const [row] = await db
    .update(notifications)
    // Keep the first read time when re-marking as read; clear it when marking unread.
    .set({ readAt: read ? sql`coalesce(${notifications.readAt}, now())` : null })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  if (!row) throw ApiError.notFound('Notification not found');
  return row;
}

/** Marks the active feed read. Archived alerts keep their own read state. */
export async function markAllRead(userId: string) {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), isNull(notifications.archivedAt)))
    .returning({ id: notifications.id });
  return rows.length;
}

/**
 * Adds or removes a bookmark. Idempotent (one column per user-owned row, so duplicates are
 * impossible) and touches nothing else: read state, priority and ordering are unchanged.
 */
export async function setFavourite(userId: string, id: string, favourite: boolean) {
  const [row] = await db
    .update(notifications)
    .set({ favouritedAt: favourite ? sql`coalesce(${notifications.favouritedAt}, now())` : null })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id, favouritedAt: notifications.favouritedAt, readAt: notifications.readAt });
  if (!row) throw ApiError.notFound('Alert not found');
  return { ...row, favourited: row.favouritedAt !== null };
}

/**
 * Archives or restores an alert. Idempotent (the first archive time is kept), never deletes, and
 * touches nothing else: read state, favourite, note, evidence and the original timestamp stay.
 */
export async function setArchived(userId: string, id: string, archived: boolean) {
  const [row] = await db
    .update(notifications)
    .set({ archivedAt: archived ? sql`coalesce(${notifications.archivedAt}, now())` : null })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id, archivedAt: notifications.archivedAt, readAt: notifications.readAt, favouritedAt: notifications.favouritedAt });
  if (!row) throw ApiError.notFound('Alert not found');
  return { ...row, archived: row.archivedAt !== null, favourited: row.favouritedAt !== null };
}

// --- personal notes -------------------------------------------------------------------------

/** Notes attach only to the caller's own alerts; anyone else's alert id is a 404. */
async function assertOwnAlert(userId: string, id: string) {
  const [row] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  if (!row) throw ApiError.notFound('Alert not found');
}

const noteColumns = { content: alertNotes.content, createdAt: alertNotes.createdAt, updatedAt: alertNotes.updatedAt };

export async function getNote(userId: string, id: string) {
  await assertOwnAlert(userId, id);
  const [note] = await db.select(noteColumns).from(alertNotes).where(and(eq(alertNotes.userId, userId), eq(alertNotes.notificationId, id)));
  return note ?? null;
}

/** Creates or replaces the caller's note on an alert (one per user per alert). */
export async function saveNote(userId: string, id: string, content: string) {
  await assertOwnAlert(userId, id);
  const [note] = await db
    .insert(alertNotes)
    .values({ userId, notificationId: id, content })
    .onConflictDoUpdate({ target: [alertNotes.userId, alertNotes.notificationId], set: { content, updatedAt: new Date() } })
    .returning(noteColumns);
  return note;
}

export async function deleteNote(userId: string, id: string) {
  await assertOwnAlert(userId, id);
  const rows = await db
    .delete(alertNotes)
    .where(and(eq(alertNotes.userId, userId), eq(alertNotes.notificationId, id)))
    .returning({ id: alertNotes.id });
  return { deleted: rows.length > 0 };
}
