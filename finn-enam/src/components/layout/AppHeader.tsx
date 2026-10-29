import React from 'react';
import { AppTheme, NavigationTab } from '../../types';
import { Star, Sliders, Sun, Moon, Info } from 'lucide-react';
import { FinnLogo } from '../common/FinnLogo';

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
    <header className="sticky top-0 z-30 w-full border-b border-divider bg-cream/95 dark:bg-ink-bg/95 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center">
            <FinnLogo
              size={28}
              primaryColor={theme === 'dark' ? '#4ADE80' : '#164E3B'}
              secondaryColor={theme === 'dark' ? '#34D399' : '#187653'}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-ink dark:text-white">
                FINN
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-ink-muted dark:text-ink-subtle">
                ENAM INTEL
              </span>
            </div>
            <p className="text-[10px] text-ink-muted dark:text-ink-subtle hidden xs:block">
              Institutional Investment Agent
            </p>
          </div>
        </div>

        {/* Data Freshness Indicator & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* EOD Data Pill */}
          <button
            onClick={onOpenProvenance}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-cream-light dark:bg-ink-surface border border-divider text-[11px] text-ink dark:text-ink-light transition-colors shadow-subtle"
            title="Data verification & market baseline"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            <span className="font-mono text-[10px] font-medium hidden sm:inline">EOD OCT 28</span>
            <span className="font-mono text-[10px] font-medium sm:hidden">EOD</span>
            <Info size={11} className="text-ink-muted" />
          </button>

          {/* Watchlist Quick Button */}
          <button
            onClick={onOpenWatchlist}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-cream-light dark:bg-ink-surface border border-divider text-[11px] text-ink dark:text-ink-light transition-colors shadow-subtle"
            title="Open Watchlist Universe"
          >
            <Star size={12} className="text-fin-amber fill-fin-amber" />
            <span className="font-mono text-[11px] font-semibold">{watchlistCount}</span>
          </button>

          {/* Alert Threshold Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-cream-light dark:bg-ink-surface border border-divider text-ink-muted hover:text-forest dark:hover:text-emerald transition-colors shadow-subtle"
            title="Alert Anomaly Sensitivity Settings"
          >
            <Sliders size={14} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-cream-light dark:bg-ink-surface border border-divider text-ink-muted hover:text-forest dark:hover:text-emerald transition-colors shadow-subtle"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-fin-amber" />}
          </button>
        </div>
      </div>
    </header>
  );
};
