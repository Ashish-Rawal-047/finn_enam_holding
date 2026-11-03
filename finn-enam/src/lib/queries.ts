/**
 * TanStack Query hooks: caching, background refresh, retries (in the client) and
 * cache invalidation after every mutation, so all five screens stay consistent.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './api';
import type { AskResult, FinancialAnalysis,
  AlertPreferences,
  CompanySummary,
  AlertNote,
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
  financials: (id: string) => ['financials', id] as const,
  researchJob: (id: string) => ['research-job', id] as const,
  alertNote: (id: string) => ['alert-note', id] as const,
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

export type NotificationFilter = 'all' | 'unread' | 'read' | 'favourites' | 'archived';

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

/** Charts, assessments and period comparisons computed from the stored statements (no AI). */
export const useFinancialAnalysis = (companyId: string | null) =>
  useQuery({
    queryKey: qk.financials(companyId ?? ''),
    queryFn: () => request<FinancialAnalysis>(`/research/${companyId}/financials`),
    enabled: Boolean(companyId),
    staleTime: 5 * 60_000,
  });

/** Ask FINN: one question about the company, answered from its stored evidence. */
export const useAskFinn = (companyId: string | null) =>
  useMutation({
    mutationFn: (question: string) => request<AskResult>(`/research/${companyId}/ask`, { method: 'POST', body: { question }, timeoutMs: 60_000 }),
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

type NotificationPage = Paginated<NotificationItem> & { unread: number; read: number; favourites: number; archived: number };

/**
 * `onFailure` runs at mutation level, so it still fires when the card that started the change has
 * already left the list (callbacks passed to `mutate()` are dropped once their component unmounts).
 */
interface MutationFeedback {
  onFailure?: () => void;
}

export function useMarkRead({ onFailure }: MutationFeedback = {}) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => request(`/notifications/${id}/read`, { method: 'PATCH', body: { read } }),
    // Flip the read state instantly; the server-ordered list (read sinks below unread) follows on refetch.
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previous = qc.getQueriesData<NotificationPage>({ queryKey: ['notifications'] });
      qc.setQueriesData<NotificationPage>({ queryKey: ['notifications'] }, (page) =>
        page ? { ...page, items: page.items.map((n) => (n.id === id ? { ...n, readAt: read ? n.readAt ?? new Date().toISOString() : null } : n)) } : page,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      onFailure?.();
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

/**
 * Archive or restore. The alert leaves the list it no longer belongs to at once (it stays, flagged,
 * under Favourites) and the counts follow; on failure every cached list is restored.
 */
export function useArchiveAlert({ onFailure }: MutationFeedback = {}) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => request<{ id: string; archived: boolean }>(`/alerts/${id}/${archived ? 'archive' : 'restore'}`, { method: 'POST' }),
    onMutate: async ({ id, archived }) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previous = qc.getQueriesData<NotificationPage>({ queryKey: ['notifications'] });
      const item = previous.flatMap(([, page]) => page?.items ?? []).find((n) => n.id === id);
      const changes = item && Boolean(item.archived ?? item.archivedAt) !== archived;
      const step = archived ? -1 : 1; // effect on the active counts
      for (const [key, page] of previous) {
        if (!page) continue;
        const status = key[1] as NotificationFilter;
        const present = page.items.some((n) => n.id === id);
        const leaves = present && (status === 'archived' ? !archived : status !== 'favourites' && archived);
        qc.setQueryData<NotificationPage>(key, {
          ...page,
          items: leaves ? page.items.filter((n) => n.id !== id) : page.items.map((n) => (n.id === id ? { ...n, archived, archivedAt: archived ? n.archivedAt ?? new Date().toISOString() : null } : n)),
          pagination: leaves ? { ...page.pagination, total: Math.max(0, page.pagination.total - 1) } : page.pagination,
          unread: changes && !item!.readAt ? Math.max(0, page.unread + step) : page.unread,
          read: changes && item!.readAt ? Math.max(0, page.read + step) : page.read,
          archived: changes ? Math.max(0, (page.archived ?? 0) - step) : page.archived,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      onFailure?.();
    },
    onSettled: () => invalidate(['notifications'], qk.home, qk.portfolio),
  });
}

/** The caller's personal note on an alert (null when there is none). */
export const useAlertNote = (id: string | null) =>
  useQuery({ queryKey: qk.alertNote(id ?? ''), queryFn: () => request<{ note: AlertNote | null }>(`/alerts/${id}/note`).then((r) => r.note), enabled: Boolean(id) });

export function useNoteMutations(id: string | null) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  // Lists show whether a note exists, so they refresh after every change.
  const done = (note: AlertNote | null) => {
    qc.setQueryData(qk.alertNote(id ?? ''), note);
    return invalidate(['notifications']);
  };
  return {
    save: useMutation({
      mutationFn: (content: string) => request<{ note: AlertNote }>(`/alerts/${id}/note`, { method: 'PUT', body: { content } }).then((r) => r.note),
      onSuccess: (note) => done(note),
    }),
    remove: useMutation({
      mutationFn: () => request<{ deleted: boolean }>(`/alerts/${id}/note`, { method: 'DELETE' }),
      onSuccess: () => done(null),
    }),
  };
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
      if (job.status === 'succeeded') await invalidate(['research', companyId ?? ''], ['financials', companyId ?? ''], ['evidence', companyId ?? ''], ['history', companyId ?? ''], ['overview', companyId ?? ''], qk.portfolio);
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
    onSuccess: () => invalidate(['research', companyId ?? ''], ['financials', companyId ?? ''], ['history', companyId ?? ''], ['overview', companyId ?? ''], qk.portfolio, qk.home),
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
