import React from 'react';
import { EventMemoryItem, CommitmentStatus } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { History, ShieldCheck, Sparkles } from 'lucide-react';

interface EventMemoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: EventMemoryItem | null;
  onNavigateToResearch: (ticker: string) => void;
}

export const EventMemoryDetailDrawer: React.FC<EventMemoryDetailDrawerProps> = ({
  isOpen,
  onClose,
  item,
  onNavigateToResearch,
}) => {
  if (!item) return null;

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="emerald" dot>Delivered</Badge>;
      case 'delayed':
        return <Badge variant="rose" dot>Delayed</Badge>;
      case 'revised':
        return <Badge variant="amber" dot>Revised</Badge>;
      case 'pending':
      default:
        return <Badge variant="teal" dot>Tracking / In Progress</Badge>;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      subtitle={`${item.ticker} • ${item.companyName} • Announced: ${item.commitmentDate}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onNavigateToResearch(item.ticker);
            }}
            className="flex-1 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-stone-900 py-2.5 px-4 text-xs font-semibold transition-colors text-center"
          >
            Investigate {item.ticker} Fundamentals &rarr;
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* TOP PARAMETERS */}
        <div className="rounded-xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
              Target Milestone: {item.announcedMetric}
            </span>
            {getStatusBadge(item.status)}
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            Committed Deadline: <strong className="text-stone-800 dark:text-slate-200">{item.milestoneDeadline}</strong>
          </div>
        </div>

        {/* VERBATIM ORIGINAL COMMITMENT */}
        <div className="rounded-xl border-l-4 border-l-teal-600 border border-stone-200/80 dark:border-ink-border bg-white dark:bg-ink-surface p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-teal-800 dark:text-teal-400">
            <span>Original Management Promise ({item.commitmentDate})</span>
            <span className="text-stone-400">{item.sourceDoc}</span>
          </div>
          <p className="text-xs text-stone-800 dark:text-slate-200 italic leading-relaxed">
            {item.sourcePageOrQuote}
          </p>
        </div>

        {/* CHRONOLOGICAL PROGRESSION AUDIT TRAIL */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-slate-200">
            <span className="font-mono uppercase text-[10px] tracking-wider text-stone-500">
              Chronological Audit Trail ({item.timeline.length} Observations)
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">Verified Disclosures</span>
          </div>

          <div className="relative pl-4 border-l-2 border-stone-200 dark:border-ink-border ml-2 space-y-3">
            {item.timeline.map((obs, idx) => (
              <div key={idx} className="relative text-xs space-y-0.5">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400 border-2 border-white dark:border-ink-surface" />
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                  <span className="font-semibold text-stone-700 dark:text-slate-300">{obs.date}</span>
                  <span className="truncate max-w-[160px]">{obs.sourceDoc}</span>
                </div>
                <p className="text-xs text-stone-800 dark:text-slate-200 leading-snug">
                  {obs.observation}
                </p>
                {obs.reportedMetric && (
                  <span className="inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300">
                    Disclosed: {obs.reportedMetric}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FACT VS AI SYNTHESIS SEPARATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="rounded-xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-stone-600 dark:text-slate-400">
              <ShieldCheck size={13} className="text-emerald-600" />
              Audited Facts
            </div>
            <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
              {item.factsSummary}
            </p>
          </div>

          <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-teal-800 dark:text-teal-400">
              <Sparkles size={13} className="text-teal-600" />
              FINN Capital Allocation Assessment
            </div>
            <p className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              {item.aiInterpretation}
            </p>
          </div>
        </div>

        {/* HISTORICAL PRECEDENTS & COMPARABLES */}
        {item.historicalComps && item.historicalComps.length > 0 && (
          <div className="rounded-xl border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <History size={13} />
              Historical Corporate Precedent
            </div>
            <div className="space-y-1.5 text-xs">
              {item.historicalComps.map((comp, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span className="font-bold text-stone-800 dark:text-slate-200">{comp.companyOrPeer}</span>
                    <span>{comp.year}</span>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-slate-300 mt-0.5">{comp.pastEvent}</p>
                  <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400 mt-1">
                    Recorded Result: {comp.outcome}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
