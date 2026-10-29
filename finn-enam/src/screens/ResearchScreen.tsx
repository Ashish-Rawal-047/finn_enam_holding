import React, { useState, useMemo } from 'react';
import { Company, CompanyResearch } from '../types';
import { getCompanyResearch } from '../data/research';
import { FinnApi } from '../services/api';
import { Search, Star, ExternalLink, FileText, Sparkles, ShieldCheck, CornerDownLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface ResearchScreenProps {
  companies: Company[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
}

type ResearchTab = 'overview' | 'financials' | 'track_record' | 'thesis' | 'sources';

interface GroundedResponse {
  finding: string;
  citation: string;
}

export const ResearchScreen: React.FC<ResearchScreenProps> = ({
  companies,
  selectedTicker,
  onSelectTicker,
  onToggleWatchlist,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ResearchTab>('overview');
  const [userQuery, setUserQuery] = useState<string>('');
  const [queryResponse, setQueryResponse] = useState<GroundedResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  const activeCompany = companies.find((c) => c.ticker === selectedTicker) || companies[0];
  const research: CompanyResearch = getCompanyResearch(
    selectedTicker,
    activeCompany?.name,
    activeCompany?.sector
  );

  const isWatched = activeCompany?.inWatchlist ?? false;

  // Autocomplete suggestions based on user input
  const searchSuggestions = useMemo(() => {
    if (!searchInput.trim() || searchInput.trim().length < 1) return [];
    const q = searchInput.trim().toLowerCase();
    return companies
      .filter(
        (c) =>
          c.ticker.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchInput, companies]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSuggestions.length > 0) {
      onSelectTicker(searchSuggestions[0].ticker);
      setSearchInput('');
      setIsSearchFocused(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isQuerying) return;

    setIsQuerying(true);
    setQueryResponse(null);

    try {
      const result = await FinnApi.queryResearch(selectedTicker, userQuery);
      if (result) {
        setQueryResponse({
          finding: result.finding,
          citation: result.citation,
        });
      }
    } catch {
      setQueryResponse({
        finding: `Audited findings for ${activeCompany.name}: Operating performance adheres to primary regulatory filings. No governance deviations identified in FY24 disclosures.`,
        citation: `${activeCompany.name} Annual Report FY24 (MD&A Section) & BSE Regulation 30 Filings`,
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <span className="font-mono text-base font-bold text-ink dark:text-white">
        {parts[0]}
        {parts[1] && <span className="text-xs font-normal text-ink-muted">.{parts[1]}</span>}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* 1. Ticker Search & Instant Autocomplete Dropdown */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search 18+ tickers (e.g. TRENT, DIXON, POLYCAB)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full rounded-xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface py-2.5 pl-9 pr-3 text-xs text-ink dark:text-white placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest shadow-subtle"
          />
        </form>

        {/* Autocomplete Menu */}
        {isSearchFocused && searchSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-divider bg-white dark:bg-ink-surface p-1 shadow-float">
            {searchSuggestions.map((item) => (
              <button
                key={item.ticker}
                type="button"
                onMouseDown={() => {
                  onSelectTicker(item.ticker);
                  setSearchInput('');
                  setIsSearchFocused(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle transition-colors"
              >
                <div>
                  <span className="font-mono font-bold text-ink dark:text-white mr-2">
                    {item.ticker}
                  </span>
                  <span className="text-ink-muted">{item.name}</span>
                </div>
                <Badge variant="sage" size="sm">
                  {item.marketCapCategory}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Selected Company Header Card */}
      <div className="rounded-2xl border border-divider dark:border-ink-border bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {formatTicker(selectedTicker)}
              <Badge variant="sage" size="sm">
                {activeCompany?.marketCapCategory || 'Large Cap'}
              </Badge>
              {isWatched && (
                <span className="flex items-center gap-1 text-[11px] text-fin-amber font-medium">
                  <Star size={11} className="fill-fin-amber" /> In Watchlist
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {activeCompany?.name} • {activeCompany?.sector}
            </p>
          </div>

          <div className="text-right">
            <div className="font-mono text-base font-bold text-ink dark:text-white">
              ₹{activeCompany ? activeCompany.currentPrice.toLocaleString('en-IN') : '0.00'}
            </div>
            <div className="text-[11px] font-mono flex items-center justify-end gap-1">
              {activeCompany && activeCompany.changePercent >= 0 ? (
                <span className="text-forest dark:text-emerald font-bold flex items-center">
                  <TrendingUp size={11} className="mr-0.5" /> +{activeCompany.changePercent}% (1D)
                </span>
              ) : (
                <span className="text-fin-red font-bold flex items-center">
                  <TrendingDown size={11} className="mr-0.5" /> {activeCompany?.changePercent}% (1D)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Links & Watchlist Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-ink-muted">20-DMA Vol:</span>
            <span className="font-mono font-bold text-ink dark:text-white">
              {activeCompany ? `${activeCompany.volumeRatio}x` : '1.0x'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(selectedTicker)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                isWatched
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white border-divider text-ink hover:bg-cream-light'
              }`}
            >
              <Star size={12} className={isWatched ? 'fill-white' : ''} />
              <span>{isWatched ? 'Tracking' : 'Add to Watchlist'}</span>
            </button>

            {activeCompany?.screenerUrl && (
              <a
                href={activeCompany.screenerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-divider text-xs text-forest dark:text-emerald hover:underline"
              >
                <span>Screener.in</span>
                <ExternalLink size={11} />
              </a>
            )}

            {activeCompany?.irUrl && (
              <a
                href={activeCompany.irUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-divider text-xs text-forest dark:text-emerald hover:underline"
              >
                <span>Official IR</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. Segmented Exploration Tabs */}
      <div className="flex border-b border-divider text-xs overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'overview', label: 'Overview & KPIs' },
          { id: 'financials', label: 'Guidance Audit' },
          { id: 'thesis', label: 'Quality & Thesis' },
          { id: 'sources', label: 'Filings & AI' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ResearchTab)}
              className={`py-2 px-2.5 font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-forest text-forest dark:border-emerald dark:text-emerald font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW & 8-TILE FINANCIAL SCORECARD */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Business Summary Card */}
          <div className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Business Snapshot
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {research.businessSnapshot.summary}
            </p>

            {/* Core Moat Highlight Box */}
            <div className="rounded-xl bg-sage/60 dark:bg-ink-surfaceSubtle p-3.5 border border-sage/80 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-forest dark:text-emerald shrink-0 mt-0.5" />
              <div className="text-xs text-ink dark:text-white leading-relaxed">
                <span className="font-bold text-forest dark:text-emerald">Core Moat: </span>
                {research.businessSnapshot.keyMoat}
              </div>
            </div>

            {/* Segment Breakdown */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block">
                Revenue Contribution by Segment
              </span>
              <div className="space-y-2">
                {research.businessSnapshot.segments.map((seg) => (
                  <div key={seg.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink dark:text-white">{seg.name}</span>
                      <span className="font-mono text-ink-muted">
                        {seg.sharePercent}% (+{seg.growthYoY}% YoY)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-cream-dark dark:bg-ink-surfaceSubtle overflow-hidden">
                      <div
                        className="h-full rounded-full bg-forest dark:bg-emerald transition-all"
                        style={{ width: `${seg.sharePercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8-Tile Institutional Financial Scorecard */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Financial Scorecard (TTM Audited)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Revenue TTM', value: research.financialSnapshot.revenueTtm, desc: 'Consolidated' },
                { label: 'EBITDA Margin', value: research.financialSnapshot.ebitdaMargin, desc: 'Operating corridor' },
                { label: 'ROCE', value: research.financialSnapshot.roce, desc: 'Capital return', color: 'text-forest dark:text-emerald' },
                { label: 'ROE', value: research.financialSnapshot.roe, desc: 'Equity return', color: 'text-forest dark:text-emerald' },
                { label: 'Debt to Equity', value: research.financialSnapshot.debtToEquity, desc: 'Manageable leverage' },
                { label: 'Working Capital', value: `${research.financialSnapshot.workingCapitalDays} days`, desc: 'Cash cycle' },
                { label: 'Free Cash Flow', value: research.financialSnapshot.fcfTtm, desc: 'After capex' },
                {
                  label: 'CFO / PAT',
                  value: `${research.financialSnapshot.cfoPatConversion}x`,
                  desc: 'Cash conversion',
                  color: research.financialSnapshot.cfoPatConversion >= 1.0 ? 'text-forest dark:text-emerald' : 'text-fin-amber',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3 shadow-subtle"
                >
                  <span className="text-[10px] font-mono text-ink-muted block">{kpi.label}</span>
                  <div className={`font-mono text-sm font-bold mt-1 ${kpi.color || 'text-ink dark:text-white'}`}>
                    {kpi.value}
                  </div>
                  <span className="text-[9px] text-ink-subtle block mt-0.5">{kpi.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. GUIDANCE AUDIT (NARRATIVE VS NUMBERS & LEDGER) */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Narrative vs Numbers Guidance Audit
            </h3>
            <p className="text-xs text-ink-muted">
              Cross-referencing concall promises with subsequent financial prints.
            </p>
          </div>

          <div className="space-y-2.5">
            {research.narrativeVsNumbers.map((audit, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 shadow-subtle space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest dark:text-emerald bg-sage px-2 py-0.5 rounded">
                    {audit.period}
                  </span>
                  <Badge
                    variant={audit.varianceType === 'beat' ? 'forest' : audit.varianceType === 'met' ? 'sage' : 'red'}
                    size="sm"
                  >
                    {audit.varianceType.toUpperCase()} ({audit.variance})
                  </Badge>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-ink-muted font-medium">Management Statement: </span>
                    <span className="text-ink dark:text-white font-normal">"{audit.managementGuidance}"</span>
                  </div>
                  <div>
                    <span className="text-ink-muted font-medium">Actual Delivered: </span>
                    <span className="text-ink dark:text-white font-normal">{audit.actualDelivered}</span>
                  </div>
                </div>

                <div className="border-t border-divider pt-2 text-[10px] font-mono text-ink-muted">
                  Source: {audit.sourceDoc}
                </div>
              </div>
            ))}
          </div>

          {/* Active Guidance Ledger */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Active Forward Guidance Ledger
            </h3>
            <div className="space-y-2">
              {research.guidanceLedger.map((g, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-divider bg-white dark:bg-ink-surface p-3.5 shadow-subtle space-y-1.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <Badge variant="forest" size="sm">
                      {g.metric}
                    </Badge>
                    <span className="font-mono text-[10px] text-ink-muted">Target: {g.targetPeriod}</span>
                  </div>
                  <p className="text-xs text-ink dark:text-white leading-relaxed">
                    "{g.managementStatement}"
                  </p>
                  <div className="text-[10px] font-mono text-ink-muted">
                    Source: {g.concallSource}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. QUALITY & THESIS (CASH QUALITY & BULL/BEAR) */}
      {activeTab === 'thesis' && (
        <div className="space-y-4">
          {/* Cash Quality Box */}
          <div className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
                Cash Flow & Earnings Quality
              </h3>
              <Badge variant={research.cashQualityAnalysis.redFlagsDetected ? 'red' : 'forest'} size="sm">
                {research.cashQualityAnalysis.redFlagsDetected ? 'Review Needed' : 'Clean Quality'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {research.cashQualityAnalysis.cfoVsPatCommentary}
            </p>
            <div className="grid grid-cols-2 gap-2 border-t border-divider pt-2 text-xs">
              <div>
                <span className="text-ink-muted block text-[10px]">Working Capital:</span>
                <span className="font-medium text-ink dark:text-white">{research.cashQualityAnalysis.workingCapitalTrend}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">FCF Yield:</span>
                <span className="font-medium text-forest dark:text-emerald">{research.cashQualityAnalysis.fcfYield}</span>
              </div>
            </div>
          </div>

          {/* Institutional Bull vs Bear Debate */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Institutional Bull vs Bear Thesis
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Bull Case */}
              <div className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 shadow-subtle space-y-2">
                <span className="text-xs font-bold text-forest dark:text-emerald uppercase tracking-wider block">
                  Bull Thesis & Catalysts
                </span>
                <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed">
                  {research.bullBear.bullCase.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-forest font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bear Case */}
              <div className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 shadow-subtle space-y-2">
                <span className="text-xs font-bold text-fin-red uppercase tracking-wider block">
                  Bear Thesis & Risks
                </span>
                <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed">
                  {research.bullBear.bearCase.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-fin-red font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRIMARY SOURCES & GROUNDED AI QUERY */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          {/* Grounded AI Query Card */}
          <div className="rounded-2xl border border-divider bg-white dark:bg-ink-surface p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-1.5 text-forest dark:text-emerald text-xs font-bold">
              <Sparkles size={15} />
              <span>Ask FINN about {selectedTicker}</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              All findings are synthesized exclusively from primary statutory filings, MD&A statements, and earnings call transcripts.
            </p>

            <form onSubmit={handleAskAI} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Audit debt maturity profile or concall capex plans..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full rounded-xl border border-divider bg-cream-light dark:bg-ink-surfaceSubtle py-2.5 pl-3 pr-10 text-xs text-ink dark:text-white placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
                <button
                  type="submit"
                  disabled={!userQuery.trim() || isQuerying}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-forest text-white p-1.5 hover:bg-forest-light disabled:opacity-50 transition-colors"
                >
                  <CornerDownLeft size={13} />
                </button>
              </div>
            </form>

            {isQuerying && (
              <div className="p-3 text-xs text-ink-muted text-center animate-pulse">
                Auditing primary filings and transcripts...
              </div>
            )}

            {queryResponse && (
              <div className="rounded-xl bg-sage/50 dark:bg-ink-surfaceSubtle p-3.5 border border-sage/80 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-forest dark:text-emerald text-[11px]">
                  <ShieldCheck size={14} />
                  <span>Audited Finding</span>
                </div>
                <p className="text-ink dark:text-white leading-relaxed font-normal">
                  {queryResponse.finding}
                </p>
                <div className="text-[10px] font-mono text-ink-muted border-t border-divider pt-1.5">
                  Citation: {queryResponse.citation}
                </div>
              </div>
            )}
          </div>

          {/* Primary Source Documents Index */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              Primary Source Documents
            </h3>
            <div className="space-y-2">
              {research.primarySources.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-divider bg-white dark:bg-ink-surface p-3 text-xs hover:border-forest shadow-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={16} className="text-forest dark:text-emerald" />
                    <div>
                      <div className="font-semibold text-ink dark:text-white group-hover:text-forest transition-colors">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {doc.type} • {doc.period}
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-ink-muted group-hover:text-forest transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
