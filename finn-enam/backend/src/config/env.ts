/**
 * Environment loading and validation.
 *
 * Neon's `neon deploy` / `neon env pull` write DATABASE_URL, DATABASE_URL_UNPOOLED,
 * NEON_REALTIME_* into the repo-root `.env.local` (or `.env`).
 * Backend-only secrets live in `backend/.env`. Values are validated once at startup;
 * nothing here is ever logged.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..', '..');
const repoRoot = path.resolve(backendRoot, '..');

// First file wins for a given key; real process env always wins over files.
for (const file of [
  path.join(backendRoot, '.env'),
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, '.env'),
]) {
  dotenv.config({ path: file, quiet: true });
}

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));
/** Treats an empty `KEY=` line in .env as unset. */
const blankAsUnset = <T extends z.ZodTypeAny>(t: T) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), t);

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),

    DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a postgres connection string' }),
    DATABASE_URL_UNPOOLED: optionalString,

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    // AI provider (optional: AI features report "not configured" when absent).
    //   anthropic | google – direct provider with AI_API_KEY (FINN runs on Google Gemini)
    //   openai-compatible  – any OpenAI-compatible endpoint at AI_BASE_URL with AI_API_KEY
    AI_PROVIDER: blankAsUnset(z.enum(['anthropic', 'google', 'openai-compatible']).optional()),
    AI_API_KEY: optionalString,
    AI_BASE_URL: optionalString,
    AI_MODEL: optionalString, // fast model: extraction, classification
    AI_REASONING_MODEL: optionalString, // research synthesis (defaults to AI_MODEL)
    AI_EMBEDDING_MODEL: optionalString, // optional: semantic Event Memory matching
    AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
    // Reasoning effort for models that support it (Gemini 3 thinkingLevel). Lower is faster.
    AI_THINKING_LEVEL: blankAsUnset(z.enum(['minimal', 'low', 'medium', 'high']).optional()),
    AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(600_000).default(60_000), // per attempt
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2), // transient errors only
    // Optional USD prices per million tokens, for cost tracking. Unset = cost not reported.
    AI_PRICE_INPUT_PER_MTOK: blankAsUnset(z.coerce.number().nonnegative().optional()),
    AI_PRICE_OUTPUT_PER_MTOK: blankAsUnset(z.coerce.number().nonnegative().optional()),

    // Neon Realtime (optional: notifications fall back to polling)
    NEON_REALTIME_URL: optionalString,
    NEON_REALTIME_SECRET: optionalString,

    // Data providers. "yfinance" = Yahoo Finance via the Python bridge (no key);
    // "demo" = labelled demonstration fixtures.
    YFINANCE_PYTHON: optionalString,
    MARKET_DATA_PROVIDER: z.string().default('yfinance'),
    MARKET_DATA_API_KEY: optionalString,
    ANNOUNCEMENTS_PROVIDER: z.string().default('demo'),
    ANNOUNCEMENTS_API_KEY: optionalString,
    FINANCIALS_PROVIDER: z.string().default('yfinance'),
    FINANCIALS_API_KEY: optionalString,
    COMPANY_INFO_PROVIDER: z.string().default('yfinance'),
    COMPANY_INFO_API_KEY: optionalString,
    TRANSCRIPTS_PROVIDER: z.string().default('none'),
    TRANSCRIPTS_API_KEY: optionalString,
    // Optional logo.dev token. Without it, logos come from Google's favicon service and the
    // company's official website. Either way they are proxied, so the token never reaches browsers.
    LOGO_DEV_TOKEN: optionalString,

    // Reviewer demo account (created by `npm run db:seed` / `npm run demo:seed`). When demo mode is
    // off, the demo account cannot sign in, so the public credentials stop working.
    DEMO_MODE_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true' || v === '1'),
    DEMO_USER_EMAIL: optionalString,
    DEMO_USER_PASSWORD: optionalString,
    DEMO_USER_NAME: z.string().default('Reviewer'),

    ENABLE_SCHEDULER: z
      .string()
      .default('true')
      .transform((v) => v === 'true' || v === '1'),
    SERVE_FRONTEND: z
      .string()
      .default('true')
      .transform((v) => v === 'true' || v === '1'),
  })
  .refine((e) => e.JWT_SECRET !== e.JWT_REFRESH_SECRET, {
    message: 'JWT_SECRET and JWT_REFRESH_SECRET must differ',
    path: ['JWT_REFRESH_SECRET'],
  });

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Report which variables are wrong, never their values.
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    console.error(`[FINN] Invalid environment configuration:\n${problems.join('\n')}`);
    console.error('[FINN] See backend/.env.example. Neon variables come from `neon deploy` / `neon env pull`.');
    process.exit(1);
  }
  return parsed.data;
}

export const env = load();

/** Resolved AI provider, or null when AI is not usable with the current configuration. */
function resolveAiProvider(): { provider: NonNullable<Env['AI_PROVIDER']>; reason?: undefined } | { provider: null; reason: string } {
  const provider = env.AI_PROVIDER;
  if (!provider) return { provider: null, reason: env.AI_API_KEY ? 'AI_API_KEY is set but AI_PROVIDER is not.' : 'No AI provider configured.' };

  if (!env.AI_API_KEY) return { provider: null, reason: `AI_PROVIDER=${provider} needs AI_API_KEY.` };
  if (!env.AI_MODEL) return { provider: null, reason: `AI_PROVIDER=${provider} needs AI_MODEL (FINN does not guess model names).` };
  if (provider === 'openai-compatible' && !env.AI_BASE_URL) return { provider: null, reason: 'AI_PROVIDER=openai-compatible needs AI_BASE_URL.' };
  return { provider };
}

export const ai = resolveAiProvider();

export const features = {
  ai: ai.provider !== null,
  realtime: Boolean(env.NEON_REALTIME_URL && env.NEON_REALTIME_SECRET),
};

export const paths = { backendRoot, repoRoot };
