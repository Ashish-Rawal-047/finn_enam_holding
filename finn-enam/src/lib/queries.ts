/**
 * TanStack Query hooks: caching, background refresh, retries (in the client) and
 * cache invalidation after every mutation, so all five screens stay consistent.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './api';
import type {
  AlertPreferences,
  CompanySummary,
  CompanyOverview,
  CorporateEvent,
  DigestResponse,
  DigestWindow,
  EvidenceResponse,
  EventDetail,
  HealthResponse,
  HistoryResponse,
  Holding,
  HomeResponse,
  Milestone,
  NotificationItem,
  Paginated,
  Range,
  ResearchJob,
  ResearchResponse,
  SearchResponse,
  SessionInfo,
  SettingsResponse,
  Signal,
  Watchlist,
} from './types';

export const qk = {
  home: ['home'] as const,
  portfolio: ['portfolio'] as const,
  digest: (window: DigestWindow, from?: string, to?: string) => ['digest', window, from ?? '', to ?? ''] as const,
  notifications: (status: string, page: number, priority?: string, sort = 'recent', pageSize = 20) => ['notifications', status, page, priority ?? 'any', sort, pageSize] as const,
  signals: (page: number, type?: string) => ['signals', page, type ?? 'all'] as const,
  signal: (id: string) => ['signal', id] as const,
  companySignals: (id: string) => ['company-signals', id] as const,
  overview: (id: string) => ['overview', id] as const,
  history: (id: string, range: Range) => ['history', id, range] as const,
  search: (q: string) => ['search', q] as const,
  research: (id: string, reportId?: string) => ['research', id, reportId ?? 'latest'] as const,
  researchJob: (id: string) => ['research-job', id] as const,
  evidence: (id: string, reportId?: string) => ['evidence', id, reportId ?? 'latest'] as const,
  events: (params: Record<string, unknown>) => ['events', params] as const,
  event: (id: string) => ['event', id] as const,
  settings: ['settings'] as const,
  alerts: ['settings', 'alerts'] as const,
  watchlists: ['watchlists'] as const,
  sessions: ['sessions'] as const,
  health: ['health'] as const,
};

export const useHome = () => useQuery({ queryKey: qk.home, queryFn: () => request<HomeResponse>('/home'), refetchInterval: 60_000 });

export const usePortfolio = () =>
  useQuery({ queryKey: qk.portfolio, queryFn: () => request<{ items: Holding[]; total: number }>('/portfolio').then((r) => r.items) });

/** Filings on the portfolio inside a window; a custom window waits for both dates. */
export const useDigest = (window: DigestWindow, from?: string, to?: string) =>
  useQuery({
    queryKey: qk.digest(window, from, to),
    queryFn: () => request<DigestResponse>('/digest', { query: { window, from: window === 'custom' ? from : undefined, to: window === 'custom' ? to : undefined } }),
    enabled: window !== 'custom' || Boolean(from && to && from <= to),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  });

export type NotificationFilter ='all' | 'unread' | 'read' | 'favourites';

