import React from 'react';
import { Info } from 'lucide-react';

interface HeaderProps {
  activeScreen: string;
  onOpenDisclaimer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDisclaimer }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-dark-border bg-dark-bg/95 backdrop-blur-md px-3.5 sm:px-5 py-2.5">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        {/* Brand & Mandate */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-400 font-bold text-xs tracking-wider shadow-inner">
            FN
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white">FINN</span>
              <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                ENAM
              </span>
            </div>
            <p className="text-[10px] text-dark-textMuted tracking-tight leading-none mt-0.5">
              Investment Agent
            </p>
          </div>
        </div>

        {/* Live EOD / Demo Indicator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenDisclaimer}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-[10px] text-slate-300"
            title="Click for data provenance and disclosure details"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">EOD MOCK</span>
            <Info size={11} className="text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
