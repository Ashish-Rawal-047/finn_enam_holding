import React, { useState } from 'react';
import { Announcement } from '../../types';
import { ChevronDown, ChevronUp, Archive, ExternalLink } from 'lucide-react';

interface RoutinePaperworkDrawerProps {
  routineAnnouncements: Announcement[];
}

export const RoutinePaperworkDrawer: React.FC<RoutinePaperworkDrawerProps> = ({
  routineAnnouncements,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!routineAnnouncements || routineAnnouncements.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-dark-border bg-dark-surface/50 p-3 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 border border-slate-800 text-slate-400">
            <Archive size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Routine Paperwork & Disclosures
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                {routineAnnouncements.length} collapsed
              </span>
            </div>
            <p className="text-[10px] text-dark-textMuted">
              Reg 74(5) certificates, ESOP allotments, shareholding patterns (low market signal)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-[11px] hidden sm:inline">{isOpen ? 'Collapse' : 'Show All'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 divide-y divide-dark-borderSubtle border-t border-dark-border pt-2 space-y-2">
          {routineAnnouncements.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-slate-300">{item.ticker}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{item.timestamp}</span>
                </div>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] text-teal-400 hover:underline"
                >
                  <span>Filing</span>
                  <ExternalLink size={10} />
                </a>
              </div>
              <p className="mt-0.5 text-xs text-slate-300 line-clamp-1">{item.title}</p>
              <p className="text-[11px] text-dark-textMuted">{item.oneLineTakeaway}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

