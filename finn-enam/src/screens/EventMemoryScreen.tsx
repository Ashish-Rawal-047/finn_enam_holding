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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItem, setActiveItem] = useState<EventMemoryItem | null>(() => {
    if (initialActiveId) {
      return memoryItems.find((m) => m.id === initialActiveId) || null;
    }
    return null;
  });

  // Keep activeItem in sync if parent passes a new initialActiveId (e.g. from Today spotlight or Signal link)
  useEffect(() => {
    if (initialActiveId) {
      const match = memoryItems.find((m) => m.id === initialActiveId);
      if (match) {
        setActiveItem(match);
      }
    }
  }, [initialActiveId, memoryItems]);

  const statusOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Status' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'pending', label: 'Tracking' },
    { id: 'delayed', label: 'Delayed' },
  ];

  const categoryOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Domains' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'capex', label: 'Capex' },
    { id: 'margin', label: 'Margin' },
    { id: 'revenue', label: 'Revenue' },
  ];

  const filteredItems = memoryItems.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const deliveredCount = memoryItems.filter((i) => i.status === 'delivered').length;
  const pendingCount = memoryItems.filter((i) => i.status === 'pending').length;
  const delayedCount = memoryItems.filter((i) => i.status === 'delayed').length;

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="emerald" size="xs" dot>Delivered</Badge>;
      case 'delayed':
        return <Badge variant="rose" size="xs" dot>Delayed</Badge>;
      case 'revised':
        return <Badge variant="amber" size="xs" dot>Revised</Badge>;
      case 'pending':
      default:
        return <Badge variant="teal" size="xs" dot>Tracking</Badge>;
    }
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* 1. EDITORIAL TITLE & PROMISE */}
      <section className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-400 font-mono font-semibold">
          <History size={14} />
          <span>FINN Institutional Ledger</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white">
          Event Memory™
        </h1>
        <p className="text-xs text-stone-600 dark:text-slate-300 max-w-lg leading-relaxed">
          Holding corporate management accountable by matching historical promises from concalls and filings against subsequent audited delivery.
        </p>
      </section>

      {/* 2. RESTRAINED PROGRESS STRIP (3 Metrics) */}
      <section className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border p-3.5 shadow-subtle">
        <div className="flex items-center justify-between text-center divide-x divide-stone-200/80 dark:divide-ink-border text-xs">
          <div className="flex-1 px-2">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Commitments</span>
            <span className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5 block">{memoryItems.length}</span>
          </div>
          <div className="flex-1 px-2">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">Delivered on Time</span>
            <span className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5 block">{deliveredCount}</span>
          </div>
          <div className="flex-1 px-2">
            <span className="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 block">Actively Tracked</span>
            <span className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="flex-1 px-2">
            <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block">Delayed / Rescheduled</span>
            <span className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5 block">{delayedCount}</span>
          </div>
        </div>
      </section>

      {/* 3. SEARCH & RESTRAINED FILTERS */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracked commitments by company or target..."
            className="w-full rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border py-2 pl-9 pr-3 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedStatus(opt.id)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                selectedStatus === opt.id
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold'
                  : 'bg-white dark:bg-ink-surface text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-ink-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {categoryOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedCategory(opt.id)}
              className={`rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap text-stone-500 hover:text-stone-800 ${
                selectedCategory === opt.id ? 'font-bold text-stone-900 dark:text-white' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. SCANNABLE COMMITMENT LIST (Not full data tables) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>Showing {filteredItems.length} Tracked Commitments</span>
          <span>Click any item for full audit trail</span>
        </div>

        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="group cursor-pointer rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border p-4 shadow-subtle hover:border-stone-400/80 dark:hover:border-slate-700 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                      {item.ticker}
                    </span>
                    <span className="text-xs text-stone-500 truncate max-w-[150px]">
                      {item.companyName}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-[10px] text-stone-400 font-mono ml-auto">
                      Goal: {item.milestoneDeadline}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {item.title}
                  </h3>

                  <div className="text-xs text-stone-600 dark:text-slate-300 line-clamp-1 pt-0.5">
                    <strong className="text-stone-800 dark:text-slate-200">Metric:</strong> {item.announcedMetric}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono pt-1">
                    <span>Announced: {item.commitmentDate}</span>
                    <span className="text-teal-700 dark:text-teal-400 font-sans font-medium">
                      Inspect {item.timeline.length}-step trail &rarr;
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-2" />
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-200 dark:border-ink-border p-8 text-center text-xs text-stone-500">
              No corporate commitments found matching the filter criteria.
            </div>
          )}
        </div>
      </section>

      {/* Detail Drawer for full chronological timeline */}
      <EventMemoryDetailDrawer
        isOpen={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        item={activeItem}
        onNavigateToResearch={onNavigateToResearch}
      />
    </div>
  );
};
