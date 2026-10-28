import React from 'react';
import { ManagementChange } from '../../types';
import { UserCheck, Award, Briefcase, Clock } from 'lucide-react';

interface ManagementChangeViewProps {
  change: ManagementChange;
}

export const ManagementChangeView: React.FC<ManagementChangeViewProps> = ({ change }) => {
  const bio = change.incomingBio;
  if (!bio) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-teal-900/40 bg-teal-950/15 p-3.5">
      <div className="flex items-center gap-2 border-b border-teal-900/30 pb-2 mb-2.5">
        <UserCheck size={16} className="text-teal-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-teal-300 font-mono">
          Executive Dossier: {change.role}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">{change.personName}</h4>
            <p className="text-xs text-teal-400/90 font-medium">{change.role}</p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-900/50 text-teal-300 border border-teal-700/50">
            {change.direction}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {bio.summary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 rounded-lg bg-dark-bg/60 p-2 border border-dark-border">
            <Briefcase size={13} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">Prior: <strong className="text-white">{bio.previousRole}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-dark-bg/60 p-2 border border-dark-border">
            <Clock size={13} className="text-slate-400 flex-shrink-0" />
            <span>Tenure: <strong className="text-white">{bio.tenureYears}+ Years</strong></span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 rounded-lg bg-dark-bg/60 p-2 border border-dark-border text-[11px] text-slate-300">
          <Award size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <span>Track Record: <strong className="text-slate-200">{bio.pedigreeHighlight}</strong></span>
        </div>
      </div>
    </div>
  );
};

