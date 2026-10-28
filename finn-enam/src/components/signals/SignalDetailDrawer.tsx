import React, { useState } from 'react';
import { Announcement, TriggeredAlert, QuarterlyResults, ManagementChange } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { ExternalLink, FileText, History, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface SignalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  signal: TriggeredAlert | Announcement | null;
  onNavigateToResearch: (ticker: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
}

export const SignalDetailDrawer: React.FC<SignalDetailDrawerProps> = ({
  isOpen,
  onClose,
  signal,
  onNavigateToResearch,
  onNavigateToMemory,
}) => {
  const [showFullEvidence, setShowFullEvidence] = useState<boolean>(false);

  if (!signal) return null;

  // Determine if it's an Announcement or TriggeredAlert
  const isAnnouncement = 'category' in signal;
  const ticker = signal.ticker;
  const companyName = signal.companyName;
  const headline = 'title' in signal ? signal.title : signal.headline;
  const takeaway = 'oneLineTakeaway' in signal ? signal.oneLineTakeaway : signal.explanation;
  const whyItMatters = 'whyItMatters' in signal ? signal.whyItMatters : 'Breached configured anomaly sensitivity threshold.';
  const timestamp = signal.timestamp;
  const quarterlyResults: QuarterlyResults | undefined = isAnnouncement ? signal.quarterlyResults : undefined;
  const managementChange: ManagementChange | undefined = isAnnouncement ? signal.managementChange : undefined;
  const eventMemoryId: string | undefined = isAnnouncement ? signal.eventMemoryId : undefined;
  const sourceDocTitle = isAnnouncement ? signal.sourceDocTitle : 'NSE / BSE End-of-Day Official Market Close Feed';
  const sourceUrl = isAnnouncement ? signal.sourceUrl : 'https://www.nseindia.com';

  const formatDelta = (val: number, isBps = false) => {
    const isPos = val >= 0;
    const sign = isPos ? '+' : '';
    const unit = isBps ? ' bps' : '%';
    return (
      <span className={`font-mono text-xs font-semibold ${isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
        {sign}{val.toFixed(1)}{unit}
      </span>
    );
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={headline}
      subtitle={`${ticker} • ${companyName} • ${timestamp}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => {
              onClose();
              onNavigateToResearch(ticker);
            }}
            className="flex-1 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-stone-900 py-2.5 px-4 text-xs font-semibold transition-colors text-center"
          >
            Investigate {ticker} in Research Workspace &rarr;
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* PROGRESSIVE DISCLOSURE: LAYER 1 - CORE TAKEAWAY */}
        <div className="rounded-xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400">
            Executive Summary
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-white leading-relaxed">
            {takeaway}
          </p>
          <div className="text-xs text-stone-600 dark:text-slate-300 pt-1 border-t border-stone-200/60 dark:border-ink-border leading-relaxed">
            <strong className="text-stone-800 dark:text-slate-200">Relevance:</strong> {whyItMatters}
          </div>
        </div>

        {/* PROGRESSIVE DISCLOSURE: LAYER 2 - SPECIALIZED CONTENT */}
        {/* A. Quarterly Financial Results Table */}
        {quarterlyResults && (
          <div className="rounded-xl border border-stone-200/90 dark:border-ink-border bg-white dark:bg-ink-surface p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-ink-border pb-2">
              <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                {quarterlyResults.quarter} Audited Headline Metrics
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                EBITDA Margin: <strong className="text-stone-900 dark:text-white">{quarterlyResults.ebitdaMargin.toFixed(1)}%</strong> ({formatDelta(quarterlyResults.ebitdaMarginChangeBps, true)})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <div className="text-[10px] text-stone-500 font-mono">Revenue</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5">
                  ₹{quarterlyResults.revenue.toLocaleString('en-IN')} Cr
                </div>
                <div className="text-[10px] text-stone-500 mt-1 flex justify-between">
                  <span>YoY:</span> {formatDelta(quarterlyResults.revenueYoY)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <div className="text-[10px] text-stone-500 font-mono">EBITDA</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5">
                  ₹{quarterlyResults.ebitda.toLocaleString('en-IN')} Cr
                </div>
                <div className="text-[10px] text-stone-500 mt-1 flex justify-between">
                  <span>YoY:</span> {formatDelta(quarterlyResults.ebitdaYoY)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <div className="text-[10px] text-stone-500 font-mono">PBT</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5">
                  ₹{quarterlyResults.pbt.toLocaleString('en-IN')} Cr
                </div>
                <div className="text-[10px] text-stone-500 mt-1 flex justify-between">
                  <span>YoY:</span> {formatDelta(quarterlyResults.pbtYoY)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <div className="text-[10px] text-stone-500 font-mono">PAT</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono mt-0.5">
                  ₹{quarterlyResults.pat.toLocaleString('en-IN')} Cr
                </div>
                <div className="text-[10px] text-stone-500 mt-1 flex justify-between">
                  <span>YoY:</span> {formatDelta(quarterlyResults.patYoY)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B. Executive Dossier */}
        {managementChange && managementChange.incomingBio && (
          <div className="rounded-xl border border-stone-200/90 dark:border-ink-border bg-white dark:bg-ink-surface p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-stone-100 dark:border-ink-border pb-2">
              <UserCheck size={14} className="text-teal-700 dark:text-teal-400" />
              <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                Executive Transition: {managementChange.role}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                  {managementChange.personName}
                </h4>
                <Badge variant="teal" size="xs">
                  {managementChange.direction}
                </Badge>
              </div>
              <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                {managementChange.incomingBio.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <span className="text-stone-400 block font-mono text-[10px]">Previous Appointment</span>
                <span className="font-semibold text-stone-800 dark:text-slate-200">{managementChange.incomingBio.previousRole}</span>
              </div>
              <div className="p-2 rounded bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                <span className="text-stone-400 block font-mono text-[10px]">Track Record</span>
                <span className="font-semibold text-stone-800 dark:text-slate-200">{managementChange.incomingBio.tenureYears}+ Years Tenure</span>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: LAYER 3 - EVENT MEMORY LINK */}
        {eventMemoryId && onNavigateToMemory && (
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={15} className="text-teal-700 dark:text-teal-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-stone-900 dark:text-white block text-xs">
                  Linked Corporate Commitment
                </span>
                <span className="text-[11px] text-teal-800 dark:text-teal-300">
                  This filing updates a tracked historical management target in Event Memory.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateToMemory(eventMemoryId);
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-400 flex-shrink-0 ml-2"
            >
              View History &rarr;
            </button>
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: LAYER 4 - PRIMARY SOURCE EVIDENCE */}
        <div className="rounded-xl border border-stone-200/80 dark:border-ink-border p-3 space-y-2">
          <button
            onClick={() => setShowFullEvidence(!showFullEvidence)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold text-stone-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-1.5">
              <FileText size={13} className="text-stone-500" />
              <span>Primary Source Disclosure Reference</span>
            </span>
            {showFullEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFullEvidence && (
            <div className="pt-2 border-t border-stone-100 dark:border-ink-border text-xs space-y-2">
              <div className="font-medium text-stone-800 dark:text-slate-200">
                {sourceDocTitle}
              </div>
              <div className="flex items-center justify-between pt-1">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline text-[11px] font-mono"
                >
                  <span>Open Official Exchange PDF</span>
                  <ExternalLink size={10} />
                </a>
                <span className="text-[10px] text-stone-400 font-mono">
                  Verified Primary Grounding
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
