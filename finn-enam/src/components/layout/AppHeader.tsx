import React from 'react';
import { AppTheme, NavigationTab } from '../../types';
import { Star, Sliders, Sun, Moon, Info } from 'lucide-react';

interface AppHeaderProps {
  activeTab: NavigationTab;
  theme: AppTheme;
  onToggleTheme: () => void;
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onOpenSettings: () => void;
  onOpenProvenance: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  onToggleTheme,
  watchlistCount,
  onOpenWatchlist,
  onOpenSettings,
  onOpenProvenance,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/80 dark:border-ink-border bg-ivory-bg/90 dark:bg-ink-bg/90 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-semibold text-xs tracking-wider shadow-sm font-mono">
            FN
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                FINN
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-stone-500 dark:text-slate-400">
                ENAM INTEL
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 hidden xs:block">
              Institutional Investment Agent
            </p>
          </div>
        </div>

        {/* Data Freshness Indicator & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* EOD Data Pill */}
          <button
            onClick={onOpenProvenance}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-700/60 text-[11px] text-stone-600 dark:text-slate-300 transition-colors"
            title="Data verification & market baseline"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[10px] font-medium hidden sm:inline">EOD OCT 28</span>
            <span className="font-mono text-[10px] font-medium sm:hidden">EOD</span>
            <Info size={11} className="text-stone-400 dark:text-slate-500" />
          </button>

          {/* Watchlist Quick Button */}
          <button
            onClick={onOpenWatchlist}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-700/60 text-[11px] text-stone-700 dark:text-slate-300 transition-colors"
            title="Open Watchlist Universe"
          >
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="font-mono text-[11px] font-semibold">{watchlistCount}</span>
          </button>

          {/* Alert Threshold Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            title="Configure Thresholds & Filters"
            aria-label="Settings"
          >
            <Sliders size={15} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Warm Editorial Light' : 'Switch to Executive Dark'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
};
