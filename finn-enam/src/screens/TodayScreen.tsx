import React from 'react';
import { Company, TriggeredAlert, EventMemoryItem } from '../types';
import { ArrowUpRight, TrendingUp, TrendingDown, Clock, ShieldCheck, ChevronRight, History } from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface TodayScreenProps {
  companies: Company[];
  triggeredAlerts: TriggeredAlert[];
  eventMemoryItems: EventMemoryItem[];
  onSelectSignal: (alert: TriggeredAlert) => void;
  onNavigateToSignals: () => void;
  onNavigateToMemory: (memoryId?: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  companies,
  triggeredAlerts,
  eventMemoryItems,
  onSelectSignal,
  onNavigateToSignals,
  onNavigateToMemory,
}) => {
  // 1. Data-Driven Focal Insight
  const priorityCount = triggeredAlerts.length;
  const highPriorityAlerts = triggeredAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  );

  // Compute dynamic focal synthesis based on available facts without repeating tickers
  let focalHeadline = "No critical alerts across your watchlist today.";
  let focalExplanation = "Monitored exchange disclosures and end-of-day market movements remain within standard volatility thresholds.";

  if (highPriorityAlerts.length > 0) {
    const uniqueTickers = Array.from(new Set(highPriorityAlerts.map((a) => a.ticker)));
    if (uniqueTickers.length === 1) {
      const top = highPriorityAlerts[0];
      focalHeadline = `${top.ticker} requires immediate review today.`;
      focalExplanation = top.explanation;
    } else {
      focalHeadline = `${uniqueTickers.length} companies require your attention today.`;
      const first = highPriorityAlerts[0];
      const second = highPriorityAlerts.find((a) => a.ticker !== first.ticker) || highPriorityAlerts[1];
      if (second && second.ticker !== first.ticker) {
        focalExplanation = `${first.ticker} recorded an exceptional ${first.triggerMetric} move, while ${second.ticker} crossed threshold criteria with material filings.`;
      } else {
        focalExplanation = `${first.ticker} recorded an extraordinary ${first.triggerMetric} move alongside material exchange disclosures.`;
      }
    }
  }

  // 2. Compact Watchlist Universe Snapshot (Max 3 Metrics)
  const watchlistCount = companies.filter((c) => c.inWatchlist).length;
  const advancingCount = companies.filter((c) => c.changePercent > 0).length;
  const decliningCount = companies.filter((c) => c.changePercent < 0).length;
  const avgChange = (
    companies.reduce((sum, c) => sum + c.changePercent, 0) / (companies.length || 1)
  ).toFixed(2);
  const isAvgPositive = parseFloat(avgChange) >= 0;

  // 3. Top 3 Priority Signals Only (Progressive disclosure: takeaway first)
  const topThreeSignals = triggeredAlerts.slice(0, 3);

  // 4. Single Event Memory Highlight (Signature innovation spotlight)
  const spotlightMemory = eventMemoryItems.find(
    (m) => m.status === 'delivered' || m.status === 'delayed'
  ) || eventMemoryItems[0];

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

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* 1. THE FOCAL POINT (Main Editorial Briefing Insight) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 dark:text-slate-400">
            Wednesday, October 29 • Briefing
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white leading-tight">
          {focalHeadline}
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed max-w-xl font-normal">
          {focalExplanation}
        </p>
      </section>

      {/* 2. RESTRAINED WATCHLIST SNAPSHOT (Max 3 Key Metrics) */}
      <section className="rounded-xl bg-stone-100/70 dark:bg-ink-surfaceSubtle border border-stone-200/70 dark:border-ink-border p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 block">
              Watchlist Universe
            </span>
            <div className="text-sm font-semibold text-stone-900 dark:text-white font-mono mt-0.5">
              {watchlistCount} <span className="text-xs font-normal text-stone-500 dark:text-slate-400">of {companies.length}</span>
            </div>
          </div>

          <div className="border-l border-stone-200 dark:border-ink-border pl-3 sm:pl-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 block">
              Priority Signals
            </span>
            <div className="text-sm font-semibold text-stone-900 dark:text-white font-mono mt-0.5 flex items-center gap-1.5">
              <span>{priorityCount}</span>
              {priorityCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
              )}
            </div>
          </div>

          <div className="border-l border-stone-200 dark:border-ink-border pl-3 sm:pl-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 block">
              Daily Posture
            </span>
            <div className="text-sm font-semibold font-mono mt-0.5 flex items-center gap-1">
              {isAvgPositive ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center">
                  <TrendingUp size={13} className="mr-0.5" /> +{avgChange}%
                </span>
              ) : (
                <span className="text-rose-700 dark:text-rose-400 flex items-center">
                  <TrendingDown size={13} className="mr-0.5" /> {avgChange}%
                </span>
              )}
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-normal ml-0.5">
                ({advancingCount}&uarr; {decliningCount}&darr;)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIORITY SIGNALS (Unified Editorial Stream, Not Identical Cloned Boxes) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold">
              Priority Signals
            </h2>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
              ({topThreeSignals.length} of {triggeredAlerts.length})
            </span>
          </div>

          <button
            onClick={onNavigateToSignals}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
          >
            <span>View all signals</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Unified Editorial List */}
        <div className="rounded-2xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border divide-y divide-stone-100 dark:divide-ink-border overflow-hidden shadow-subtle">
          {topThreeSignals.map((signal) => (
            <div
              key={signal.id}
              onClick={() => onSelectSignal(signal)}
              className="group cursor-pointer p-4 hover:bg-stone-50/70 dark:hover:bg-ink-surfaceSubtle transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {formatTicker(signal.ticker)}
                    <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[140px]">
                      {signal.companyName}
                    </span>
                    <Badge
                      variant={signal.severity === 'critical' ? 'rose' : 'amber'}
                      size="xs"
                    >
                      {signal.triggerMetric}
                    </Badge>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {signal.headline}
                  </h3>

                  <p className="mt-1 text-xs text-stone-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {signal.explanation}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-400 dark:text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {signal.timestamp}
                    </span>
                    <span className="text-teal-700 dark:text-teal-400 font-sans font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Inspect signal &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {topThreeSignals.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
              No active priority signals detected across your watchlist today.
            </div>
          )}
        </div>
      </section>

      {/* 4. EVENT MEMORY PREVIEW (The Distinctive Innovation) */}
      {spotlightMemory && (
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History size={13} className="text-teal-700 dark:text-teal-400" />
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold">
                Event Memory Spotlight
              </h2>
            </div>
            <button
              onClick={() => onNavigateToMemory(spotlightMemory.id)}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
            >
              Explore ledger &rarr;
            </button>
          </div>

          <div
            onClick={() => onNavigateToMemory(spotlightMemory.id)}
            className="group cursor-pointer rounded-2xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-4 shadow-subtle hover:border-teal-600/50 dark:hover:border-teal-500/50 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {formatTicker(spotlightMemory.ticker)}
                  <Badge variant={spotlightMemory.status === 'delivered' ? 'emerald' : 'amber'} size="xs" dot>
                    {spotlightMemory.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {spotlightMemory.title}
                </h3>
              </div>
              <ChevronRight size={16} className="text-stone-400 dark:text-slate-500 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors flex-shrink-0 mt-1" />
            </div>

            <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {spotlightMemory.factsSummary}
            </p>

            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 font-mono border-t border-stone-100 dark:border-ink-border pt-2">
              <span>Goal: {spotlightMemory.milestoneDeadline}</span>
              <span className="text-teal-700 dark:text-teal-400 font-sans font-medium">
                View chronological audit trail &rarr;
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 5. FOOTER ASSURANCE */}
      <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-stone-400 dark:text-slate-500 font-mono">
        <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
        <span>Grounded in primary exchange disclosures & EOD market series</span>
      </div>
    </div>
  );
};
