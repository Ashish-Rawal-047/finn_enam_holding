import React, { useState, useMemo } from 'react';
import { Announcement, TriggeredAlert, AlertSettings } from '../types';
import { CATEGORY_LABELS } from '../data/alertSettings';
import { Badge } from '../components/common/Badge';
import { Search, Sliders, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface SignalsScreenProps {
  announcements: Announcement[];
  triggeredAlerts: TriggeredAlert[];
  settings: AlertSettings;
  onOpenSettings: () => void;
  onSelectSignal: (item: Announcement | TriggeredAlert) => void;
}

export const SignalsScreen: React.FC<SignalsScreenProps> = ({
  announcements,
  triggeredAlerts,
  settings,
  onOpenSettings,
  onSelectSignal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoutineOpen, setIsRoutineOpen] = useState(false);

  // Filter announcements according to settings & search
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      // Category filter check
      if (settings.enabledCategories[ann.category] === false) return false;

      // Severity check
      if (settings.minSeverity === 'critical_only' && ann.severity !== 'critical') return false;
      if (
        settings.minSeverity === 'high_only' &&
        ann.severity !== 'critical' &&
        ann.severity !== 'high'
      )
        return false;

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          ann.ticker.toLowerCase().includes(q) ||
          ann.companyName.toLowerCase().includes(q) ||
          ann.title.toLowerCase().includes(q) ||
          ann.oneLineTakeaway.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [announcements, settings, searchQuery]);

  // Combine triggered alerts matching search
  const filteredAlerts = useMemo(() => {
    return triggeredAlerts.filter((alert) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          alert.ticker.toLowerCase().includes(q) ||
          alert.companyName.toLowerCase().includes(q) ||
          alert.headline.toLowerCase().includes(q) ||
          alert.explanation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [triggeredAlerts, searchQuery]);

  // 3-Tier Categorization
  const needsAttention = useMemo(() => {
    const criticalAnnouncements = filteredAnnouncements.filter(
      (a) => a.severity === 'critical' || a.severity === 'high'
    );
    const criticalAlerts = filteredAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'high'
    );
    return [...criticalAlerts, ...criticalAnnouncements];
  }, [filteredAnnouncements, filteredAlerts]);

  const worthWatching = useMemo(() => {
    const mediumAnnouncements = filteredAnnouncements.filter(
      (a) => a.severity === 'normal' && !a.isRoutine
    );
    const mediumAlerts = filteredAlerts.filter((a) => a.severity === 'medium');
    return [...mediumAlerts, ...mediumAnnouncements];
  }, [filteredAnnouncements, filteredAlerts]);

  const routineCompliance = useMemo(() => {
    return filteredAnnouncements.filter(
      (a) => a.isRoutine || a.severity === 'routine'
    );
  }, [filteredAnnouncements]);

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <span className="font-mono text-xs">
        <span className="font-bold text-ink dark:text-white">{parts[0]}</span>
        {parts[1] && <span className="text-[10px] text-ink-muted">.{parts[1]}</span>}
      </span>
    );
  };

  const renderSignalRow = (item: Announcement | TriggeredAlert) => {
    const isAlert = 'triggerMetric' in item;
    const ticker = item.ticker;
    const companyName = item.companyName;
    const headline = isAlert ? item.headline : item.title;
    const takeaway = isAlert ? item.explanation : item.oneLineTakeaway;
    const time = item.timestamp;
    const categoryLabel = !isAlert ? CATEGORY_LABELS[item.category]?.label || item.category : item.triggerMetric;

    return (
      <div
        key={item.id}
        onClick={() => onSelectSignal(item)}
        className="group relative cursor-pointer p-4 transition-colors hover:bg-cream-light/60 dark:hover:bg-ink-surfaceSubtle/60"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            {formatTicker(ticker)}
            <span className="text-xs text-ink-muted truncate max-w-[150px] sm:max-w-[220px]">
              {companyName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isAlert ? 'amber' : item.severity === 'critical' ? 'red' : item.severity === 'high' ? 'forest' : 'sage'}
              size="sm"
            >
              {categoryLabel}
            </Badge>
            <span className="font-mono text-[10px] text-ink-muted hidden sm:inline">
              {time}
            </span>
          </div>
        </div>

        <h3 className="mt-1 text-sm font-semibold tracking-tight text-ink dark:text-white line-clamp-1 group-hover:text-forest transition-colors">
          {headline}
        </h3>

        <p className="mt-1 text-xs text-ink-muted line-clamp-2 leading-relaxed">
          {takeaway}
        </p>

        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <span className="font-mono text-[10px] text-ink-muted sm:hidden">
            {time}
          </span>
          <span className="hidden sm:inline" />

          <span className="flex items-center gap-0.5 text-xs font-semibold text-forest dark:text-emerald group-hover:underline">
            <span>Inspect</span>
            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Search & Threshold Filter Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search signals, tickers, catalysts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface py-2.5 pl-9 pr-3 text-xs text-ink dark:text-white placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest shadow-subtle"
          />
        </div>

        <button
          onClick={onOpenSettings}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface px-3 text-xs font-medium text-ink hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle shadow-subtle transition-colors"
        >
          <Sliders size={14} className="text-forest" />
          <span className="hidden sm:inline">Thresholds</span>
        </button>
      </div>

      {/* Scope / Context Pill */}
      <div className="text-[11px] text-ink-muted">
        Window: <span className="font-bold text-ink dark:text-white">{settings.activeDigestWindow.toUpperCase()}</span> • Monitored Universe: <span className="font-bold text-ink dark:text-white">18 Equities</span>
      </div>

      {/* TIER 1: NEEDS ATTENTION */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-fin-red" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Needs Attention
            </h2>
            <Badge variant="red" size="sm">
              {needsAttention.length}
            </Badge>
          </div>
          <span className="text-[10px] text-ink-muted">Immediate review</span>
        </div>

        <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-subtle divide-y divide-divider/70 dark:divide-ink-border">
          {needsAttention.length === 0 ? (
            <div className="p-5 text-center text-xs text-ink-muted">
              No critical alerts or material guidance breaches.
            </div>
          ) : (
            needsAttention.map((item) => renderSignalRow(item))
          )}
        </div>
      </section>

      {/* TIER 2: WORTH WATCHING */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-fin-amber" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Worth Watching
            </h2>
            <Badge variant="sage" size="sm">
              {worthWatching.length}
            </Badge>
          </div>
          <span className="text-[10px] text-ink-muted">Operational catalysts</span>
        </div>

        <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-subtle divide-y divide-divider/70 dark:divide-ink-border">
          {worthWatching.length === 0 ? (
            <div className="p-5 text-center text-xs text-ink-muted">
              No medium-priority operational updates matching criteria.
            </div>
          ) : (
            worthWatching.map((item) => renderSignalRow(item))
          )}
        </div>
      </section>

      {/* TIER 3: ROUTINE COMPLIANCE (COLLAPSIBLE DRAWER) */}
      <section className="space-y-2">
        <div
          onClick={() => setIsRoutineOpen(!isRoutineOpen)}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-divider bg-white dark:bg-ink-surface px-4 py-3 text-xs shadow-subtle hover:bg-cream-light/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-ink-muted" />
            <span className="font-semibold text-ink dark:text-white">
              Routine Compliance ({routineCompliance.length})
            </span>
            <span className="text-[10px] text-ink-muted">
              Secretarial filings stowed away
            </span>
          </div>

          <button className="flex items-center gap-1 text-xs font-semibold text-forest dark:text-emerald">
            <span>{isRoutineOpen ? 'Collapse' : 'Expand'}</span>
            {isRoutineOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isRoutineOpen && (
          <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-subtle divide-y divide-divider/70 dark:divide-ink-border">
            {routineCompliance.length === 0 ? (
              <div className="p-5 text-center text-xs text-ink-muted">
                No routine administrative disclosures in this cycle.
              </div>
            ) : (
              routineCompliance.map((item) => renderSignalRow(item))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
