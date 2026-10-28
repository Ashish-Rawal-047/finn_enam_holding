import React, { useState } from 'react';
import { Company, CompanyResearch } from '../types';
import { getCompanyResearch } from '../data/research';
import { FinancialSnapshotGrid } from '../components/research/FinancialSnapshotGrid';
import { NarrativeVsNumbers } from '../components/research/NarrativeVsNumbers';
import { BullBearDebate } from '../components/research/BullBearDebate';
import { Search, Star, ExternalLink, FileText, Building } from 'lucide-react';

interface CompanyResearchScreenProps {
  companies: Company[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
}

export const CompanyResearchScreen: React.FC<CompanyResearchScreenProps> = ({
  companies,
  selectedTicker,
  onSelectTicker,
  onToggleWatchlist,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Active company research object
  const activeCompany = companies.find((c) => c.ticker === selectedTicker);
  const research: CompanyResearch = getCompanyResearch(
    selectedTicker,
    activeCompany?.name,
    activeCompany?.sector
  );

  const isWatched = activeCompany?.inWatchlist ?? false;

  // Search filter
  const searchMatches = companies.filter(
    (c) =>
      c.ticker.toLowerCase().includes(searchInput.toLowerCase()) ||
      c.name.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleCustomTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    let formatted = searchInput.trim().toUpperCase();
    if (!formatted.includes('.')) {
      formatted += '.NS';
    }
    onSelectTicker(formatted);
    setShowSearchResults(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Ticker Search & Ingestion Bar */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Primary-Source Company Deep Dive
          </span>
          <span className="text-[10px] text-teal-400 font-mono">Zero-Shot Ingestion Active</span>
        </div>

        <form onSubmit={handleCustomTickerSubmit} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search demo portfolio or enter any NSE ticker (e.g. TRENT, DIXON, BEL)..."
            className="w-full rounded-lg bg-dark-bg border border-dark-border py-2.5 pl-9 pr-20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] px-2.5 py-1 font-medium transition-colors"
          >
            Analyze
          </button>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchInput.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-xl border border-dark-border bg-dark-surface p-1 shadow-2xl">
              {searchMatches.slice(0, 6).map((c) => (
                <div
                  key={c.ticker}
                  onClick={() => {
                    onSelectTicker(c.ticker);
                    setSearchInput('');
                    setShowSearchResults(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-bg cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{c.ticker}</span>
                    <span className="text-dark-textMuted text-[11px] truncate max-w-[180px]">{c.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{c.marketCapCategory}</span>
                </div>
              ))}

              <div
                onClick={handleCustomTickerSubmit}
                className="p-2 border-t border-dark-border text-center text-[11px] text-teal-400 hover:bg-dark-bg cursor-pointer font-medium"
              >
                Analyze arbitrary symbol "{searchInput.toUpperCase()}" via Generalizer Engine &rarr;
              </div>
            </div>
          )}
        </form>

        {/* Quick Ticker Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {['TRENT.NS', 'DIXON.NS', 'POLYCAB.NS', 'INFY.NS', 'RELIANCE.NS', 'ZOMATO.NS', 'KAYNES.NS'].map((tick) => (
            <button
              key={tick}
              onClick={() => onSelectTicker(tick)}
              className={`rounded-md px-2.5 py-1 font-mono transition-all whitespace-nowrap ${
                selectedTicker === tick
                  ? 'bg-teal-600 text-white font-bold shadow-sm'
                  : 'bg-dark-bg text-slate-400 hover:text-white border border-dark-border'
              }`}
            >
              {tick}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Company Header Banner */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-mono">{research.ticker}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {research.marketCap}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mt-0.5">{research.name}</h3>
            <p className="text-xs text-dark-textMuted mt-0.5 flex items-center gap-1">
              <Building size={12} className="text-slate-500" />
              {research.sector}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(research.ticker)}
              className={`p-2 rounded-lg border transition-colors ${
                isWatched
                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-400'
                  : 'bg-dark-bg border-dark-border text-slate-400 hover:text-white'
              }`}
              title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star size={16} className={isWatched ? 'fill-amber-400' : ''} />
            </button>
          </div>
        </div>

        {/* Business Overview & Segment Breakdown */}
        <div className="mt-3.5 space-y-2.5 border-t border-dark-borderSubtle pt-3 text-xs">
          <p className="text-slate-300 leading-relaxed">
            {research.businessSnapshot.summary}
          </p>

          <div className="rounded-lg bg-dark-bg p-2.5 border border-dark-border">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1.5">
              Revenue Mix & Key Operating Segments
            </span>
            <div className="space-y-1.5">
              {research.businessSnapshot.segments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{seg.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-white font-semibold">{seg.sharePercent}% Share</span>
                    <span className="text-emerald-400">(+{seg.growthYoY}% YoY)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-teal-950/20 p-2.5 border border-teal-900/40 text-[11px] text-teal-200">
            <strong className="text-teal-400 font-mono">Differentiated Moat: </strong>
            {research.businessSnapshot.keyMoat}
          </div>
        </div>
      </div>

      {/* Financial Snapshot & Cash Flow Quality */}
      <FinancialSnapshotGrid
        financials={research.financialSnapshot}
        cashQuality={research.cashQualityAnalysis}
      />

      {/* Narrative vs Numbers: 4-Quarter Audit */}
      <NarrativeVsNumbers items={research.narrativeVsNumbers} />

      {/* Explicit Management Guidance Ledger */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-dark-border pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Forward Guidance Ledger
          </h3>
          <span className="text-[10px] text-dark-textMuted font-mono">Verbatim Management Targets</span>
        </div>

        <div className="space-y-2 text-xs">
          {research.guidanceLedger.map((g, idx) => (
            <div key={idx} className="rounded-lg bg-dark-bg p-2.5 border border-dark-border">
              <div className="flex items-center justify-between font-mono text-[10px] text-teal-400 mb-1">
                <span className="font-bold uppercase">{g.metric}</span>
                <span className="text-slate-400">Target: {g.targetPeriod}</span>
              </div>
              <p className="text-slate-200 leading-snug">{g.managementStatement}</p>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Source: {g.concallSource}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bull vs Bear Debate */}
      <BullBearDebate bullBear={research.bullBear} />

      {/* Primary Source Disclosures (No Secondary Commentary Discipline) */}
      <div className="rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-dark-border pb-2">
          <div className="flex items-center gap-1.5">
            <FileText size={15} className="text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Primary Source Disclosures
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Strict Primary Data Discipline</span>
        </div>

        <div className="space-y-2 text-xs">
          {research.primarySources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-dark-bg border border-dark-border hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-mono flex-shrink-0">
                  {source.type}
                </span>
                <span className="text-slate-200 text-xs truncate">{source.title}</span>
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:underline flex-shrink-0 ml-2"
              >
                <span>Open Primary PDF</span>
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
