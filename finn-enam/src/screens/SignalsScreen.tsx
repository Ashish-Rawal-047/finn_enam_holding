import React, { useState } from 'react';
import { Announcement, TriggeredAlert, AlertSettings, AnnouncementCategory } from '../types';
import { Badge } from '../components/common/Badge';
import { SignalDetailDrawer } from '../components/signals/SignalDetailDrawer';
import { SignalFilterDrawer } from '../components/signals/SignalFilterDrawer';
import { SlidersHorizontal, ChevronRight, ChevronDown, ChevronUp, Archive, Flame, TrendingUp, AlertTriangle } from 'lucide-react';

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

  const getAlertIcon = (type: TriggeredAlert['type']) => {
    switch (type) {
      case 'volume_spike': return <Flame size={14} className="text-amber-500" />;
      case 'price_move': return <TrendingUp size={14} className="text-emerald-500" />;
      default: return <AlertTriangle size={14} className="text-rose-500" />;
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            activeFilterCount > 0
              ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white'
              : 'bg-white dark:bg-ink-surface text-stone-700 dark:text-slate-300 border-stone-200/90 dark:border-ink-border hover:border-stone-400'
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>Filter Signals</span>
          {activeFilterCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-teal-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signals by ticker or keyword..."
            className="w-full rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border py-2 px-3 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
          />
        </div>
      </div>

      {/* SECTION 1: NEEDS ATTENTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-ink-border pb-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-stone-800 dark:text-slate-200 font-semibold">
              Needs Attention
            </h2>
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-medium">
              ({needsAttentionList.length + triggeredAlerts.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
            High Severity
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Market Anomaly Triggers */}
          {triggeredAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedSignal(alert)}
              className="group cursor-pointer rounded-xl bg-white dark:bg-ink-surface border-l-4 border-l-rose-500 border border-stone-200/90 dark:border-ink-border p-3.5 shadow-subtle hover:border-stone-400/80 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 dark:bg-ink-surfaceSubtle flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                        {alert.ticker}
                      </span>
                      <Badge variant="rose" size="xs">
                        {alert.triggerMetric}
                      </Badge>
                      <span className="text-[10px] text-stone-400 font-mono ml-auto">
                        {alert.timestamp}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-stone-900 dark:text-white mt-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                      {alert.headline}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                      {alert.explanation}
                    </p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}

          {/* Material Announcements */}
          {needsAttentionList.map((ann) => (
            <div
              key={ann.id}
              onClick={() => setSelectedSignal(ann)}
              className="group cursor-pointer rounded-xl bg-white dark:bg-ink-surface border-l-4 border-l-teal-600 border border-stone-200/90 dark:border-ink-border p-3.5 shadow-subtle hover:border-stone-400/80 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                      {ann.ticker}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(ann.category)} size="xs">
                      {ann.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-stone-400 font-mono ml-auto">
                      {ann.timestamp}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
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
        </div>
      </section>

      {/* SECTION 2: WORTH WATCHING */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-ink-border pb-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-stone-800 dark:text-slate-200 font-semibold">
              Worth Watching
            </h2>
            <span className="text-[11px] font-mono text-stone-500">
              ({worthWatchingList.length})
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
            Moderate Impact
          </span>
        </div>

        <div className="space-y-2.5">
          {worthWatchingList.map((ann) => (
            <div
              key={ann.id}
              onClick={() => setSelectedSignal(ann)}
              className="group cursor-pointer rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-3.5 shadow-subtle hover:border-stone-400/80 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                      {ann.ticker}
                    </span>
                    <Badge variant={getCategoryBadgeVariant(ann.category)} size="xs">
                      {ann.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-stone-400 font-mono ml-auto">
                      {ann.timestamp}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-1">
                    {ann.oneLineTakeaway}
                  </p>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: ROUTINE DISCLOSURES (Collapsed by default) */}
      {routineList.length > 0 && (
        <section className="rounded-xl border border-dashed border-stone-200 dark:border-ink-border bg-stone-50/50 dark:bg-ink-surfaceSubtle/40 p-3.5">
          <button
            onClick={() => setIsRoutineOpen(!isRoutineOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Archive size={14} className="text-stone-400" />
              <div>
                <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                  Routine Disclosures & Paperwork
                </span>
                <span className="text-[11px] text-stone-400 dark:text-slate-500 block">
                  {routineList.length} low-signal statutory forms filed under SEBI regulations
                </span>
              </div>
            </div>
            {isRoutineOpen ? <ChevronUp size={15} className="text-stone-400" /> : <ChevronDown size={15} className="text-stone-400" />}
          </button>

          {isRoutineOpen && (
            <div className="mt-3 divide-y divide-stone-200/60 dark:divide-ink-border border-t border-stone-200/60 dark:border-ink-border pt-2 space-y-2">
              {routineList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedSignal(item)}
                  className="pt-2 cursor-pointer hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span className="font-bold text-stone-800 dark:text-slate-200">{item.ticker}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-slate-300 line-clamp-1 mt-0.5">{item.title}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Dedicated Event-Detail Progressive Disclosure Drawer */}
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
        onResetFilters={() =>
          onChangeSettings({
            ...settings,
            activeDigestWindow: '24h',
            minSeverity: 'all',
          })
        }
      />
    </div>
  );
};
