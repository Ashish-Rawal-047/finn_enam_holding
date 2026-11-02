import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshAccessToken, request, tokenStore } from '../lib/api';
import type { AuthResponse, User } from '../lib/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const qc = useQueryClient();

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  // Restore the session from the httpOnly refresh cookie on load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await refreshAccessToken();
      if (cancelled) return;
      if (!ok) {
        setStatus('anonymous');
        return;
      }
      try {
        const me = await request<{ user: User }>('/auth/me');
        if (!cancelled) {
          setUser(me.user);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    tokenStore.onExpired(() => {
      setUser(null);
      setStatus('anonymous');
      qc.clear();
    });
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      login: async (email, password) => accept(await request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false })),
      register: async (input) =>
        accept(
          await request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: { ...input, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            auth: false,
          }),
        ),
      logout: async () => {
        await request('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
        // A full reload drops every cached query and any live subscription of this user.
        tokenStore.set(null);
        window.location.assign('/');
      },
      refreshUser: async () => {
        const me = await request<{ user: User }>('/auth/me');
        setUser(me.user);
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
