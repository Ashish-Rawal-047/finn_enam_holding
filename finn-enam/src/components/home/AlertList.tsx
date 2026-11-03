import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, CheckCheck, History, Star } from 'lucide-react';
import { useMarkAllRead, useNotifications } from '../../lib/queries';
import type { NotificationItem } from '../../lib/types';
import { AlertCard } from './AlertCard';
import { NoteSheet } from './NoteSheet';
import { EASE_OUT } from '../motion';
import { Chips, EmptyState, ErrorState, LoadingBlock, SecondaryButton, SectionTitle, TextButton } from '../ui';

type Filter = 'all' | 'unread' | 'read' | 'favourites' | 'archived';

/**
 * Portfolio Alerts on Home (threshold-triggered). The active feed lists unread alerts first
 * (ranked by priority and materiality), read ones below, ordered by when they were read.
 * Read, favourite, archive and note state persist server-side and are independent: Favourites
 * shows bookmarked alerts (archived ones flagged), Archived shows alerts moved out of the feed.
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
  const [noteFor, setNoteFor] = useState<NotificationItem | null>(null);
  const data = list.data;

  return (
    <section className="space-y-4" aria-label="Portfolio Alerts">
      <SectionTitle
        title="Portfolio Alerts"
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
            { id: 'archived', label: 'Archived', count: data?.archived, icon: <Archive size={13} strokeWidth={1.75} /> },
          ]}
        />
        {(data?.unread ?? 0) > 0 && filter !== 'archived' && filter !== 'favourites' && (
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
        <EmptyState title="No favourite alerts yet." body="Bookmark important developments to access them quickly." icon={<Star size={18} strokeWidth={1.75} />} />
      ) : data.items.length === 0 && filter === 'archived' ? (
        <EmptyState title="No archived alerts" body="Archived alerts will appear here." icon={<Archive size={18} strokeWidth={1.75} />} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'You’re all caught up' : filter === 'read' ? 'No read alerts yet' : 'No alerts yet'}
          body={filter === 'all' ? 'Nothing has crossed your thresholds.' : undefined}
        />
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {data.items.map((a, i) => {
                const firstRead = a.readAt && (i === 0 || !data.items[i - 1].readAt) && (filter === 'all' || filter === 'favourites');
                return (
                  <motion.li key={a.id} data-alert-id={a.id} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                    {firstRead && (
                      <div className="mb-2.5 mt-5 text-2xs font-medium uppercase tracking-eyebrow text-ink-subtle">Read</div>
                    )}
                    <AlertCard
                      alert={a}
                      onInspect={() => onInspectSignal(a.signalId)}
                      onOpenCompany={() => onOpenCompany(a.company.id)}
                      onViewHistoricalEvent={onViewHistoricalEvent}
                      onNote={() => setNoteFor(a)}
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
      <NoteSheet alert={noteFor} onClose={() => setNoteFor(null)} />
    </section>
  );
};
