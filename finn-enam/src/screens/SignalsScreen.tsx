import React, { useState } from 'react';
import { Announcement, TriggeredAlert, AlertSettings, AnnouncementCategory } from '../types';
import { Badge } from '../components/common/Badge';
import { SignalDetailDrawer } from '../components/signals/SignalDetailDrawer';
import { SignalFilterDrawer } from '../components/signals/SignalFilterDrawer';
import { SlidersHorizontal, ChevronRight, ChevronDown, ChevronUp, Archive, Search } from 'lucide-react';

interface SignalsScreenProps {
  announcements: Announcement[];
  triggeredAlerts: TriggeredAlert[];
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  onNavigateToResearch: (ticker: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
}

export const SignalsScreen: React.FC<SignalsScreenProps> = ({
  announcements,
  triggeredAlerts,
  settings,
  onChangeSettings,
  onNavigateToResearch,
  onNavigateToMemory,
}) => {
  const [selectedSignal, setSelectedSignal] = useState<Announcement | TriggeredAlert | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isRoutineOpen, setIsRoutineOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Count active non-default filters
  let activeFilterCount = 0;
  if (settings.activeDigestWindow !== '24h') activeFilterCount++;
  if (settings.minSeverity !== 'all') activeFilterCount++;
  const enabledCatCount = Object.values(settings.enabledCategories).filter(Boolean).length;
  if (enabledCatCount < 17) activeFilterCount++;

  // Reset all filters to default
  const handleResetFilters = () => {
    const allCategories = Object.keys(settings.enabledCategories).reduce((acc, cat) => {
      acc[cat as AnnouncementCategory] = true;
      return acc;
    }, {} as Record<AnnouncementCategory, boolean>);

    onChangeSettings({
      ...settings,
      activeDigestWindow: '24h',
      minSeverity: 'all',
      enabledCategories: allCategories,
    });
  };

  // Helper to split ticker into clean symbol and suffix
  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <span className="font-mono text-xs">
        <span className="font-bold text-stone-900 dark:text-white">{parts[0]}</span>
        {parts[1] && <span className="text-[10px] text-stone-400 dark:text-slate-500">.{parts[1]}</span>}
      </span>
    );
  };

  // Filter announcements based on settings
  const filteredAnnouncements = announcements.filter((ann) => {
    // Window filter
    if (settings.activeDigestWindow === '24h' && (ann.timestamp.includes('2d') || ann.timestamp.includes('3d') || ann.timestamp.includes('4d'))) {
      return false;
    }
    if (settings.activeDigestWindow === '48h' && (ann.timestamp.includes('3d') || ann.timestamp.includes('4d'))) {
      return false;
    }

    // Category filter
    if (!settings.enabledCategories[ann.category]) {
      return false;
    }

    // Severity filter
    if (settings.minSeverity === 'high_only' && (ann.severity === 'normal' || ann.severity === 'routine')) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = ann.ticker.toLowerCase().includes(q) || ann.title.toLowerCase().includes(q) || ann.companyName.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Filter market anomaly alerts by search query
  const filteredAlerts = triggeredAlerts.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.ticker.toLowerCase().includes(q) || a.headline.toLowerCase().includes(q) || a.companyName.toLowerCase().includes(q);
  });

  // Grouping into 3 calm categories:
  // 1. Needs Attention (critical severity, results, major price/volume breaks)
  const needsAttentionList = filteredAnnouncements.filter((a) => a.severity === 'critical');
  // 2. Worth Watching (high/normal non-routine filings)
  const worthWatchingList = filteredAnnouncements.filter((a) => !a.isRoutine && a.severity !== 'critical');
  // 3. Routine Disclosures (routine paperwork)
  const routineList = filteredAnnouncements.filter((a) => a.isRoutine);

  const getCategoryBadgeVariant = (cat: AnnouncementCategory) => {
    switch (cat) {
      case 'results': return 'emerald';
      case 'capex':
      case 'M&A': return 'teal';
      case 'management_change': return 'sky';
      case 'litigation': return 'rose';
      case 'fund_raise': return 'amber';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Editorial Title & Context */}
      <section className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white">
          Signals
        </h1>
        <p className="text-xs text-stone-600 dark:text-slate-300 max-w-lg leading-relaxed">
          Proactively surfacing material company disclosures and verified market anomalies while filtering out administrative paperwork.
        </p>
      </section>

      {/* Compact Filter & Search Bar */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setIsFilterDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 transition-colors flex-shrink-0"
        >
          <SlidersHorizontal size={13} />
          <span>Filter Signals</span>
          {activeFilterCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-teal-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signals by ticker or keyword..."
            className="w-full rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border py-2 pl-9 pr-3 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
          />
        </div>
      </div>

      {/* SECTION 1: NEEDS ATTENTION */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-ink-border pb-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-stone-800 dark:text-slate-200 font-semibold">
              Needs Attention
            </h2>
            <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400">
              ({filteredAlerts.length + needsAttentionList.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
            High Severity
          </span>
        </div>

        {/* Unified Editorial Container */}
        <div className="rounded-2xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border divide-y divide-stone-100 dark:divide-ink-border overflow-hidden shadow-subtle">
          {/* A. Market Anomaly Triggers */}
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedSignal(alert)}
              className="group cursor-pointer p-4 hover:bg-stone-50/70 dark:hover:bg-ink-surfaceSubtle transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {formatTicker(alert.ticker)}
                    <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[140px]">
                      {alert.companyName}
                    </span>
                    <Badge variant={alert.severity === 'critical' ? 'rose' : 'amber'} size="xs">
                      {alert.triggerMetric}
                    </Badge>
                    <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono ml-auto">
                      {alert.timestamp}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white mt-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {alert.headline}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {alert.explanation}
                  </p>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}

          {/* B. Material Corporate Announcements */}
          {needsAttentionList.map((ann) => (
            <div
              key={ann.id}
              onClick={() => setSelectedSignal(ann)}
              className="group cursor-pointer p-4 hover:bg-stone-50/70 dark:hover:bg-ink-surfaceSubtle transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {formatTicker(ann.ticker)}
                    <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[140px]">
                      {ann.companyName}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(ann.category)} size="xs">
                      {ann.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono ml-auto">
                      {ann.timestamp}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {ann.oneLineTakeaway}
                  </p>

                  {/* Micro-Table Preview for Quarterly Results */}
                  {ann.quarterlyResults && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] font-mono text-stone-600 dark:text-slate-300 bg-stone-50 dark:bg-ink-bg p-2 rounded-lg border border-stone-100 dark:border-ink-borderSubtle">
                      <span>Rev: <strong>₹{ann.quarterlyResults.revenue.toLocaleString()} Cr</strong> (+{ann.quarterlyResults.revenueYoY}% YoY)</span>
                      <span className="text-stone-300 dark:text-slate-600">•</span>
                      <span>EBITDA Margin: <strong>{ann.quarterlyResults.ebitdaMargin}%</strong> (+{ann.quarterlyResults.ebitdaMarginChangeBps} bps)</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && needsAttentionList.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
              No high-severity signals currently detected.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: WORTH WATCHING */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-ink-border pb-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-stone-800 dark:text-slate-200 font-semibold">
              Worth Watching
            </h2>
            <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400">
              ({worthWatchingList.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
            Moderate Impact
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border divide-y divide-stone-100 dark:divide-ink-border overflow-hidden shadow-subtle">
          {worthWatchingList.map((ann) => (
            <div
              key={ann.id}
              onClick={() => setSelectedSignal(ann)}
              className="group cursor-pointer p-4 hover:bg-stone-50/70 dark:hover:bg-ink-surfaceSubtle transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {formatTicker(ann.ticker)}
                    <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[140px]">
                      {ann.companyName}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(ann.category)} size="xs">
                      {ann.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono ml-auto">
                      {ann.timestamp}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {ann.oneLineTakeaway}
                  </p>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}

          {worthWatchingList.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
              No moderate-impact signals in the selected digest window.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: ROUTINE DISCLOSURES (Collapsible Clean Drawer) */}
      <section className="rounded-2xl bg-stone-50/80 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2">
        <button
          onClick={() => setIsRoutineOpen(!isRoutineOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Archive size={14} className="text-stone-400" />
            <span className="text-xs font-semibold text-stone-700 dark:text-slate-300">
              Routine Compliance Disclosures
            </span>
            <span className="text-[10px] font-mono text-stone-400 dark:text-slate-500">
              ({routineList.length} filings safely stowed)
            </span>
          </div>
          {isRoutineOpen ? <ChevronUp size={15} className="text-stone-400" /> : <ChevronDown size={15} className="text-stone-400" />}
        </button>

        {isRoutineOpen && (
          <div className="pt-2 border-t border-stone-200/60 dark:border-ink-border divide-y divide-stone-100 dark:divide-ink-border">
            {routineList.map((ann) => (
              <div
                key={ann.id}
                onClick={() => setSelectedSignal(ann)}
                className="py-2.5 cursor-pointer hover:bg-stone-100/50 dark:hover:bg-ink-surface px-1.5 rounded transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {formatTicker(ann.ticker)}
                    <span className="text-stone-500 dark:text-slate-400 text-[11px] truncate max-w-[200px]">
                      {ann.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {ann.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Signal Detail Progressive Disclosure Drawer */}
      <SignalDetailDrawer
        isOpen={Boolean(selectedSignal)}
        onClose={() => setSelectedSignal(null)}
        signal={selectedSignal}
        onNavigateToResearch={onNavigateToResearch}
        onNavigateToMemory={onNavigateToMemory}
      />

      {/* Filter Bottom Sheet */}
      <SignalFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        settings={settings}
        onChangeSettings={onChangeSettings}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
};
