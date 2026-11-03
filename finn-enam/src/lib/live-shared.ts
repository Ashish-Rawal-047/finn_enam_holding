import type { SealedLiveQuery } from '@neon/realtime/client';
import { request } from './api';

export interface LiveRow {
  id: string;
  read_at: string | null;
  archived_at: string | null;
}

export type Sealed = { url: string; sealed: SealedLiveQuery<LiveRow> };

export const fetchSealed = () => request<Sealed>('/notifications/live', { method: 'POST', retries: 0 });
