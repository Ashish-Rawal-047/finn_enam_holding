import React from 'react';
import { DigestWindow } from '../../types';
import { Filter, Calendar } from 'lucide-react';

interface DigestWindowBarProps {
  activeWindow: DigestWindow;
  onChangeWindow: (window: DigestWindow) => void;
  materialOnly: boolean;
  onToggleMaterialOnly: () => void;
  filteredCount: number;
  totalCount: number;
}

export const DigestWindowBar: React.FC<DigestWindowBarProps> = ({
  activeWindow,
  onChangeWindow,
  materialOnly,
  onToggleMaterialOnly,
  filteredCount,
}) => {
  const windows: Array<{ id: DigestWindow; label: string }> = [
    { id: '24h', label: '24h' },
    { id: '48h', label: '48h' },
    { id: '7d', label: '7d' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-dark-surface border border-dark-border p-3">
      {/* Time Window Switcher */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
          <Calendar size={13} className="text-slate-500" />
          Window:
        </span>
        <div className="flex rounded-lg bg-dark-bg p-0.5 border border-dark-border">
          {windows.map((w) => (
            <button
              key={w.id}
              onClick={() => onChangeWindow(w.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeWindow === w.id
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Count Summary */}
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-[11px] font-mono text-dark-textMuted">
          Showing <strong className="text-white">{filteredCount}</strong> disclosures
        </span>

        <button
          onClick={onToggleMaterialOnly}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
            materialOnly
              ? 'bg-teal-950/40 text-teal-300 border-teal-700/60 font-semibold'
              : 'bg-dark-bg text-slate-400 border-dark-border hover:border-slate-700'
          }`}
        >
          <Filter size={12} className={materialOnly ? 'text-teal-400' : 'text-slate-500'} />
          <span>{materialOnly ? 'High Signal Only' : 'Include Routine'}</span>
        </button>
      </div>
    </div>
  );
};

