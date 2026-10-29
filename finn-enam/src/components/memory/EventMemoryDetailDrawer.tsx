import React from 'react';
import { EventMemoryItem, CommitmentStatus } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { ShieldCheck, Sparkles } from 'lucide-react';

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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      subtitle={`${item.ticker} • ${item.companyName} • Declared: ${item.commitmentDate}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onNavigateToResearch(item.ticker);
            }}
            className="flex-1 rounded-xl bg-forest hover:bg-forest-light text-white py-2.5 px-4 text-xs font-semibold transition-colors text-center shadow-sm"
          >
            Investigate {item.ticker} Fundamentals &rarr;
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-ink dark:text-ink-light">
        {/* TOP PARAMETERS */}
        <div className="rounded-xl bg-cream/70 dark:bg-ink-surfaceSubtle border border-divider p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-ink dark:text-white">
              Target Milestone: {item.announcedMetric}
            </span>
            {getStatusBadge(item.status)}
          </div>
          <div className="text-[11px] text-ink-muted font-mono">
            Committed Deadline: <strong className="text-forest dark:text-emerald">{item.milestoneDeadline}</strong>
          </div>
        </div>

        {/* VERBATIM MANAGEMENT COMMITMENT */}
        <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2 shadow-subtle">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
            Verbatim Management Guidance
          </div>
          <blockquote className="border-l-2 border-forest pl-3 text-xs italic text-ink dark:text-white leading-relaxed">
            {item.sourcePageOrQuote}
          </blockquote>
          <div className="text-[10px] font-mono text-ink-muted pt-1">
            Citation: {item.sourceDoc}
          </div>
        </div>

        {/* 3-STEP CHRONOLOGICAL AUDIT TIMELINE */}
        <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-3 shadow-subtle">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
            Chronological Verification Chain
          </div>

          <div className="space-y-3 pl-2">
            {item.timeline.map((step, idx) => (
              <div key={idx} className="relative pl-5 border-l-2 border-divider pb-2 last:pb-0">
                <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-forest dark:bg-emerald" />
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-ink dark:text-white">{step.date}</span>
                  {step.reportedMetric && (
                    <Badge variant="sage" size="sm">
                      {step.reportedMetric}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                  {step.observation}
                </p>
                <div className="text-[10px] font-mono text-ink-muted mt-1">
                  Source: {step.sourceDoc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FACTUAL SUMMARY VS AI INTERPRETATION */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-1.5 shadow-subtle">
            <div className="flex items-center gap-1.5 font-bold text-ink dark:text-white text-xs">
              <ShieldCheck size={14} className="text-forest" />
              <span>Audited Delivery Facts</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {item.factsSummary}
            </p>
          </div>

          <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-1.5 shadow-subtle">
            <div className="flex items-center gap-1.5 font-bold text-forest dark:text-emerald text-xs">
              <Sparkles size={14} />
              <span>Capital Allocation Assessment</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {item.aiInterpretation}
            </p>
          </div>
        </div>

        {/* HISTORICAL COMPARABLE PRECEDENTS */}
        {item.historicalComps && item.historicalComps.length > 0 && (
          <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2 shadow-subtle">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
              Historical Peer Comparisons
            </div>
            <div className="space-y-1.5">
              {item.historicalComps.map((comp, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-cream/50 border border-divider">
                  <div>
                    <span className="font-bold text-ink dark:text-white mr-1.5">{comp.companyOrPeer}</span>
                    <span className="text-ink-muted">({comp.year})</span>
                    <div className="text-[11px] text-ink-muted mt-0.5">{comp.pastEvent}</div>
                  </div>
                  <Badge variant="sage" size="sm">
                    {comp.outcome}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
