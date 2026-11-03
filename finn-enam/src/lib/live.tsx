/**
 * Live notifications. When the backend has Neon Realtime configured it returns a sealed,
 * per-user live query; we subscribe and refresh notification-related queries whenever the
 * result changes. Otherwise the unread count is polled every 30 seconds.
 */
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from './api';
import { useNotifications } from './queries';
import { fetchSealed, type Sealed } from './live-shared';

// The realtime client is only needed after sign-in, so it is loaded separately from the main
// bundle (in parallel with the request for the sealed live query).
const loadBridge = () => import('./live-realtime');
// If that chunk cannot load (offline, or a redeploy replaced it), fall back to polling.
const PollInstead: React.FC<{ onMode: (m: LiveMode) => void }> = ({ onMode }) => {
  useEffect(() => onMode('polling'), [onMode]);
  return null;
};
const RealtimeBridge = lazy(() => loadBridge().catch(() => ({ default: PollInstead })));

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
  const [state, setState] = useState<Sealed | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadBridge().catch(() => undefined);
    fetchSealed()
      .then((r) => {
        if (!cancelled) setState(r);
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
    <Suspense fallback={null}>
      <RealtimeBridge live={state} onMode={onMode} />
    </Suspense>
  );
};
