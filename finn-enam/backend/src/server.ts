/**
 * FINN API server.
 */
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, features, paths } from './config/env.js';
import { pingDatabase, pool } from './db/client.js';
import { aiStatus, probeAi } from './ai/gateway.js';
import { startScheduler } from './jobs/index.js';
import { ApiError, errorMiddleware, handle } from './lib/http.js';
import { requireAuth } from './middleware/auth.js';
import { providerStatus } from './providers/registry.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { intelRouter } from './routes/intel.js';
import { logosRouter } from './routes/logos.js';
import { marketRouter } from './routes/market.js';
import { portfolioRouter } from './routes/portfolio.js';
import { ensureDemoAccount } from './services/demo.js';
import { failInterruptedJobs } from './services/researchJobs.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...(env.NEON_REALTIME_URL ? [new URL(env.NEON_REALTIME_URL).origin.replace(/^http/, 'ws'), new URL(env.NEON_REALTIME_URL).origin] : [])],
      },
    },
  }),
);
app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.get(
  '/api/health',
  handle(async (_req, res) => {
    const database = await pingDatabase();
    res.status(database.ok ? 200 : 503).json({
      status: database.ok ? 'ok' : 'degraded',
      version: '2.0.0',
      database: { connected: database.ok, latencyMs: database.latencyMs },
      ai: aiStatus(),
      realtime: { configured: features.realtime },
      providers: providerStatus(),
      timestamp: new Date().toISOString(),
    });
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/logos', logosRouter);
app.use('/api', requireAuth, portfolioRouter, marketRouter, intelRouter, aiRouter);
app.use('/api', (_req, _res, next) => next(ApiError.notFound('Endpoint not found')));

// Production: serve the built frontend from the same origin (cookies stay SameSite=Strict).
const dist = path.join(paths.repoRoot, 'dist');
if (env.SERVE_FRONTEND && fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorMiddleware);

const server = app.listen(env.PORT, async () => {
  const db = await pingDatabase();
  console.log(env.NODE_ENV === 'production' ? `[finn] API listening on port ${env.PORT}` : `[finn] API listening on http://localhost:${env.PORT}`);
  console.log(`[finn] database: ${db.ok ? `connected (${db.latencyMs}ms)` : `UNREACHABLE (${db.error})`}`);
  console.log(`[finn] AI: ${aiStatus().label ?? `not configured (${aiStatus().reason})`} · realtime: ${features.realtime ? 'configured' : 'not configured'} · providers: ${Object.entries(providerStatus()).map(([k, p]) => `${k}=${p.name}`).join(', ')}`);
  const interrupted = await failInterruptedJobs().catch(() => 0);
  if (interrupted) console.log(`[finn] marked ${interrupted} interrupted research job(s) as failed`);
  // Deployments get the reviewer account without a manual step (idempotent; credentials never logged).
  if (env.DEMO_MODE_ENABLED && env.NODE_ENV !== 'test') {
    await ensureDemoAccount()
      .then((r) => console.log(`[finn] reviewer demo account: ${r}`))
      .catch((err: Error) => console.error(`[finn] reviewer demo account not set up: ${err.message}`));
  }
  if (env.ENABLE_SCHEDULER && env.NODE_ENV !== 'test') startScheduler();
  // Verify the key and models with the provider (Gemini: metadata lookup, no generation quota).
  if (aiStatus().configured) {
    const p = await probeAi(true);
    const m = p.models;
    console.log(`[finn] AI provider check: ${p.available ? 'available' : 'UNAVAILABLE'}${m ? ` · ${m.fast.id}: ${m.fast.available ? 'ok' : m.fast.error?.code} · ${m.reasoning.id}: ${m.reasoning.available ? 'ok' : m.reasoning.error?.code}` : ` — ${p.error?.message}`}`);
  }
});

function shutdown() {
  server.close(() => void pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app };
