import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, ArrowRight, Check, CheckCheck, History, NotebookPen } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarkAllRead, useMarkRead, useNotifications } from '../../lib/queries';
import { relativeTime } from '../../lib/format';
import { Chips, DemoPill, EmptyState, ErrorState, LoadingBlock, PriorityBadge, Ticker, cx } from '../ui';
import { Pager } from '../../screens/SignalsScreen';
import { FavouriteButton } from '../home/AlertCard';
import { CompanyLogo } from '../company/CompanyLogo';

type Status = 'all' | 'unread' | 'read' | 'favourites' | 'archived';

export const NotificationCenter: React.FC<{
  open: boolean;
  onClose: () => void;
  onInspectSignal: (id: string) => void;
  onViewHistoricalEvent: (historicalEventId: string, newEventId: string, companySymbol?: string | null) => void;
}> = ({ open, onClose, onInspectSignal, onViewHistoricalEvent }) => {
  const [status, setStatus] = useState<Status>('all');
  const [priority, setPriority] = useState<string>('any');
  const [page, setPage] = useState(1);
  const list = useNotifications(status, page, priority === 'any' ? undefined : priority, open, 'attention');
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  // The list query is disabled while closed, so its data is undefined; render nothing.
  if (!open) return null;

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title="Notifications"
      subtitle={list.data ? `${list.data.unread} unread · ${list.data.read} read` : undefined}
      footer={
        <button
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || !list.data?.unread}
          className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-forest disabled:opacity-50 dark:text-emerald"
        >
          <CheckCheck size={16} /> Mark all as read
        </button>
      }
    >
      <div className="space-y-3">
        <Chips<Status>
          ariaLabel="Read state"
          value={status}
          onChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
          options={[
            { id: 'all', label: 'All', count: list.data ? list.data.unread + list.data.read : undefined },
            { id: 'unread', label: 'Unread', count: list.data?.unread },
            { id: 'read', label: 'Read', count: list.data?.read },
            { id: 'favourites', label: 'Favourites', count: list.data?.favourites },
            { id: 'archived', label: 'Archived', count: list.data?.archived, icon: <Archive size={13} strokeWidth={1.75} /> },
          ]}
        />
        <Chips
          ariaLabel="Priority"
          value={priority}
          onChange={(p) => {
            setPriority(p);
            setPage(1);
          }}
          options={[
            { id: 'any', label: 'Any priority' },
            { id: 'high', label: 'High +' },
            { id: 'critical', label: 'Critical' },
          ]}
        />
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <LoadingBlock rows={4} />
        ) : list.data.items.length === 0 ? (
          status === 'favourites' ? (
            <EmptyState title="No favourite alerts yet." body="Bookmark important developments to access them quickly." />
          ) : (
            <EmptyState title={status === 'unread' ? 'You’re all caught up' : status === 'read' ? 'No read notifications yet' : 'No notifications'} />
          )
        ) : (
          <ul className="-mx-1 space-y-1.5">
            {list.data.items.map((n) => {
              const isRead = Boolean(n.readAt);
              return (
                <motion.li
                  key={n.id}
                  layout="position"
                  transition={{ duration: 0.3 }}
                  className={cx('flex gap-2 rounded-xl px-2 py-3', isRead ? 'opacity-90' : 'bg-sage/50 dark:bg-emerald-subtle/30')}
                >
                  <span className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', isRead ? 'bg-transparent' : 'bg-forest dark:bg-emerald')} aria-label={isRead ? 'Read' : 'Unread'} />
                  <div className="min-w-0 flex-1">
                    <button className="w-full text-left" onClick={() => onInspectSignal(n.signalId)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CompanyLogo name={n.company.name} nseSymbol={n.company.nseSymbol} size="xs" />
                          <Ticker symbol={n.company.nseSymbol} />
                          {(n.archived ?? n.archivedAt) && <Archive size={12} className="text-ink-subtle" aria-label="Archived" />}
                          {n.hasNote && <NotebookPen size={12} className="text-forest dark:text-emerald" aria-label="Has a personal note" />}
                          {n.signal.isDemo && <DemoPill />}
                        </div>
                        <PriorityBadge priority={n.priority} />
                      </div>
                      <div className={cx('mt-0.5 text-sm leading-snug text-ink dark:text-white', isRead ? 'font-normal' : 'font-medium')}>{n.title}</div>
                      <p className="text-xs text-ink-muted line-clamp-2">{n.body}</p>
                      <div className="mt-0.5 font-mono text-[10px] text-ink-muted">{relativeTime(n.createdAt)}</div>
                    </button>
                    {n.historicalMatch && (
                      <button
                        onClick={() => onViewHistoricalEvent(n.historicalMatch!.event.id, n.historicalMatch!.newEventId, n.historicalMatch!.event.company.nseSymbol)}
                        className="mt-2 flex w-full items-center gap-2 rounded-lg border border-forest/25 bg-paper px-2.5 py-2 text-left text-[11.5px] dark:border-emerald/25 dark:bg-ink-surface"
                      >
                        <History size={13} className="shrink-0 text-forest dark:text-emerald" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-forest dark:text-emerald">Historical match · </span>
                          <span className="text-ink dark:text-ink-light">{n.historicalMatch.event.title}</span>
                          <span className="text-ink-muted"> · {n.historicalMatch.outcome}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-forest dark:text-emerald">
                          View <ArrowRight size={12} />
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      onClick={() => markRead.mutate({ id: n.id, read: !isRead })}
                      aria-pressed={isRead}
                      title={isRead ? 'Marked as read — click to mark unread' : 'Mark as read'}
                      className={cx(
                        'inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors',
                        isRead ? 'bg-sage text-forest dark:bg-emerald-subtle dark:text-emerald' : 'text-ink-muted hover:bg-cream-dark hover:text-ink dark:hover:bg-ink-surfaceSubtle dark:hover:text-white',
                      )}
                    >
                      <Check size={12} strokeWidth={isRead ? 2.5 : 2} /> {isRead ? 'Read' : 'Mark read'}
                    </button>
                    <FavouriteButton alertId={n.id} favourited={Boolean(n.favourited ?? n.favouritedAt)} />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
        {list.data && <Pager page={page} totalPages={list.data.pagination.totalPages} onPage={setPage} />}
      </div>
    </Drawer>
  );
};
