import React, { useState } from 'react';
import { Company } from '../../types';
import { Sparkline } from '../common/Sparkline';
import { Search, Star, BarChart2 } from 'lucide-react';

interface WatchlistManagerProps {
  companies: Company[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectCompanyForResearch: (ticker: string) => void;
}

export const WatchlistManager: React.FC<WatchlistManagerProps> = ({
  companies,
  onToggleWatchlist,
  onSelectCompanyForResearch,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCap, setFilterCap] = useState<'All' | 'Large Cap' | 'Mid Cap' | 'Small Cap'>('All');

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCap = filterCap === 'All' || c.marketCapCategory === filterCap;
    return matchesSearch && matchesCap;
  });

  const watchlistCount = companies.filter((c) => c.inWatchlist).length;

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-dark-border pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Portfolio & Watchlist Universe
          </h3>
          <p className="text-[11px] text-dark-textMuted mt-0.5">
            Managing <strong className="text-white">{watchlistCount} active</strong> of {companies.length} tracked Indian equities
          </p>
        </div>
      </div>

      {/* Search and Cap Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, ticker, or sector..."
            className="w-full rounded-lg bg-dark-bg border border-dark-border py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {(['All', 'Large Cap', 'Mid Cap', 'Small Cap'] as const).map((cap) => (
            <button
              key={cap}
              onClick={() => setFilterCap(cap)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                filterCap === cap
                  ? 'bg-teal-600 text-white'
                  : 'bg-dark-bg text-slate-400 hover:text-white border border-dark-border'
              }`}
            >
              {cap}
            </button>
          ))}
        </div>
      </div>

      {/* Ticker Table / List */}
      <div className="divide-y divide-dark-borderSubtle max-h-[380px] overflow-y-auto pr-1">
        {filteredCompanies.map((comp) => {
          const isPos = comp.changePercent >= 0;

          return (
            <div
              key={comp.ticker}
              className="flex items-center justify-between py-2.5 hover:bg-dark-bg/60 px-2 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => onToggleWatchlist(comp.ticker)}
                  className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                  aria-label={comp.inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star
                    size={15}
                    className={comp.inWatchlist ? 'fill-amber-400 text-amber-400' : ''}
                  />
                </button>

                <div
                  onClick={() => onSelectCompanyForResearch(comp.ticker)}
                  className="cursor-pointer min-w-0 flex-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-white group-hover:text-teal-400 transition-colors">
                      {comp.ticker}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {comp.marketCapCategory}
                    </span>
                  </div>
                  <p className="text-[11px] text-dark-textMuted truncate">{comp.name}</p>
                </div>
              </div>

              {/* Sparkline & Pricing */}
              <div className="flex items-center gap-3 flex-shrink-0 text-right">
                <div className="hidden sm:block">
                  <Sparkline data={comp.sparkline} positive={isPos} width={56} height={20} />
                </div>

                <div className="font-mono text-xs">
                  <div className="text-white font-semibold">
                    ₹{comp.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                  </div>
                  <div className={`text-[11px] font-medium ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? '+' : ''}{comp.changePercent.toFixed(2)}%
                  </div>
                </div>

                <button
                  onClick={() => onSelectCompanyForResearch(comp.ticker)}
                  className="p-1.5 text-slate-500 hover:text-teal-400 rounded hover:bg-slate-800 transition-colors"
                  title="Open Fundamental Research"
                >
                  <BarChart2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
