import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshSession, request, tokenStore, waitForServer } from '../lib/api';
import type { AuthResponse, User } from '../lib/types';

/** `offline`: the server did not answer within the bounded wait; the UI offers Retry. */
type Status = 'loading' | 'authenticated' | 'anonymous' | 'offline';

interface AuthState {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Try restoring the session again after `offline`. */
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * "This browser had a session" — only a UI hint (no token, nothing secret). It lets a visitor who
 * never signed in see the sign-in form at once instead of waiting for the server; the session
 * itself is still decided by the httpOnly refresh cookie on the server.
 */
const HINT_KEY = 'finn-session-hint';
const hint = {
  get: () => {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  },
  set: (on: boolean) => {
    try {
      if (on) localStorage.setItem(HINT_KEY, '1');
      else localStorage.removeItem(HINT_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

// Sign-in hashes the password server-side; allow for a database that is just waking.
const AUTH_TIMEOUT_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hadSession = useRef(hint.get()).current;
  const [status, setStatus] = useState<Status>(hadSession ? 'loading' : 'anonymous');
  const [user, setUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState(0);
  const qc = useQueryClient();

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    hint.set(true);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  // Restore the session from the httpOnly refresh cookie. The server must be answering first:
  // refresh rotates the token, and a request abandoned during a cold start could rotate it
  // without the browser receiving the new cookie. The readiness probe is cheap and idempotent.
  useEffect(() => {
    let cancelled = false;
    const restore = async (): Promise<Status | 'keep'> => {
      for (let tries = 0; tries < 2; tries++) {
        if (!(await waitForServer())) return 'offline';
        const r = await refreshSession();
        if (cancelled) return 'keep';
        if (r.status === 'ok') {
          setUser(r.user);
          hint.set(true);
          return 'authenticated';
        }
        if (r.status === 'expired') {
          hint.set(false);
          return 'anonymous';
        }
        // Unreachable after being up (redeploy, network blip): wait for the server once more.
      }
      return 'offline';
    };
    restore().then((next) => {
      if (cancelled || next === 'keep') return;
      // Without a hint the sign-in form is already showing: only switch if a session was found.
      setStatus((cur) => (cur === 'authenticated' ? cur : !hadSession && next !== 'authenticated' ? 'anonymous' : next));
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, hadSession]);

  useEffect(() => {
    tokenStore.onExpired(() => {
      hint.set(false);
      setUser(null);
      setStatus('anonymous');
      qc.clear();
    });
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      login: async (email, password) =>
        accept(await request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false, timeoutMs: AUTH_TIMEOUT_MS })),
      register: async (input) =>
        accept(
          await request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: { ...input, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            auth: false,
            timeoutMs: AUTH_TIMEOUT_MS,
          }),
        ),
      logout: async () => {
        await request('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
        hint.set(false);
        // A full reload drops every cached query and any live subscription of this user.
        tokenStore.set(null);
        window.location.assign('/');
      },
      refreshUser: async () => {
        const me = await request<{ user: User }>('/auth/me');
        setUser(me.user);
      },
      retry: () => {
        setStatus('loading');
        setAttempt((n) => n + 1);
      },
    }),
    [status, user, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
