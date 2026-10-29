import React, { useState, useEffect } from 'react';
import { EventMemoryItem, CommitmentStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { EventMemoryDetailDrawer } from '../components/memory/EventMemoryDetailDrawer';
import { History, Search, ChevronRight } from 'lucide-react';

interface EventMemoryScreenProps {
  memoryItems: EventMemoryItem[];
  initialActiveId?: string | null;
  onNavigateToResearch: (ticker: string) => void;
}

export const EventMemoryScreen: React.FC<EventMemoryScreenProps> = ({
  memoryItems,
  initialActiveId,
  onNavigateToResearch,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItem, setActiveItem] = useState<EventMemoryItem | null>(() => {
    if (initialActiveId) {
      return memoryItems.find((m) => m.id === initialActiveId) || null;
    }
    return null;
  });

  // Keep activeItem in sync if parent passes a new initialActiveId
  useEffect(() => {
    if (initialActiveId) {
      const match = memoryItems.find((m) => m.id === initialActiveId);
      if (match) {
        setActiveItem(match);
      }
    }
  }, [initialActiveId, memoryItems]);

  const statusOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Statuses' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'pending', label: 'Tracking' },
    { id: 'delayed', label: 'Delayed' },
  ];

  const filteredItems = memoryItems.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesSearch =
      !searchQuery.trim() ||
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.announcedMetric.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Accountability Metrics
  const totalCount = memoryItems.length;
  const deliveredCount = memoryItems.filter((m) => m.status === 'delivered').length;
  const delayedCount = memoryItems.filter((m) => m.status === 'delayed').length;
  const inFlightCount = memoryItems.filter((m) => m.status === 'pending' || m.status === 'revised').length;
  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="forest" size="sm" dot>DELIVERED</Badge>;
      case 'delayed':
        return <Badge variant="red" size="sm" dot>DELAYED</Badge>;
      case 'revised':
        return <Badge variant="amber" size="sm" dot>REVISED</Badge>;
      case 'pending':
      default:
        return <Badge variant="sage" size="sm" dot>TRACKING</Badge>;
    }
  };

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <span className="font-mono text-xs font-bold text-ink dark:text-white">
        {parts[0]}
        {parts[1] && <span className="text-[10px] font-normal text-ink-muted">.{parts[1]}</span>}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* 1. TOP ACCOUNTABILITY SUMMARY BANNER */}
      <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-forest dark:text-emerald text-[11px] font-bold">
              <History size={14} />
              <span className="uppercase tracking-wider font-mono">Signature Innovation</span>
            </div>
            <h2 className="text-lg font-bold text-ink dark:text-white tracking-tight">
              Corporate Commitment Ledger
            </h2>
          </div>

          <div className="text-center rounded-xl bg-sage px-3 py-1.5 border border-sage-dark">
            <div className="font-mono text-xl font-bold text-forest">{deliveryRate}%</div>
            <div className="text-[9px] font-mono text-forest uppercase tracking-wider">Delivered</div>
          </div>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed">
          Cross-referencing historical management concall guidance, capex budgets, and store expansion targets against subsequent audited exchange prints.
        </p>

        <div className="grid grid-cols-4 gap-2 border-t border-divider pt-3 text-center text-xs">
          <div>
            <div className="font-mono text-sm font-bold text-ink dark:text-white">{totalCount}</div>
            <span className="text-[10px] text-ink-muted">Pledges</span>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-forest dark:text-emerald">{deliveredCount}</div>
            <span className="text-[10px] text-ink-muted">Fulfilled</span>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-fin-red">{delayedCount}</div>
            <span className="text-[10px] text-ink-muted">Delayed</span>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-ink dark:text-white">{inFlightCount}</div>
            <span className="text-[10px] text-ink-muted">In-Flight</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CHIPS */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Filter commitments by ticker, keyword, capex..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface py-2.5 pl-9 pr-3 text-xs text-ink dark:text-white placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest shadow-subtle"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {statusOptions.map((opt) => {
            const isSelected = selectedStatus === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedStatus(opt.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-forest text-white border-forest shadow-sm'
                    : 'bg-white border-divider text-ink-muted hover:text-ink hover:bg-cream-light'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. COMMITMENT LEDGER LIST */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="font-semibold text-ink dark:text-white">
            Audited Pledges ({filteredItems.length})
          </span>
          <span className="text-[10px]">Tap card for 3-step audit timeline</span>
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-divider bg-white p-6 text-center text-xs text-ink-muted">
              No commitments match the active filter criteria.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="group cursor-pointer rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle hover:border-forest/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {formatTicker(item.ticker)}
                      <span className="text-xs text-ink-muted">{item.companyName}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-ink dark:text-white mt-1 group-hover:text-forest transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  {getStatusBadge(item.status)}
                </div>

                {/* Metric Callout Box */}
                <div className="rounded-xl bg-cream/70 dark:bg-ink-surfaceSubtle p-3 border border-divider space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Promised Target:</span>
                    <span className="font-mono font-bold text-ink dark:text-white">{item.announcedMetric}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Milestone Deadline:</span>
                    <span className="font-mono font-bold text-forest dark:text-emerald">{item.milestoneDeadline}</span>
                  </div>
                </div>

                {/* Facts Summary */}
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                  {item.factsSummary}
                </p>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-divider pt-2 text-[11px] text-ink-muted">
                  <span className="font-mono text-[10px] truncate max-w-[220px]">
                    {item.sourceDoc} • Declared {item.commitmentDate}
                  </span>

                  <span className="flex items-center gap-0.5 text-xs font-semibold text-forest dark:text-emerald group-hover:underline">
                    <span>Audit history</span>
                    <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Detail Drawer */}
      <EventMemoryDetailDrawer
        isOpen={!!activeItem}
        onClose={() => setActiveItem(null)}
        item={activeItem}
        onNavigateToResearch={onNavigateToResearch}
      />
    </div>
  );
};
