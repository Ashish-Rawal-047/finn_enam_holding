import React, { useState } from 'react';
import { Announcement, AnnouncementCategory } from '../../types';
import { Badge, BadgeVariant } from '../common/Badge';
import { QuarterlyResultsView } from './QuarterlyResultsView';
import { ManagementChangeView } from './ManagementChangeView';
import { ChevronDown, ChevronUp, ExternalLink, History, FileText } from 'lucide-react';

interface AnnouncementCardProps {
  announcement: Announcement;
  onOpenEventMemory?: (memoryId: string) => void;
  onOpenPrimaryDoc?: (announcement: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onOpenEventMemory,
  onOpenPrimaryDoc,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getCategoryBadgeVariant = (category: AnnouncementCategory): BadgeVariant => {
    switch (category) {
      case 'results':
        return 'emerald';
      case 'M&A':
      case 'capex':
        return 'teal';
      case 'management_change':
        return 'sky';
      case 'litigation':
        return 'rose';
      case 'fund_raise':
        return 'amber';
      case 'dividend':
      case 'bonus_split':
        return 'teal';
      default:
        return 'neutral';
    }
  };

  const getCategoryLabel = (category: AnnouncementCategory): string => {
    switch (category) {
      case 'results': return 'Results';
      case 'management_change': return 'Leadership';
      case 'capex': return 'Capex / Expansion';
      case 'M&A': return 'M&A / JV';
      case 'litigation': return 'Legal / Reg';
      case 'fund_raise': return 'Fund Raise';
      case 'dividend': return 'Dividend';
      case 'bonus_split': return 'Bonus / Split';
      case 'credit_rating': return 'Credit Rating';
      case 'press_release': return 'Press Release';
      case 'unclassified': return 'Routine Paperwork';
      default: return category;
    }
  };

  return (
    <div
      className={`rounded-xl border bg-dark-surface p-4 transition-all duration-150 ${
        announcement.severity === 'critical'
          ? 'border-dark-border hover:border-slate-700'
          : 'border-dark-borderSubtle hover:border-dark-border'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-white tracking-tight">
            {announcement.ticker}
          </span>
          <span className="text-[11px] text-dark-textMuted hidden sm:inline truncate max-w-[150px]">
            {announcement.companyName}
          </span>
          <Badge variant={getCategoryBadgeVariant(announcement.category)} size="sm">
            {getCategoryLabel(announcement.category)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {announcement.eventMemoryId && (
            <button
              onClick={() => onOpenEventMemory?.(announcement.eventMemoryId!)}
              className="inline-flex items-center gap-1 rounded-md bg-teal-950/60 px-2 py-0.5 text-[10px] font-medium text-teal-400 border border-teal-800/40 hover:bg-teal-900/60 transition-colors"
              title="Click to view Historical Commitment Tracker"
            >
              <History size={11} />
              <span>Event Memory</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-slate-500">
            {announcement.timestamp}
          </span>
        </div>
      </div>

      {/* Main Headline */}
      <h3 className="mt-2 text-sm font-semibold text-white leading-snug">
        {announcement.title}
      </h3>

      {/* Takeaway & Why It Matters (Progressive Disclosure: Layer 1) */}
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="rounded-lg bg-dark-bg/60 p-2.5 border border-dark-borderSubtle">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-0.5">
            Key Takeaway
          </div>
          <p className="text-slate-200 leading-relaxed font-medium">
            {announcement.oneLineTakeaway}
          </p>
        </div>

        <div className="px-1 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Why it matters:</strong> {announcement.whyItMatters}
        </div>
      </div>

      {/* Progressive Disclosure: Inline Views for Results & Leadership */}
      {announcement.quarterlyResults && (
        <QuarterlyResultsView results={announcement.quarterlyResults} />
      )}

      {announcement.managementChange && (
        <ManagementChangeView change={announcement.managementChange} />
      )}

      {/* Progressive Disclosure Toggle (Layer 2: Source Evidence Excerpt) */}
      <div className="mt-3 pt-2.5 border-t border-dark-borderSubtle flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{isExpanded ? 'Hide Source Evidence' : 'Inspect Source Evidence'}</span>
        </button>

        <button
          onClick={() => onOpenPrimaryDoc?.(announcement)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 transition-colors"
        >
          <FileText size={12} />
          <span>Filing PDF</span>
          <ExternalLink size={10} className="opacity-70" />
        </button>
      </div>

      {/* Expanded Evidence Drawer / Panel */}
      {isExpanded && (
        <div className="mt-2.5 rounded-lg bg-dark-bg p-3 border border-dark-border text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-dark-border pb-1.5">
            <span className="font-mono text-slate-300">Primary Disclosure:</span>
            <span className="truncate max-w-[220px] text-slate-400">{announcement.sourceDocTitle}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            Source URL: <a href={announcement.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-teal-400 underline break-all">{announcement.sourceUrl}</a>
          </p>
          <div className="text-[10px] text-slate-500 italic">
            Extraction verified against primary exchange disclosure. No secondary commentary or ungrounded synthesis applied.
          </div>
        </div>
      )}
    </div>
  );
};

