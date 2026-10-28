import React from 'react';
import { CompanyResearch } from '../../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface BullBearDebateProps {
  bullBear: CompanyResearch['bullBear'];
}

export const BullBearDebate: React.FC<BullBearDebateProps> = ({ bullBear }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Bull Case */}
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4">
        <div className="flex items-center gap-2 border-b border-emerald-900/30 pb-2 mb-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-900/60 text-emerald-400">
            <ArrowUpRight size={14} />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
            Institutional Bull Case
          </h4>
        </div>
        <ul className="space-y-2 text-xs text-slate-300">
          {bullBear.bullCase.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bear Case */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/15 p-4">
        <div className="flex items-center gap-2 border-b border-rose-900/30 pb-2 mb-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-900/60 text-rose-400">
            <ArrowDownRight size={14} />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
            Key Downside & Balance Sheet Risks
          </h4>
        </div>
        <ul className="space-y-2 text-xs text-slate-300">
          {bullBear.bearCase.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="text-rose-400 font-bold mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

