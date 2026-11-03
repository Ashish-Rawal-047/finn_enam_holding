/**
 * Database client. The Express server is long-running, so it keeps one node-postgres
 * pool on Neon's pooled (`-pooler`) DATABASE_URL and reuses it across requests.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Neon URLs say sslmode=require; verify-full keeps the same checks and avoids pg's warning.
export const withVerifyFull = (url: string) => url.replace('sslmode=require', 'sslmode=verify-full');

export const pool = new pg.Pool({
  connectionString: withVerifyFull(env.DATABASE_URL),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000, // allows for a scale-to-zero cold start
});

pool.on('error', (err) => {
  // Idle-client errors (e.g. compute suspended) must not crash the process.
  console.warn('[db] idle client error:', err.message);
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** `select 1`, bounded by `timeoutMs` so a waking database cannot hang the caller. */
export async function pingDatabase(timeoutMs = 4_000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pool.query('select 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer within ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}
