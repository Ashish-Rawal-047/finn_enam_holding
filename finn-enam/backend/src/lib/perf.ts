/**
 * Lightweight performance instrumentation: one JSON log line per event, so slow start-ups, requests
 * and queries can be found in the host's logs. Lines never contain credentials, tokens, cookies,
 * request bodies, query strings or parameter values.
 */
import type { NextFunction, Request, Response } from 'express';
import type pg from 'pg';

export function logPerf(evt: string, fields: Record<string, string | number | boolean | null>) {
  console.log(JSON.stringify({ evt, ...fields }));
}

/** Runs a start-up task and logs how long it took (failures are logged, never thrown). */
export async function timedTask<T>(task: string, fn: () => Promise<T>): Promise<T | undefined> {
  const started = Date.now();
  try {
    const result = await fn();
    logPerf('startup.task', { task, ms: Date.now() - started, ok: true });
    return result;
  } catch (err) {
    logPerf('startup.task', { task, ms: Date.now() - started, ok: false, error: (err as Error).message.slice(0, 160) });
    return undefined;
  }
}

const QUIET = new Set(['/api/health', '/api/live']);
const SLOW_MS = 1_000;

/** Path without ids or query string: /api/alerts/:id/note rather than the real id. */
const routeOf = (path: string) => path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

/**
 * Times every API request: adds a `Server-Timing: app;dur=…` header (visible in browser dev tools)
 * and logs one line per request. Health checks are logged only when slow.
 */
export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  const ms = () => Number(process.hrtime.bigint() - started) / 1e6;
  const writeHead = res.writeHead;
  res.writeHead = function (this: Response, ...args: Parameters<Response['writeHead']>) {
    if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${ms().toFixed(1)}`);
    return writeHead.apply(this, args);
  } as Response['writeHead'];
  res.on('finish', () => {
    const dur = Math.round(ms());
    // originalUrl: inside routers req.path is relative to the mount point.
    const path = req.originalUrl.split('?')[0];
    if (!path.startsWith('/api/') || (QUIET.has(path) && dur < SLOW_MS)) return;
    logPerf('http', { method: req.method, route: routeOf(path), status: res.statusCode, ms: dur });
  });
  next();
}

/** Logs queries slower than `thresholdMs` with the start of their (parameterised) SQL text only. */
export function logSlowQueries(pool: pg.Pool, thresholdMs = 500) {
  const query = pool.query.bind(pool) as (...args: unknown[]) => unknown;
  (pool as unknown as { query: (...args: unknown[]) => unknown }).query = (...args: unknown[]) => {
    const started = Date.now();
    const result = query(...args);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      const text = typeof args[0] === 'string' ? args[0] : ((args[0] as { text?: string } | undefined)?.text ?? '');
      (result as Promise<unknown>).then(
        () => {
          const ms = Date.now() - started;
          if (ms >= thresholdMs) logPerf('db.slow', { ms, sql: text.replace(/\s+/g, ' ').slice(0, 80) });
        },
        () => undefined,
      );
    }
    return result;
  };
}
