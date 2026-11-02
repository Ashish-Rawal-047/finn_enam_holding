import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, History, Star } from 'lucide-react';
import { useMarkAllRead, useNotifications } from '../../lib/queries';
import { AlertCard } from './AlertCard';
import { EASE_OUT } from '../motion';
import { Chips, EmptyState, ErrorState, LoadingBlock, SecondaryButton, SectionTitle, TextButton } from '../ui';

type Filter = 'all' | 'unread' | 'read' | 'favourites';

/**
 * Portfolio Alerts on Home (threshold-triggered). Every alert stays in the list: unread first (ranked by priority and
 * materiality), read ones below, ordered by when they were read. Read and favourite state persist
 * server-side and are independent: Favourites shows bookmarked alerts in the same order.
 */
export const AlertList: React.FC<{
  onInspectSignal: (signalId: string) => void;
  onOpenCompany: (companyId: string) => void;
  onOpenHistory: () => void;
  onViewHistoricalEvent: (historicalEventId: string, newEventId: string, companySymbol?: string | null) => void;
}> = ({ onInspectSignal, onOpenCompany, onOpenHistory, onViewHistoricalEvent }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(8);
  const list = useNotifications(filter, 1, undefined, true, 'attention', limit);
  const markAll = useMarkAllRead();
  const data = list.data;

  return (
    <section className="space-y-4" aria-label="Portfolio Alerts">
      <SectionTitle
        title="Portfolio Alerts"
        meta="Ranked by materiality — read alerts stay below unread ones"
        action={
          <TextButton onClick={onOpenHistory}>
            <History size={14} strokeWidth={1.75} /> History
          </TextButton>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chips<Filter>
          ariaLabel="Alert filter"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setLimit(8);
          }}
          options={[
            { id: 'all', label: 'All', count: data ? data.unread + data.read : undefined },
            { id: 'unread', label: 'Unread', count: data?.unread },
            { id: 'read', label: 'Read', count: data?.read },
            { id: 'favourites', label: 'Favourites', count: data?.favourites },
          ]}
        />
        {(data?.unread ?? 0) > 0 && (
          <TextButton onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck size={14} strokeWidth={1.75} /> Mark all as read
          </TextButton>
        )}
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !data ? (
        <LoadingBlock rows={3} />
      ) : data.items.length === 0 && filter === 'favourites' ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-divider px-6 py-10 text-center dark:border-ink-border">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage text-forest dark:bg-emerald-subtle dark:text-emerald">
            <Star size={18} strokeWidth={1.75} />
          </span>
          <p className="mt-3 font-serif text-[19px] leading-tight text-forest-dark dark:text-white">No favourite alerts yet.</p>
          <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-ink-muted">Bookmark important developments to access them quickly.</p>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'You’re all caught up' : filter === 'read' ? 'No read alerts yet' : 'No alerts yet'}
          body={filter === 'all' ? 'No signals on your portfolio have crossed your thresholds. Adjust sensitivity in Settings → Alerts.' : undefined}
        />
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {data.items.map((a, i) => {
                const firstRead = a.readAt && (i === 0 || !data.items[i - 1].readAt) && (filter === 'all' || filter === 'favourites');
                return (
                  <motion.li key={a.id} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                    {firstRead && (
                      <div className="mb-3 mt-2 flex items-center gap-3 text-2xs font-medium uppercase tracking-eyebrow text-ink-subtle">
                        <span className="h-px flex-1 bg-divider dark:bg-ink-border" /> Read <span className="h-px flex-1 bg-divider dark:bg-ink-border" />
                      </div>
                    )}
                    <AlertCard
                      alert={a}
                      onInspect={() => onInspectSignal(a.signalId)}
                      onOpenCompany={() => onOpenCompany(a.company.id)}
                      onViewHistoricalEvent={onViewHistoricalEvent}
                    />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {data.pagination.total > data.items.length && (
            <SecondaryButton className="w-full" onClick={() => setLimit((l) => Math.min(100, l + 10))} disabled={list.isFetching}>
              Show {Math.min(10, data.pagination.total - data.items.length)} more · {data.pagination.total - data.items.length} older
            </SecondaryButton>
          )}
        </>
      )}
    </section>
  );
};
