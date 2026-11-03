/**
 * Centralised API client.
 *
 *  - Access token lives in memory only; the refresh token is an httpOnly cookie the
 *    browser sends to /api/auth/* (never readable from JS).
 *  - A 401 triggers one shared refresh attempt, then the request is replayed once.
 *  - Idempotent requests (GET) retry on network errors and 5xx with backoff.
 *  - No fixtures: when the backend is unreachable the UI shows an error state.
 */

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
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokenStore = {
  set(token: string | null) {
    accessToken = token;
  },
  get: () => accessToken,
  onExpired(cb: () => void) {
    onSessionExpired = cb;
  },
};

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return false;
        const body = (await res.json()) as { accessToken: string };
        accessToken = body.accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
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
    try {
      res = await fetch(url, {
        method,
        credentials: 'include',
        signal: opts.signal,
        headers: {
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(opts.auth !== false && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      if (attempt < maxRetries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw new ApiRequestError(0, 'NETWORK', 'Cannot reach the FINN server. Check your connection and try again.');
    }

    if (res.status === 401 && opts.auth !== false && !refreshed) {
      refreshed = true;
      if (await refreshAccessToken()) continue;
      accessToken = null;
      onSessionExpired?.();
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

export { refreshAccessToken };

let serverReady: Promise<boolean> | null = null;

/**
 * Resolves true once the API answers its health check. A free-tier host sleeps when idle and
 * can take up to a minute to start, during which the proxy returns gateway errors. Polls only
 * until the server is up (bounded by `maxMs`); it is not a keep-alive. Shared by all callers.
 */
export function waitForServer(maxMs = 90_000): Promise<boolean> {
  serverReady ??= (async () => {
    const until = Date.now() + maxMs;
    while (Date.now() < until) {
      try {
        if ((await fetch(`${API_BASE}/health`, { cache: 'no-store' })).ok) return true;
      } catch {
        /* not reachable yet */
      }
      await sleep(2_500);
    }
    serverReady = null; // let a later call try again
    return false;
  })();
  return serverReady;
}

/** Gateway or network failures: the server is unreachable or still starting. */
export const isServerStarting = (err: unknown) => err instanceof ApiRequestError && (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504);
