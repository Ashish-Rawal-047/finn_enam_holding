import React, { useState } from 'react';
import { Company, AlertSettings, TriggeredAlert, MarketCapCategory, AnnouncementCategory } from '../../types';
import { Drawer } from '../common/Drawer';
import { Search, Star, Check } from 'lucide-react';
import { CATEGORY_LABELS, DEFAULT_ALERT_SETTINGS } from '../../data/alertSettings';

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

  const handleToggleCategory = (cat: AnnouncementCategory) => {
    onChangeSettings({
      ...settings,
      enabledCategories: {
        ...settings.enabledCategories,
        [cat]: !settings.enabledCategories[cat],
      },
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Watchlist & Threshold Controls"
      subtitle={`${watchlistCount} of ${companies.length} Indian Equities Tracked`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs text-ink dark:text-ink-light">
        {/* Sub-navigation tabs */}
        <div className="flex rounded-xl bg-cream-dark dark:bg-ink-surfaceSubtle p-1 border border-divider">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'watchlist'
                ? 'bg-white dark:bg-ink-surface text-ink dark:text-white font-semibold shadow-subtle'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Watchlist Universe ({watchlistCount})
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'thresholds'
                ? 'bg-white dark:bg-ink-surface text-ink dark:text-white font-semibold shadow-subtle'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Alert Anomaly Thresholds
          </button>
        </div>

        {/* TAB 1: WATCHLIST MANAGER */}
        {activeTab === 'watchlist' && (
          <div className="space-y-3">
            {/* Search and Cap Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search universe by ticker, name, or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-divider bg-white dark:bg-ink-surface py-2 pl-8 pr-3 text-xs placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div className="flex rounded-xl bg-cream-dark p-0.5 border border-divider">
                {(['All', 'Large Cap', 'Mid Cap', 'Small Cap'] as const).map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setCapFilter(cap)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      capFilter === cap
                        ? 'bg-white text-ink font-semibold shadow-subtle'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Companies List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredCompanies.map((c) => {
                const isWatched = c.inWatchlist;
                return (
                  <div
                    key={c.ticker}
                    className="flex items-center justify-between rounded-xl border border-divider bg-white dark:bg-ink-surface p-2.5 hover:bg-cream-light/60 transition-colors"
                  >
                    <div
                      onClick={() => onSelectCompanyForResearch(c.ticker)}
                      className="cursor-pointer flex-1 space-y-0.5 mr-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-ink dark:text-white">
                          {c.ticker}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sage text-forest font-medium">
                          {c.marketCapCategory}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {c.name} • {c.sector}
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleWatchlist(c.ticker)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isWatched
                          ? 'bg-forest text-white shadow-sm'
                          : 'bg-cream-dark text-ink hover:bg-cream border border-divider'
                      }`}
                    >
                      <Star size={12} className={isWatched ? 'fill-white' : 'text-ink-muted'} />
                      <span>{isWatched ? 'Tracking' : 'Add'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: THRESHOLD CONTROLS */}
        {activeTab === 'thresholds' && (
          <div className="space-y-4">
            {/* Price Move Sensitivity Slider */}
            <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-ink dark:text-white">Price Move Sensitivity</span>
                <span className="font-mono font-bold text-forest text-sm">
                  ±{settings.priceMoveThresholdPercent}%
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Trigger anomaly review whenever a portfolio stock moves more than this percentage in a single trading session.
              </p>
              <div className="flex gap-2">
                {[2, 3, 5, 7, 10].map((val) => (
                  <button
                    key={val}
                    onClick={() => onChangeSettings({ ...settings, priceMoveThresholdPercent: val })}
                    className={`flex-1 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
                      settings.priceMoveThresholdPercent === val
                        ? 'bg-forest text-white border-forest'
                        : 'bg-white border-divider text-ink-muted hover:text-ink hover:bg-cream-light'
                    }`}
                  >
                    ±{val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Spike Multiplier Slider */}
            <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-ink dark:text-white">Volume Spike Multiplier</span>
                <span className="font-mono font-bold text-forest text-sm">
                  {settings.volumeSpikeMultiplier}x 20-DMA
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Trigger high-priority alerts when turnover exceeds multiple of rolling 20-day moving average.
              </p>
              <div className="flex gap-2">
                {[1.5, 2.0, 2.5, 3.0, 5.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => onChangeSettings({ ...settings, volumeSpikeMultiplier: val })}
                    className={`flex-1 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
                      settings.volumeSpikeMultiplier === val
                        ? 'bg-forest text-white border-forest'
                        : 'bg-white border-divider text-ink-muted hover:text-ink hover:bg-cream-light'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>

            {/* Active Digest Window */}
            <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-ink dark:text-white">Digest Time Window</span>
                <span className="font-mono font-bold text-forest uppercase">{settings.activeDigestWindow}</span>
              </div>
              <div className="flex gap-2">
                {(['24h', '48h', '7d', 'all'] as const).map((win) => (
                  <button
                    key={win}
                    onClick={() => onChangeSettings({ ...settings, activeDigestWindow: win })}
                    className={`flex-1 py-1 rounded-lg border text-xs font-bold transition-colors ${
                      settings.activeDigestWindow === win
                        ? 'bg-forest text-white border-forest'
                        : 'bg-white border-divider text-ink-muted hover:text-ink hover:bg-cream-light'
                    }`}
                  >
                    {win.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 17 Categories Quick Summary */}
            <div className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 space-y-2">
              <span className="font-bold text-ink dark:text-white block">
                17 Announcement Categories
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(Object.keys(CATEGORY_LABELS) as AnnouncementCategory[]).map((cat) => {
                  const isEnabled = settings.enabledCategories[cat] !== false;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleToggleCategory(cat)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-left text-[11px] transition-colors ${
                        isEnabled
                          ? 'bg-sage border-sage-dark text-forest font-semibold'
                          : 'bg-cream-dark border-divider text-ink-muted'
                      }`}
                    >
                      <span className="truncate mr-1">{CATEGORY_LABELS[cat]?.label || cat}</span>
                      {isEnabled && <Check size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => onChangeSettings(DEFAULT_ALERT_SETTINGS)}
              className="w-full py-2.5 rounded-xl border border-divider bg-white text-ink-muted hover:text-ink hover:bg-cream-light font-medium text-xs transition-colors"
            >
              Reset to Institutional Defaults
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
