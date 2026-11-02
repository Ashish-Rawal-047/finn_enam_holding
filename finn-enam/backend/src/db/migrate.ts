/**
 * Applies SQL migrations from ./drizzle over the DIRECT connection
 * (DATABASE_URL_UNPOOLED). Session state and DDL do not belong on PgBouncer.
 */
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env, paths } from '../config/env.js';
import { withVerifyFull } from './client.js';

async function main() {
  const url = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (!env.DATABASE_URL_UNPOOLED) {
    console.warn('[migrate] DATABASE_URL_UNPOOLED not set; falling back to DATABASE_URL.');
  }
  const client = new pg.Client({ connectionString: withVerifyFull(url), connectionTimeoutMillis: 20_000 });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(paths.backendRoot, 'drizzle') });
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
    );
    console.log(`[migrate] migrations applied; public tables: ${rows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
