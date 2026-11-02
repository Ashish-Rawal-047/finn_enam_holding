/**
 * Live notifications. When the backend has Neon Realtime configured it returns a sealed,
 * per-user live query; we subscribe and refresh notification-related queries whenever the
 * result changes. Otherwise the unread count is polled every 30 seconds.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRealtimeClient, type RealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import { ApiRequestError, request } from './api';
import { qk, useNotifications } from './queries';

interface LiveRow {
  id: string;
  read_at: string | null;
}

type Sealed = { url: string; sealed: SealedLiveQuery<LiveRow> };

const fetchSealed = () => request<Sealed>('/notifications/live', { method: 'POST', retries: 0 });

export type LiveMode = 'connecting' | 'realtime' | 'polling';

export function useUnreadCount(mode: LiveMode) {
  const q = useNotifications('unread', 1, undefined, true);
  const qc = useQueryClient();
  // Poll only when realtime is unavailable.
  useEffect(() => {
    if (mode !== 'polling') return;
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ['notifications', 'unread'] }), 30_000);
    return () => clearInterval(t);
  }, [mode, qc]);
  return q.data?.unread ?? 0;
}

export const LiveNotifications: React.FC<{ onMode: (m: LiveMode) => void }> = ({ onMode }) => {
  const [state, setState] = useState<{ client: RealtimeClient; sealed: SealedLiveQuery<LiveRow> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSealed()
      .then((r) => {
        if (cancelled) return;
        setState({ client: createRealtimeClient({ url: r.url }), sealed: r.sealed });
      })
      .catch((err) => {
        if (!cancelled) onMode('polling');
        if (!(err instanceof ApiRequestError && err.status === 503)) console.warn('[live] realtime unavailable:', (err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [onMode]);

  if (!state) return null;
  return (
    <RealtimeProvider client={state.client}>
      <LiveBridge sealed={state.sealed} onMode={onMode} />
    </RealtimeProvider>
  );
};

const LiveBridge: React.FC<{ sealed: SealedLiveQuery<LiveRow>; onMode: (m: LiveMode) => void }> = ({ sealed, onMode }) => {
  const qc = useQueryClient();
  const refreshQuery = useCallback(() => fetchSealed().then((r) => r.sealed), []);
  const { data, status } = useLiveQuery(sealed, { refreshQuery });

  useEffect(() => {
    onMode(status === 'error' ? 'polling' : data === undefined ? 'connecting' : 'realtime');
  }, [status, data, onMode]);

  // A change in ids or read state means new or updated notifications.
  const signature = data ? data.map((r) => `${r.id}:${r.read_at ?? ''}`).join('|') : null;
  useEffect(() => {
    if (signature === null) return;
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: qk.home });
    qc.invalidateQueries({ queryKey: qk.portfolio });
  }, [signature, qc]);
  return null;
};
