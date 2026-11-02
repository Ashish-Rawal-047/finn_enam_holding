/**
 * Neon Realtime: a live, per-user notifications query. The backend seals the query with
 * NEON_REALTIME_SECRET (never sent to the browser); the client subscribes with the sealed
 * capability and receives inserts/read-state changes as they commit.
 */
import { createRealtime, pgParam, rawSql } from '@neon/realtime/server';
import { env, features } from '../config/env.js';

export interface LiveNotificationRow {
  id: string;
  signal_id: string;
  title: string;
  body: string;
  priority: string;
  read_at: string | null;
  created_at: string;
}

const databaseName = () => new URL(env.DATABASE_URL).pathname.replace(/^\//, '') || 'neondb';

const realtime = features.realtime ? createRealtime({ secret: env.NEON_REALTIME_SECRET!, db: databaseName() }) : null;

export function liveNotificationsQuery(userId: string) {
  // Deterministic, read-only, parameterised: the user id is bound, never interpolated.
  return rawSql<LiveNotificationRow>(
    `SELECT id, signal_id, title, body, priority::text AS priority, read_at, created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [pgParam.text('uuid', userId)],
  );
}

export async function sealNotifications(userId: string) {
  if (!realtime) return null;
  const sealed = await realtime.seal({ query: liveNotificationsQuery(userId) });
  return { url: env.NEON_REALTIME_URL!, sealed };
}
