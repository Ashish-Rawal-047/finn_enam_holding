import React, { useState } from 'react';
import { EventMemoryItem, CommitmentStatus } from '../../types';
import { Badge } from '../common/Badge';
import { CheckCircle2, Clock, RefreshCw, HelpCircle, History, FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface CommitmentCardProps {
  item: EventMemoryItem;
  onOpenSourceEvidence: (item: EventMemoryItem) => void;
  defaultExpanded?: boolean;
}

export const CommitmentCard: React.FC<CommitmentCardProps> = ({
  item,
  onOpenSourceEvidence,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="emerald" dot>
            <CheckCircle2 size={12} className="mr-0.5 inline" /> Delivered
          </Badge>
        );
      case 'delayed':
        return (
          <Badge variant="rose" dot>
            <Clock size={12} className="mr-0.5 inline" /> Delayed
          </Badge>
        );
      case 'revised':
        return (
          <Badge variant="amber" dot>
            <RefreshCw size={12} className="mr-0.5 inline" /> Revised
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="sky" dot>
            <Clock size={12} className="mr-0.5 inline" /> Tracking / Pending
          </Badge>
        );
      case 'unverified':
      default:
        return (
          <Badge variant="neutral">
            <HelpCircle size={12} className="mr-0.5 inline" /> Unverified
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4 transition-all hover:border-slate-700">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white tracking-tight">
              {item.ticker}
            </span>
            <span className="text-xs text-dark-textMuted font-medium">{item.companyName}</span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-white leading-snug">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {getStatusBadge(item.status)}
        </div>
      </div>

      {/* Target & Deadline Metadata */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-dark-bg p-2.5 border border-dark-borderSubtle text-xs">
        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">Target Metric</span>
          <p className="font-semibold text-white font-mono mt-0.5">{item.announcedMetric}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">Milestone Deadline</span>
          <p className="font-semibold text-teal-400 font-mono mt-0.5">{item.milestoneDeadline}</p>
        </div>
      </div>

      {/* Original Commitment Quote */}
      <div className="mt-3 rounded-lg border-l-2 border-teal-500 bg-teal-950/15 p-2.5 text-xs">
        <div className="flex items-center justify-between text-[10px] font-mono text-teal-400/90 mb-1">
          <span>ORIGINAL PROMISE ({item.commitmentDate})</span>
          <span className="text-slate-400 truncate max-w-[150px]">{item.sourceDoc}</span>
        </div>
        <p className="text-slate-200 italic leading-relaxed">
          {item.sourcePageOrQuote}
        </p>
      </div>

      {/* Distinction: Reported Facts vs. AI Interpretation */}
      <div className="mt-3 space-y-2 text-xs">
        {/* Reported Facts */}
        <div className="rounded-lg bg-dark-bg/80 p-2.5 border border-dark-border">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Audited Corporate Facts & Milestones</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-normal">
            {item.factsSummary}
          </p>
        </div>

        {/* AI Interpretation */}
        <div className="rounded-lg bg-indigo-950/20 p-2.5 border border-indigo-900/40">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono mb-1">
            <Sparkles size={11} className="text-indigo-400" />
            <span>FINN AI Synthesis & Capital Allocation Assessment</span>
          </div>
          <p className="text-indigo-100/90 leading-relaxed font-normal">
            {item.aiInterpretation}
          </p>
        </div>
      </div>

      {/* Expandable Historical Comps & Chronological Timeline */}
      <div className="mt-3 pt-2.5 border-t border-dark-borderSubtle flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{isExpanded ? 'Hide Milestone Timeline & Comps' : `View Progress Timeline (${item.timeline.length} Steps) & Comps`}</span>
        </button>

        <button
          onClick={() => onOpenSourceEvidence(item)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 transition-colors"
        >
          <FileText size={12} />
          <span>Supporting Evidence</span>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3 pt-1 border-t border-dark-borderSubtle">
          {/* Historical Comparables */}
          {item.historicalComps && item.historicalComps.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1.5 flex items-center gap-1">
                <History size={11} /> Historical Precedents & Track Record
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {item.historicalComps.map((comp, idx) => (
                  <div key={idx} className="rounded-lg bg-dark-bg p-2 border border-dark-border">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="font-semibold text-slate-200">{comp.companyOrPeer}</span>
                      <span>{comp.year}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">{comp.pastEvent}</p>
                    <div className="text-[10px] text-teal-400 font-medium mt-1">
                      Result: {comp.outcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Timeline */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Chronological Audit Trail
            </div>
            <div className="space-y-2 border-l border-slate-800 ml-2 pl-3">
              {item.timeline.map((step, idx) => (
                <div key={idx} className="relative text-xs">
                  <div className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-slate-700 border border-slate-900" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-white font-medium">{step.date}</span>
                    <span>{step.sourceDoc}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5 leading-snug">{step.observation}</p>
                  {step.reportedMetric && (
                    <span className="inline-block mt-1 font-mono text-[10px] text-teal-300 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-800/40">
                      {step.reportedMetric}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
