import React from 'react';
import { Company, TriggeredAlert, EventMemoryItem } from '../types';
import { TrendingUp, TrendingDown, Clock, ChevronRight, History } from 'lucide-react';
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
      focalHeadline = `${uniqueTickers.length} developments deserve your attention today.`;
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
        <span className="font-bold text-ink dark:text-white">{parts[0]}</span>
        {parts[1] && <span className="text-[10px] text-ink-muted">.{parts[1]}</span>}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* 1. THE FOCAL POINT (Main Editorial Briefing Insight) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
            Wednesday, October 29 • Morning Briefing
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink dark:text-white leading-[1.15]">
          {focalHeadline}
        </h1>

        <p className="text-xs sm:text-sm text-ink-muted dark:text-ink-subtle leading-relaxed max-w-xl font-normal">
          {focalExplanation}
        </p>
      </section>

      {/* 2. RESTRAINED WATCHLIST SNAPSHOT (Max 3 Key Metrics) */}
      <section className="rounded-2xl bg-white dark:bg-ink-surface border border-divider dark:border-ink-border p-4 sm:p-5 shadow-subtle">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block">
              Watchlist
            </span>
            <div className="text-sm font-semibold text-ink dark:text-white font-mono mt-0.5">
              {watchlistCount} <span className="text-xs font-normal text-ink-muted">of {companies.length}</span>
            </div>
          </div>

          <div className="border-l border-divider dark:border-ink-border pl-3 sm:pl-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block">
              Signals
            </span>
            <div className="text-sm font-semibold text-ink dark:text-white font-mono mt-0.5 flex items-center gap-1.5">
              <span>{priorityCount}</span>
              {priorityCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              )}
            </div>
          </div>

          <div className="border-l border-divider dark:border-ink-border pl-3 sm:pl-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block">
              Daily Posture
            </span>
            <div className="text-sm font-semibold font-mono mt-0.5 flex items-center gap-1">
              {isAvgPositive ? (
                <span className="text-forest dark:text-emerald font-bold flex items-center">
                  <TrendingUp size={13} className="mr-0.5" /> +{avgChange}%
                </span>
              ) : (
                <span className="text-fin-red font-bold flex items-center">
                  <TrendingDown size={13} className="mr-0.5" /> {avgChange}%
                </span>
              )}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">
                ({advancingCount}&uarr; {decliningCount}&darr;)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIORITY SIGNALS (Unified Editorial Stream) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold">
              Priority Signals
            </h2>
            <span className="text-[10px] text-ink-muted">
              ({topThreeSignals.length} of {triggeredAlerts.length})
            </span>
          </div>

          <button
            onClick={onNavigateToSignals}
            className="group flex items-center gap-1 text-xs font-semibold text-forest dark:text-emerald hover:underline"
          >
            <span>View all signals</span>
            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Editorial Hairline Stream Container */}
        <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface overflow-hidden shadow-subtle divide-y divide-divider/70 dark:divide-ink-border">
          {topThreeSignals.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-muted">
              No priority alerts triggered today.
            </div>
          ) : (
            topThreeSignals.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectSignal(item)}
                className="group relative cursor-pointer p-4 transition-colors hover:bg-cream-light/60 dark:hover:bg-ink-surfaceSubtle/60"
              >
                {/* Top Row: Ticker, Name, Metric Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    {formatTicker(item.ticker)}
                    <span className="text-xs text-ink-muted truncate max-w-[150px] sm:max-w-[220px]">
                      {item.companyName}
                    </span>
                  </div>

                  <Badge
                    variant={item.type === 'price_move' || item.type === 'volume_spike' ? 'amber' : 'forest'}
                    size="sm"
                  >
                    {item.triggerMetric}
                  </Badge>
                </div>

                {/* Second Row: Concise Editorial Headline */}
                <h3 className="mt-1 text-sm font-semibold tracking-tight text-ink dark:text-white line-clamp-1 group-hover:text-forest transition-colors">
                  {item.headline}
                </h3>

                {/* Third Row: 1-line Takeaway */}
                <p className="mt-1 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {item.explanation}
                </p>

                {/* Bottom Row: Timestamp and Inspect Chevrons */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Clock size={11} className="text-ink-muted" />
                    {item.timestamp}
                  </span>

                  <span className="flex items-center gap-0.5 text-xs font-semibold text-forest dark:text-emerald group-hover:underline">
                    <span>Inspect details</span>
                    <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. EVENT MEMORY SPOTLIGHT */}
      {spotlightMemory && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-forest dark:bg-emerald" />
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold">
                Event Memory Spotlight
              </h2>
            </div>
            <button
              onClick={() => onNavigateToMemory()}
              className="text-xs font-semibold text-forest dark:text-emerald hover:underline flex items-center gap-1"
            >
              <span>Commitment ledger</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div
            onClick={() => onNavigateToMemory(spotlightMemory.id)}
            className="group cursor-pointer rounded-2xl bg-sage/40 dark:bg-ink-surfaceSubtle border border-divider dark:border-ink-border p-4 transition-all hover:border-forest/40 shadow-subtle"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {formatTicker(spotlightMemory.ticker)}
                  <span className="text-xs text-ink-muted">
                    {spotlightMemory.companyName}
                  </span>
                  <Badge variant="forest" size="sm" dot>
                    {spotlightMemory.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="text-xs sm:text-sm font-semibold text-ink dark:text-white group-hover:text-forest transition-colors">
                  {spotlightMemory.title}
                </h3>
              </div>

              <div className="shrink-0 rounded-full bg-white dark:bg-ink-surface p-1.5 text-forest dark:text-emerald border border-divider">
                <History size={15} />
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-2">
              {spotlightMemory.factsSummary}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-divider pt-2 text-[11px]">
              <span className="font-mono text-[10px] text-ink-muted">
                Declared: {spotlightMemory.commitmentDate} • Milestone: {spotlightMemory.milestoneDeadline}
              </span>
              <span className="text-xs font-semibold text-forest dark:text-emerald group-hover:underline flex items-center gap-0.5">
                <span>Audit trail</span>
                <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
