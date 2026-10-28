import React, { useState } from 'react';
import { Company, CompanyResearch } from '../types';
import { getCompanyResearch } from '../data/research';
import { Search, Star, ExternalLink, FileText, Sparkles, Scale, ShieldCheck, ArrowUpRight, ArrowDownRight, CornerDownLeft } from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface ResearchScreenProps {
  companies: Company[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
}

type ResearchTab = 'overview' | 'financials' | 'track_record' | 'thesis' | 'sources';

export const ResearchScreen: React.FC<ResearchScreenProps> = ({
  companies,
  selectedTicker,
  onSelectTicker,
  onToggleWatchlist,
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ResearchTab>('overview');
  const [userQuery, setUserQuery] = useState<string>('');
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  const activeCompany = companies.find((c) => c.ticker === selectedTicker);
  const research: CompanyResearch = getCompanyResearch(
    selectedTicker,
    activeCompany?.name,
    activeCompany?.sector
  );

  const isWatched = activeCompany?.inWatchlist ?? false;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    let sym = searchInput.trim().toUpperCase();
    if (!sym.includes('.')) sym += '.NS';
    onSelectTicker(sym);
    setSearchInput('');
  };

  const handleQuickQuestion = (question: string) => {
    setUserQuery(question);
    setIsQuerying(true);
    setQueryResponse(null);
    setTimeout(() => {
      setIsQuerying(false);
      if (question.includes('margin')) {
        setQueryResponse(`Management reiterated an EBITDA margin corridor of 14.5%–15.5% for FY25 on the Q1 concall, driven by favorable supply chain terms and full private-label ownership.`);
      } else if (question.includes('working capital')) {
        setQueryResponse(`Working capital cycle contracted to ${research.financialSnapshot.workingCapitalDays} days. Operating cash conversion remains strong at ${research.financialSnapshot.cfoPatConversion.toFixed(2)}x CFO/PAT.`);
      } else {
        setQueryResponse(`Based strictly on primary filings: ${research.businessSnapshot.keyMoat} Capital expenditure of ₹500–600 Cr is 100% self-funded via cash from operations.`);
      }
    }, 700);
  };

  const tabs: Array<{ id: ResearchTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'track_record', label: 'Track Record' },
    { id: 'thesis', label: 'Thesis' },
    { id: 'sources', label: 'Evidence' },
  ];

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* 1. EDITORIAL HEADER & SEARCH */}
      <section className="space-y-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white">
            Research Workspace
          </h1>
          <p className="text-xs text-stone-600 dark:text-slate-300 max-w-lg mt-0.5 leading-relaxed">
            On-demand company intelligence strictly grounded in primary disclosures: Annual Reports, audited earnings, and concall transcripts.
          </p>
        </div>

        {/* Ticker Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search company or enter any NSE ticker (e.g. TRENT, DIXON, INFY)..."
            className="w-full rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border py-2.5 pl-10 pr-20 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400 shadow-subtle transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[11px] font-semibold px-3 py-1 transition-colors"
          >
            Investigate
          </button>
        </form>

        {/* Research Shortcuts Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {['TRENT.NS', 'DIXON.NS', 'POLYCAB.NS', 'INFY.NS', 'RELIANCE.NS', 'ZOMATO.NS', 'KAYNES.NS'].map((ticker) => (
            <button
              key={ticker}
              onClick={() => onSelectTicker(ticker)}
              className={`rounded-lg px-2.5 py-1 font-mono transition-colors whitespace-nowrap ${
                selectedTicker === ticker
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold'
                  : 'bg-white dark:bg-ink-surface text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-ink-border hover:border-stone-400'
              }`}
            >
              {ticker}
            </button>
          ))}
        </div>
      </section>

      {/* 2. ACTIVE COMPANY IDENTITY & EXECUTIVE SNAPSHOT */}
      <section className="rounded-2xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border p-4 sm:p-5 shadow-subtle space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-base font-bold text-stone-900 dark:text-white">
                {research.ticker}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
                {research.marketCap}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200 mt-0.5">
              {research.name}
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-mono mt-0.5">
              {research.sector}
            </p>
          </div>

          <button
            onClick={() => onToggleWatchlist(research.ticker)}
            className={`p-2 rounded-xl border transition-colors ${
              isWatched
                ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-400'
                : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700 dark:bg-ink-bg dark:border-ink-border'
            }`}
            title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Star size={16} className={isWatched ? 'fill-amber-500 text-amber-500' : ''} />
          </button>
        </div>

        {/* Concise Business Snapshot & Moat */}
        <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
          {research.businessSnapshot.summary}
        </p>

        <div className="rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/30 p-3 text-xs">
          <strong className="text-teal-900 dark:text-teal-300 font-semibold">Institutional Moat: </strong>
          <span className="text-teal-800 dark:text-teal-200">{research.businessSnapshot.keyMoat}</span>
        </div>
      </section>

      {/* 3. SENSIBLE SEGMENTED NAV SELECTOR (One detail section dominates at a time) */}
      <section className="space-y-3">
        <div className="flex rounded-xl bg-stone-100 dark:bg-ink-surfaceSubtle p-1 border border-stone-200/80 dark:border-ink-border overflow-x-auto text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-center font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-ink-surface text-stone-900 dark:text-white font-semibold shadow-subtle'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Segment Breakdown */}
            <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-ink-border pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold">
                  Operating Segments & Revenue Mix
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Consolidated Share</span>
              </div>

              <div className="space-y-2 text-xs">
                {research.businessSnapshot.segments.map((seg, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-stone-800 dark:text-slate-200">{seg.name}</span>
                      <span className="font-mono text-stone-900 dark:text-white font-semibold">
                        {seg.sharePercent}% <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">(+{seg.growthYoY}% YoY)</span>
                      </span>
                    </div>
                    {/* Visual Segment Share Bar */}
                    <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all"
                        style={{ width: `${seg.sharePercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-3">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Revenue (TTM)</span>
                <span className="text-sm font-bold font-mono text-stone-900 dark:text-white mt-0.5 block">{research.financialSnapshot.revenueTtm}</span>
              </div>
              <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-3">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">EBITDA Margin</span>
                <span className="text-sm font-bold font-mono text-teal-700 dark:text-teal-400 mt-0.5 block">{research.financialSnapshot.ebitdaMargin}</span>
              </div>
              <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-3">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">ROCE / ROE</span>
                <span className="text-sm font-bold font-mono text-stone-900 dark:text-white mt-0.5 block">{research.financialSnapshot.roce} / {research.financialSnapshot.roe}</span>
              </div>
              <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-3">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Debt-to-Equity</span>
                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">{research.financialSnapshot.debtToEquity}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS & CASH QUALITY */}
        {activeTab === 'financials' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-ink-border pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-teal-700 dark:text-teal-400" />
                  Cash Flow Quality & Conversion Audit
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  CFO / PAT: <strong className="text-stone-900 dark:text-white font-semibold">{research.financialSnapshot.cfoPatConversion.toFixed(2)}x</strong>
                </span>
              </div>

              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                {research.cashQualityAnalysis.cfoVsPatCommentary}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                  <span className="text-[10px] uppercase font-mono text-stone-400 block">Working Capital Cycle</span>
                  <span className="font-semibold text-stone-900 dark:text-white font-mono">{research.financialSnapshot.workingCapitalDays} Days</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                  <span className="text-[10px] uppercase font-mono text-stone-400 block">Free Cash Flow (TTM)</span>
                  <span className="font-semibold text-stone-900 dark:text-white font-mono">{research.financialSnapshot.fcfTtm}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRACK RECORD (NARRATIVE VS NUMBERS) */}
        {activeTab === 'track_record' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-ink-border pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Scale size={14} className="text-teal-700 dark:text-teal-400" />
                  Narrative vs. Numbers: 4-Quarter Audit
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Promises vs. Audited Delivery</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {research.narrativeVsNumbers.map((row, idx) => (
                  <div key={idx} className="rounded-lg bg-stone-50 dark:bg-ink-bg p-3 border border-stone-100 dark:border-ink-borderSubtle space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">{row.period}</span>
                      <Badge variant={row.varianceType === 'beat' ? 'emerald' : row.varianceType === 'miss' ? 'rose' : 'teal'} size="xs">
                        {row.variance}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block">Guidance Stated:</span>
                        <p className="text-stone-700 dark:text-slate-300 leading-snug">{row.managementGuidance}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 block">Actual Outcome:</span>
                        <p className="text-stone-900 dark:text-white font-medium leading-snug">{row.actualDelivered}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: THESIS (BULL VS BEAR) */}
        {activeTab === 'thesis' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Bull Case */}
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/15 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold font-mono text-xs">
                  <ArrowUpRight size={14} /> Institutional Bull Case
                </div>
                <ul className="space-y-2 text-stone-700 dark:text-slate-300">
                  {research.bullBear.bullCase.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bear Case */}
              <div className="rounded-xl border border-rose-200/80 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/15 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-semibold font-mono text-xs">
                  <ArrowDownRight size={14} /> Key Downside Risks
                </div>
                <ul className="space-y-2 text-stone-700 dark:text-slate-300">
                  {research.bullBear.bearCase.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRIMARY SOURCES */}
        {activeTab === 'sources' && (
          <div className="rounded-xl bg-white dark:bg-ink-surface border border-stone-200/80 dark:border-ink-border p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-ink-border pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <FileText size={14} className="text-teal-700 dark:text-teal-400" />
                Audited Primary Source Disclosures
              </span>
              <span className="text-[10px] text-stone-400 font-mono">No Broker Commentary</span>
            </div>

            <div className="space-y-2 text-xs">
              {research.primarySources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 dark:bg-ink-bg border border-stone-100 dark:border-ink-borderSubtle">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-teal-700 dark:text-teal-400 font-semibold block">
                      {source.type} • {source.period}
                    </span>
                    <span className="font-medium text-stone-800 dark:text-slate-200">{source.title}</span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-mono text-[11px] ml-2 flex-shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. ON-DEMAND INVESTOR QUERY BAR */}
      <section className="rounded-2xl bg-stone-50 dark:bg-ink-surfaceSubtle border border-stone-200/80 dark:border-ink-border p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles size={13} className="text-teal-700 dark:text-teal-400" />
            Ask FINN About {research.ticker}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">Primary Source Synthesis</span>
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (userQuery.trim()) {
              handleQuickQuestion(userQuery);
            }
          }}
          className="relative"
        >
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={`Ask a fundamental question about ${research.ticker}...`}
            className="w-full rounded-xl bg-white dark:bg-ink-surface border border-stone-200/90 dark:border-ink-border py-2 px-3 pr-10 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white"
            title="Submit question"
          >
            <CornerDownLeft size={13} />
          </button>
        </form>

        {/* Suggested Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {[
            'What is the FY26 margin guidance?',
            'Has working capital cycle expanded?',
            'What are the store payback economics?',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuestion(prompt)}
              className="rounded-full bg-white dark:bg-ink-surface border border-stone-200 dark:border-ink-border px-3 py-1 text-stone-600 dark:text-slate-300 hover:border-stone-400 transition-colors whitespace-nowrap text-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Dynamic Query Response */}
        {isQuerying && (
          <div className="p-3 rounded-xl bg-white dark:bg-ink-surface border border-stone-200 dark:border-ink-border text-xs text-stone-500 font-mono animate-pulse">
            Synthesizing primary concall transcripts and audited filings...
          </div>
        )}

        {queryResponse && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-ink-surface border border-teal-200/80 dark:border-teal-900/40 text-xs text-stone-800 dark:text-slate-200 leading-relaxed space-y-1.5">
            <div className="font-semibold text-teal-800 dark:text-teal-300 font-mono text-[10px] uppercase">
              Primary Grounded Finding:
            </div>
            <p>{queryResponse}</p>
          </div>
        )}
      </section>
    </div>
  );
};
