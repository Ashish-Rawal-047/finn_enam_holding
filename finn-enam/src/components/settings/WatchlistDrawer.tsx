import React, { useState } from 'react';
import { Company, AlertSettings, TriggeredAlert, MarketCapCategory } from '../../types';
import { Drawer } from '../common/Drawer';
import { Search, Star, Info, BarChart2 } from 'lucide-react';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'watchlist' | 'thresholds';
  companies: Company[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectCompanyForResearch: (ticker: string) => void;
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  activeAlerts: TriggeredAlert[];
}

export const WatchlistDrawer: React.FC<WatchlistDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'watchlist',
  companies,
  onToggleWatchlist,
  onSelectCompanyForResearch,
  settings,
  onChangeSettings,
  activeAlerts,
}) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'thresholds'>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [capFilter, setCapFilter] = useState<'All' | MarketCapCategory>('All');

  const filteredCompanies = companies.filter((c) => {
    const matchSearch =
      c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCap = capFilter === 'All' || c.marketCapCategory === capFilter;
    return matchSearch && matchCap;
  });

  const watchlistCount = companies.filter((c) => c.inWatchlist).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Watchlist & Threshold Controls"
      subtitle={`${watchlistCount} of ${companies.length} Indian Equities Followed`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Sub-navigation tabs */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-ink-surfaceSubtle p-1 border border-stone-200/80 dark:border-ink-border">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'watchlist'
                ? 'bg-white dark:bg-ink-surface text-stone-900 dark:text-white font-semibold shadow-subtle'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            Tracked Equities ({watchlistCount})
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'thresholds'
                ? 'bg-white dark:bg-ink-surface text-stone-900 dark:text-white font-semibold shadow-subtle'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            Trigger Sensitivity ({activeAlerts.length} Active)
          </button>
        </div>

        {/* TAB 1: WATCHLIST MANAGER */}
        {activeTab === 'watchlist' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol, company or sector..."
                className="w-full rounded-xl bg-stone-50 dark:bg-ink-bg border border-stone-200 dark:border-ink-border py-2 pl-9 pr-3 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {(['All', 'Large Cap', 'Mid Cap', 'Small Cap'] as const).map((cap) => (
                <button
                  key={cap}
                  onClick={() => setCapFilter(cap)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                    capFilter === cap
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold'
                      : 'bg-stone-100 dark:bg-ink-surfaceSubtle text-stone-600 dark:text-slate-300'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>

            <div className="divide-y divide-stone-100 dark:divide-ink-border max-h-[380px] overflow-y-auto pr-1">
              {filteredCompanies.map((c) => {
                const isPos = c.changePercent >= 0;
                return (
                  <div key={c.ticker} className="flex items-center justify-between py-2.5 hover:bg-stone-50/60 dark:hover:bg-ink-bg/40 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        onClick={() => onToggleWatchlist(c.ticker)}
                        className="p-1 text-stone-400 hover:text-amber-500 transition-colors"
                        aria-label="Toggle watchlist"
                      >
                        <Star size={15} className={c.inWatchlist ? 'fill-amber-500 text-amber-500' : ''} />
                      </button>
                      <div
                        onClick={() => {
                          onClose();
                          onSelectCompanyForResearch(c.ticker);
                        }}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">{c.ticker}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{c.marketCapCategory}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate">{c.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right flex-shrink-0">
                      <div className="font-mono text-xs">
                        <div className="font-semibold text-stone-900 dark:text-white">
                          ₹{c.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                        </div>
                        <div className={`text-[10px] ${isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {isPos ? '+' : ''}{c.changePercent.toFixed(2)}%
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onSelectCompanyForResearch(c.ticker);
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white rounded"
                        title="Open Research"
                      >
                        <BarChart2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: THRESHOLD CONTROLS */}
        {activeTab === 'thresholds' && (
          <div className="space-y-4">
            {/* Price Move Sensitivity */}
            <div className="rounded-xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-800 dark:text-slate-200 text-xs">
                  Price Movement Trigger (&plusmn;X%)
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-ink-surface text-stone-900 dark:text-white border border-stone-200 dark:border-ink-border">
                  &plusmn;{settings.priceMoveThresholdPercent.toFixed(1)}% in a day
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.5"
                value={settings.priceMoveThresholdPercent}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    priceMoveThresholdPercent: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-stone-900 dark:accent-teal-400 cursor-pointer h-1.5 bg-stone-200 dark:bg-slate-700 rounded-lg"
              />
              <p className="text-[11px] text-stone-500 leading-normal">
                Surfaces stocks that move more than &plusmn;{settings.priceMoveThresholdPercent.toFixed(1)}% from previous close. Higher values reduce noise; lower values catch smaller trends.
              </p>
            </div>

            {/* Volume Spike Threshold */}
            <div className="rounded-xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-800 dark:text-slate-200 text-xs">
                  Volume Anomaly Trigger (Y&times; 20-DMA)
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-ink-surface text-stone-900 dark:text-white border border-stone-200 dark:border-ink-border">
                  &gt; {settings.volumeSpikeMultiplier.toFixed(1)}&times; 20-day Average
                </span>
              </div>
              <input
                type="range"
                min="1.2"
                max="4.5"
                step="0.1"
                value={settings.volumeSpikeMultiplier}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    volumeSpikeMultiplier: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-stone-900 dark:accent-teal-400 cursor-pointer h-1.5 bg-stone-200 dark:bg-slate-700 rounded-lg"
              />
              <p className="text-[11px] text-stone-500 leading-normal">
                Benchmarks traded volume against the rolling 20-day Simple Moving Average (SMA-20). Triggers only when trading volume is unusually elevated.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-100 dark:bg-ink-bg border border-stone-200 dark:border-ink-border text-[11px] text-stone-600 dark:text-slate-400 flex items-start gap-2">
              <Info size={14} className="text-stone-400 flex-shrink-0 mt-0.5" />
              <span>
                Changes take effect immediately and dynamically recalculate priority alerts across the Today and Signals screens.
              </span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