export const useNotifications = (
  status: NotificationFilter,
  page = 1,
  priority?: string,
  enabled = true,
  sort: 'recent' | 'attention' = 'recent',
  pageSize = 20,
) =>
  useQuery({
    queryKey: qk.notifications(status, page, priority, sort, pageSize),
    queryFn: () => request<NotificationPage>('/notifications', { query: { status, page, pageSize, priority, sort } }),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useSignals = (page = 1, type?: string) =>
  useQuery({
    queryKey: qk.signals(page, type),
    queryFn: () => request<Paginated<Signal>>('/signals', { query: { page, pageSize: 20, type } }),
    placeholderData: keepPreviousData,
  });

export const useSignal = (id: string | null) =>
  useQuery({ queryKey: qk.signal(id ?? ''), queryFn: () => request<Signal>(`/signals/${id}`), enabled: Boolean(id) });

export const useCompanySignals = (id: string | null) =>
  useQuery({
    queryKey: qk.companySignals(id ?? ''),
    queryFn: () => request<Paginated<Signal>>(`/companies/${id}/signals`, { query: { pageSize: 50 } }),
    enabled: Boolean(id),
  });

export const useCompanyOverview = (id: string | null) =>
  useQuery({ queryKey: qk.overview(id ?? ''), queryFn: () => request<CompanyOverview>(`/companies/${id}/overview`), enabled: Boolean(id) });

export const useHistory = (id: string | null, range: Range) =>
  useQuery({
    queryKey: qk.history(id ?? '', range),
    queryFn: () => request<HistoryResponse>(`/market/${id}/history`, { query: { range } }),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useCompanySearch = (q: string) =>
  useQuery({
    queryKey: qk.search(q),
    queryFn: () => request<SearchResponse>('/companies/search', { query: { q, limit: 10 } }),
    enabled: q.trim().length >= 1,
    staleTime: 60_000,
  });

export const useResearch = (companyId: string | null, reportId?: string) =>
  useQuery({
    queryKey: qk.research(companyId ?? '', reportId),
    queryFn: () => request<ResearchResponse>(`/research/${companyId}`, { query: { reportId } }),
    enabled: Boolean(companyId),
  });

export const useEvidence = (companyId: string | null, reportId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: qk.evidence(companyId ?? '', reportId),
    queryFn: () => request<EvidenceResponse>(`/research/${companyId}/evidence`, { query: { reportId } }),
    enabled: Boolean(companyId) && enabled,
  });

export const useEvents = (params: { scope: 'portfolio' | 'all'; status?: string; category?: string; q?: string; companyId?: string; page: number }) =>
  useQuery({
    queryKey: qk.events(params),
    queryFn: () => request<Paginated<CorporateEvent>>('/events', { query: { ...params, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  });

export const useEvent = (id: string | null) =>
  useQuery({ queryKey: qk.event(id ?? ''), queryFn: () => request<EventDetail>(`/events/${id}`), enabled: Boolean(id) });

export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: () => request<SettingsResponse>('/settings') });
export const useAlertSettings = () => useQuery({ queryKey: qk.alerts, queryFn: () => request<AlertPreferences>('/settings/alerts') });
export const useWatchlists = () => useQuery({ queryKey: qk.watchlists, queryFn: () => request<{ items: Watchlist[] }>('/watchlists').then((r) => r.items) });
export const useSessions = () => useQuery({ queryKey: qk.sessions, queryFn: () => request<{ items: SessionInfo[] }>('/auth/sessions').then((r) => r.items) });
export const useHealth = () => useQuery({ queryKey: qk.health, queryFn: () => request<HealthResponse>('/health', { auth: false }), staleTime: 5 * 60_000 });

// --- mutations ---------------------------------------------------------------------------

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: Array<readonly unknown[]>) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

const affectsPortfolio = [qk.portfolio, qk.home, ['digest'], ['signals'], ['notifications'], qk.watchlists, ['events'], ['overview']];

export function useAddToPortfolio() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (ref: { companyId?: string; symbol?: string }) => request<{ added: boolean }>('/portfolio', { method: 'POST', body: ref }),
    onSuccess: () => invalidate(...affectsPortfolio),
  });
}

export function useAddDemoPortfolio() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => request<{ added: number }>('/portfolio/demo', { method: 'POST' }),
    onSuccess: () => invalidate(...affectsPortfolio),
  });
}

