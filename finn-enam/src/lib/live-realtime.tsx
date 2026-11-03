/** Neon Realtime subscription for notifications (lazy-loaded; see live.tsx). */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import { qk } from './queries';
import { fetchSealed, type LiveRow, type Sealed } from './live-shared';
import type { LiveMode } from './live';

const RealtimeBridge: React.FC<{ live: Sealed; onMode: (m: LiveMode) => void }> = ({ live, onMode }) => {
  const client = useMemo(() => createRealtimeClient({ url: live.url }), [live.url]);
  return (
    <RealtimeProvider client={client}>
      <LiveBridge sealed={live.sealed} onMode={onMode} />
    </RealtimeProvider>
  );
};

export default RealtimeBridge;

const LiveBridge: React.FC<{ sealed: SealedLiveQuery<LiveRow>; onMode: (m: LiveMode) => void }> = ({ sealed, onMode }) => {
  const qc = useQueryClient();
  const refreshQuery = useCallback(() => fetchSealed().then((r) => r.sealed), []);
  const { data, status } = useLiveQuery(sealed, { refreshQuery });

  useEffect(() => {
    onMode(status === 'error' ? 'polling' : data === undefined ? 'connecting' : 'realtime');
  }, [status, data, onMode]);

  // A change in ids, read or archive state means new or updated notifications.
  const signature = data ? data.map((r) => `${r.id}:${r.read_at ?? ''}:${r.archived_at ?? ''}`).join('|') : null;
  const baseline = useRef(true);
  useEffect(() => {
    if (signature === null) return;
    // The first snapshot only describes the current state. If the screens are loading it right now
    // or loaded it moments ago, refetching would just repeat those requests; later changes still
    // refresh everything.
    if (baseline.current) {
      baseline.current = false;
      const current = (queryKey: readonly unknown[]) =>
        qc
          .getQueryCache()
          .findAll({ queryKey })
          // Loading now, loaded moments ago, or never loaded (e.g. a closed panel): nothing stale.
          .every((q) => q.state.fetchStatus === 'fetching' || q.state.dataUpdatedAt === 0 || Date.now() - q.state.dataUpdatedAt < 10_000);
      if (current(['notifications']) && current(qk.home) && current(qk.portfolio)) return;
    }
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: qk.home });
    qc.invalidateQueries({ queryKey: qk.portfolio });
  }, [signature, qc]);
  return null;
};
