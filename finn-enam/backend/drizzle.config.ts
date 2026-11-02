import { defineConfig } from 'drizzle-kit';

// Generation is offline; only `drizzle-kit studio`/`push` would connect. Migrations are
// applied by src/db/migrate.ts over the direct (unpooled) connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
});