export function useRemoveFromPortfolio() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (companyId: string) => request<void>(`/portfolio/${companyId}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(...affectsPortfolio),
  });
}

type NotificationPage = Paginated<NotificationItem> & { unread: number; read: number; favourites: number };

export function useMarkRead() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => request(`/notifications/${id}/read`, { method: 'PATCH', body: { read } }),
    // Flip the read state instantly; the server-ordered list (read sinks below unread) follows on refetch.
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      qc.setQueriesData<NotificationPage>({ queryKey: ['notifications'] }, (page) =>
        page ? { ...page, items: page.items.map((n) => (n.id === id ? { ...n, readAt: read ? n.readAt ?? new Date().toISOString() : null } : n)) } : page,
      );
    },
    onSettled: () => invalidate(['notifications'], qk.home, qk.portfolio),
  });
}

/**
 * Bookmark toggle. The star and the Favourites count flip instantly in every cached list; nothing
 * else about the alert changes (read state, priority, position). The server confirms on settle.
 */
export function useToggleFavourite() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, favourite }: { id: string; favourite: boolean }) =>
      request<{ id: string; favourited: boolean }>(`/alerts/${id}/favourite`, { method: favourite ? 'POST' : 'DELETE' }),
    onMutate: async ({ id, favourite }) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previous = qc.getQueriesData<NotificationPage>({ queryKey: ['notifications'] });
      qc.setQueriesData<NotificationPage>({ queryKey: ['notifications'] }, (page) => {
        if (!page) return page;
        const target = page.items.find((n) => n.id === id);
        const changed = target && Boolean(target.favourited) !== favourite;
        return {
          ...page,
          favourites: changed ? Math.max(0, (page.favourites ?? 0) + (favourite ? 1 : -1)) : page.favourites,
          items: page.items.map((n) => (n.id === id ? { ...n, favourited: favourite, favouritedAt: favourite ? n.favouritedAt ?? new Date().toISOString() : null } : n)),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => invalidate(['notifications']),
  });
}

export function useMarkAllRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => request<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => invalidate(['notifications'], qk.home, qk.portfolio),
  });
}

export function useUpdateAlerts() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (patch: Partial<AlertPreferences>) => request<AlertPreferences & { newNotifications: number }>('/settings/alerts', { method: 'PATCH', body: patch }),
    onSuccess: () => invalidate(qk.alerts, qk.settings, ['signals'], ['notifications'], qk.home, qk.portfolio),
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (patch: Partial<SettingsResponse['profile']>) => request<SettingsResponse>('/settings', { method: 'PATCH', body: patch }),
    onSuccess: () => invalidate(qk.settings, qk.home),
  });
}

export function useWatchlistMutations() {
  const invalidate = useInvalidate();
  const done = () => invalidate(qk.watchlists, qk.portfolio, qk.home);
  return {
    create: useMutation({ mutationFn: (name: string) => request<Watchlist>('/watchlists', { method: 'POST', body: { name } }), onSuccess: done }),
    rename: useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => request(`/watchlists/${id}`, { method: 'PATCH', body: { name } }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => request(`/watchlists/${id}`, { method: 'DELETE' }), onSuccess: done }),
    addCompany: useMutation({
      mutationFn: ({ id, ref }: { id: string; ref: { companyId?: string; symbol?: string } }) => request(`/watchlists/${id}/companies`, { method: 'POST', body: ref }),
      onSuccess: () => invalidate(...affectsPortfolio),
    }),
    removeCompany: useMutation({
      mutationFn: ({ id, companyId }: { id: string; companyId: string }) => request(`/watchlists/${id}/companies/${companyId}`, { method: 'DELETE' }),
      onSuccess: done,
    }),
  };
}

/**
 * Starts research in the background. `generate` reuses an identical stored report; `refresh`
 * regenerates the AI analysis from cached data (or refetches data too with `refreshData`).
 */
export function useStartResearch(companyId: string | null) {
  return useMutation({
    mutationFn: (opts: { mode: 'generate' | 'refresh'; refreshData?: boolean }) =>
      request<{ job: ResearchJob; deduplicated: boolean }>(`/research/${companyId}/${opts.mode}`, { method: 'POST', body: { refreshData: Boolean(opts.refreshData) } }),
  });
}

/** Polls a research job until it finishes; then refreshes the report and dependent views once. */
export function useResearchJob(jobId: string | null, companyId: string | null) {
  const invalidate = useInvalidate();
  return useQuery({
    queryKey: qk.researchJob(jobId ?? ''),
    queryFn: async () => {
      const { job } = await request<{ job: ResearchJob }>(`/research/jobs/${jobId}`);
      if (job.status === 'succeeded') await invalidate(['research', companyId ?? ''], ['evidence', companyId ?? ''], ['history', companyId ?? ''], ['overview', companyId ?? ''], qk.portfolio);
      return job;
    },
    enabled: Boolean(jobId),
    refetchInterval: (q) => (q.state.data && ['succeeded', 'failed'].includes(q.state.data.status) ? false : 900),
    refetchIntervalInBackground: true,
  });
}

export function useImportCompany() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (symbol: string) => request<{ company: CompanySummary; created: boolean }>('/companies/import', { method: 'POST', body: { symbol } }),
    onSuccess: () => invalidate(['search']),
  });
}

export function useRefreshCompany(companyId: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => request<{ results: Array<{ dataset: string; status: string; detail?: string }> }>(`/companies/${companyId}/refresh`, { method: 'POST' }),
    onSuccess: () => invalidate(['research', companyId ?? ''], ['history', companyId ?? ''], ['overview', companyId ?? ''], qk.portfolio, qk.home),
  });
}

export function useEventMutations(eventId?: string) {
  const invalidate = useInvalidate();
  const done = () => invalidate(['events'], ['event'], qk.home, ['signals'], ['notifications']);
  return {
    create: useMutation({
      mutationFn: (body: Record<string, unknown>) => request<{ event: EventDetail; matches: unknown[]; precedentSignalId: string | null }>('/events', { method: 'POST', body }),
      onSuccess: done,
    }),
    update: useMutation({ mutationFn: (body: Record<string, unknown>) => request<EventDetail>(`/events/${eventId}`, { method: 'PATCH', body }), onSuccess: done }),
    addMilestone: useMutation({ mutationFn: (body: Record<string, unknown>) => request<Milestone>(`/events/${eventId}/milestones`, { method: 'POST', body }), onSuccess: done }),
  };
}

export function useSessionMutations() {
  const invalidate = useInvalidate();
  return {
    revoke: useMutation({ mutationFn: (id: string) => request(`/auth/sessions/${id}`, { method: 'DELETE' }), onSuccess: () => invalidate(qk.sessions) }),
    changePassword: useMutation({
      mutationFn: (body: { currentPassword: string; newPassword: string }) => request('/auth/password', { method: 'POST', body }),
      onSuccess: () => invalidate(qk.sessions),
    }),
  };
}
