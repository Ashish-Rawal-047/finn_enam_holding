/**
 * Centralised API client.
 *
 *  - Access token lives in memory only; the refresh token is an httpOnly cookie the
 *    browser sends to /api/auth/* (never readable from JS).
 *  - A 401 triggers one shared refresh attempt, then the request is replayed once.
 *  - Idempotent requests (GET) retry on network errors and 5xx with backoff.
 *  - No fixtures: when the backend is unreachable the UI shows an error state.
 */

import type { User } from './types';

// A blank VITE_API_BASE_URL (as in .env.example) means "same origin", like an unset one.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') || '/api';

/** Absolute URL of an API path, for places that cannot use `request` (e.g. <img src>). */
export const apiUrl = (path: string) => `${API_BASE}${path}`;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
/** Set once any API response arrives, so later callers need not wait for a health check. */
let serverUp = false;

// Bounded waits: nothing hangs on a sleeping or unreachable server.
const REQUEST_TIMEOUT_MS = 15_000;
// Generous: refresh rotates the token, so it must not be abandoned while the server handles it.
const REFRESH_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 15_000;

/** An abort signal that fires after `ms` (or when `outer` aborts). Call `clear()` when done. */
function timeoutSignal(ms: number, outer?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
  const onAbort = () => controller.abort(outer?.reason);
  if (outer?.aborted) controller.abort(outer.reason);
  else outer?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    },
  };
}

export const tokenStore = {
  set(token: string | null) {
    accessToken = token;
  },
  get: () => accessToken,
  onExpired(cb: () => void) {
    onSessionExpired = cb;
  },
};

/**
 * Outcome of renewing the session from the httpOnly refresh cookie: `ok` (with the user, so no
 * separate /auth/me call is needed), `expired` (sign in again) or `unreachable` (server asleep,
 * starting or offline; the session may still be valid).
 */
export type RefreshResult = { status: 'ok'; user: User } | { status: 'expired' } | { status: 'unreachable' };

let refreshInFlight: Promise<RefreshResult> | null = null;

/** Renews the access token; concurrent callers share one request. Bounded by a timeout. */
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    const t = timeoutSignal(REFRESH_TIMEOUT_MS);
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include', signal: t.signal })
      .then(async (res): Promise<RefreshResult> => {
        // 5xx (gateway, proxy or server error): the session may well be valid; never sign out on it.
        if (res.status >= 500) return { status: 'unreachable' };
        serverUp = true;
        if (!res.ok) return { status: 'expired' };
        const body = (await res.json()) as { accessToken: string; user: User };
        accessToken = body.accessToken;
        return { status: 'ok', user: body.user };
      })
      .catch((): RefreshResult => ({ status: 'unreachable' }))
      .finally(() => {
        t.clear();
        setTimeout(() => (refreshInFlight = null), 0);
      });
  }
  return refreshInFlight;
}


interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  retries?: number;
  auth?: boolean;
  signal?: AbortSignal;
  /** Per attempt; defaults to 15 s. */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const qs = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${API_BASE}${path}${qs === '?' ? '' : qs}`;
  const maxRetries = opts.retries ?? (method === 'GET' ? 2 : 0);

  for (let attempt = 0, refreshed = false; ; attempt++) {
    let res: Response;
    const t = timeoutSignal(opts.timeoutMs ?? REQUEST_TIMEOUT_MS, opts.signal);
    try {
      res = await fetch(url, {
        method,
        credentials: 'include',
        signal: t.signal,
        headers: {
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(opts.auth !== false && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      // The caller cancelled (e.g. the screen unmounted): stop quietly.
      if (opts.signal?.aborted) throw err;
      const timedOut = t.signal.aborted;
      if (attempt < maxRetries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw timedOut
        ? new ApiRequestError(0, 'TIMEOUT', 'FINN took too long to respond. Please try again.')
        : new ApiRequestError(0, 'NETWORK', 'Cannot reach the FINN server. Check your connection and try again.');
    } finally {
      t.clear();
    }
    if (res.status < 500) serverUp = true;

    if (res.status === 401 && opts.auth !== false && !refreshed) {
      refreshed = true;
      const renewed = await refreshSession();
      if (renewed.status === 'ok') continue;
      // Sign out only when the server says the session is over, not when it was briefly unreachable.
      if (renewed.status === 'expired') {
        accessToken = null;
        onSessionExpired?.();
      }
    }
    if (res.status >= 500 && attempt < maxRetries) {
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (res.status === 204) return undefined as T;

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const e = (payload as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
      throw new ApiRequestError(res.status, e?.code ?? 'HTTP_ERROR', e?.message ?? `Request failed (${res.status})`, e?.details);
    }
    return payload as T;
  }
}

let serverReady: Promise<boolean> | null = null;

/**
 * Resolves true once the API answers its liveness probe. A free-tier host sleeps when idle and
 * can take up to a minute to start; meanwhile requests are held or answered with gateway errors.
 * One probe at a time, each bounded by a timeout, polling only
 * until the server is up (bounded by `maxMs`); it is not a keep-alive. Shared by all callers.
 */
export function waitForServer(maxMs = 90_000): Promise<boolean> {
  if (serverUp) return Promise.resolve(true);
  serverReady ??= (async () => {
    const until = Date.now() + maxMs;
    for (let n = 0; Date.now() < until; n++) {
      const t = timeoutSignal(HEALTH_TIMEOUT_MS);
      try {
        // /live answers as soon as the API process is up (no database round trip). Gateway and
        // proxy errors are 5xx; any other answer means the app itself is responding.
        const res = await fetch(`${API_BASE}/live`, { cache: 'no-store', signal: t.signal });
        if (res.status < 500) {
          serverUp = true;
          return true;
        }
      } catch {
        /* not reachable yet */
      } finally {
        t.clear();
      }
      // Back off (2 s, 3 s, 4.5 s … at most 10 s) so a struggling server is not hammered.
      await sleep(Math.min(10_000, 2_000 * 1.5 ** n));
    }
    serverReady = null; // let a later call try again
    return false;
  })();
  return serverReady;
}

/** Gateway or network failures: the server is unreachable or still starting. */
export const isServerStarting = (err: unknown) => err instanceof ApiRequestError && (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504);
