import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, ChevronRight, CloudDownload, ExternalLink, FileText, Globe, Minus, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useCompanySearch, useEvidence, useFinancialAnalysis, useHealth, useImportCompany, usePortfolio, useRefreshCompany, useResearch, useResearchJob, useStartResearch } from '../lib/queries';
import { dateTime, humanize, inr, relativeTime, shortDate } from '../lib/format';
import type { Claim, FinancialAnalysis, Freshness, Quote, ResearchJob, ResearchReport, ResearchResponse, ResearchSection, SectionKey, SectionProgress } from '../lib/types';
import { useToast } from '../components/common/Toast';
import { IntelligenceOverview, InsightCards, SourceLine } from '../components/research/Overview';
import { FinnIntelligence } from '../components/research/FinnIntelligence';
import { ResearchCharts } from '../components/research/ResearchCharts';
import { AskFinn } from '../components/research/AskFinn';
import { StatementTable } from '../components/research/StatementTable';
import { EASE_OUT } from '../components/motion';
import { Change, ClaimTag, DemoPill, EmptyState, ErrorState, Eyebrow, LoadingBlock, Panel, PrimaryButton, ScreenTitle, SecondaryButton, Skeleton, Spinner, Ticker, cx, inputCls } from '../components/ui';
import { CompanyLogo } from '../components/company/CompanyLogo';

const SECTIONS: Array<{ key: SectionKey; letter: string; title: string; short: string }> = [
  { key: 'summary', letter: '★', title: 'Overall research summary', short: 'Summary' },
  { key: 'businessSnapshot', letter: 'A', title: 'Business snapshot', short: 'Business' },
  { key: 'financialSnapshot', letter: 'B', title: 'Financial snapshot', short: 'Financials' },
  { key: 'businessTrajectory', letter: 'C', title: 'Business trajectory', short: 'Trajectory' },
  { key: 'balanceSheet', letter: 'D', title: 'Balance sheet analysis', short: 'Balance sheet' },
  { key: 'cashQuality', letter: 'E', title: 'Quality of cash', short: 'Cash' },
  { key: 'narrativeVsNumbers', letter: 'F', title: 'Narrative vs numbers', short: 'Narrative' },
  { key: 'forwardGuidance', letter: 'G', title: 'Forward guidance', short: 'Guidance' },
  { key: 'bullBear', letter: 'H', title: 'Bull vs bear', short: 'Bull vs bear' },
  { key: 'investmentRisks', letter: 'I', title: 'Investment risk assessment', short: 'Risks' },
];

const TIMING_LABEL: Record<string, string> = {
  end_of_day: 'End-of-day close',
  delayed: 'Delayed quote',
  realtime: 'Real-time quote',
  synthetic: 'Synthetic demo price',
  unknown: 'Quote timing unknown',
};

interface Props {
  companyId: string | null;
  onSelectCompany: (id: string | null) => void;
  onOpenCompany: (id: string) => void;
}

export const ResearchScreen: React.FC<Props> = ({ companyId, onSelectCompany, onOpenCompany }) => {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [reportId, setReportId] = useState<string | undefined>();
  const [jobId, setJobId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);
  useEffect(() => {
    setReportId(undefined);
    setJobId(null);
  }, [companyId]);

  const search = useCompanySearch(debounced);
  const importCompany = useImportCompany();
  const research = useResearch(companyId, reportId);
  const start = useStartResearch(companyId);
  const job = useResearchJob(jobId, companyId);
  const refresh = useRefreshCompany(companyId);
  const health = useHealth();
  const analysis = useFinancialAnalysis(companyId);
  const aiConfigured = Boolean(health.data?.ai.configured);
  const toast = useToast();
  const report = research.data?.report ?? null;

  // A job started before a reload (or in another tab) is picked up and shown in progress.
  const activeJobId = research.data?.activeJob?.id;
  useEffect(() => {
    if (activeJobId && !jobId) setJobId(activeJobId);
  }, [activeJobId, jobId]);

  const current = job.data;
  const running = start.isPending || Boolean(current && (current.status === 'queued' || current.status === 'running'));
  const finished = current?.status === 'succeeded' ? current.id : null;
  useEffect(() => {
    if (!finished || !current) return;
    setReportId(current.reportId ?? undefined);
    setJobId(null);
    toast(current.reused ? 'Research is up to date — nothing changed since the last report' : 'Research report ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const pickExternal = (symbol: string) =>
    importCompany.mutate(symbol, {
      onSuccess: (r) => {
        setTerm('');
        onSelectCompany(r.company.id);
      },
    });

  const run = (mode: 'generate' | 'refresh') => start.mutate({ mode }, { onSuccess: (r) => setJobId(r.job.id) });

  return (
    <div className="space-y-5 pt-5">
      {!companyId && <ScreenTitle title="Research" />}

      {/* Search */}
      <div className="relative">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          className={cx(inputCls, 'pl-10 pr-10')}
          placeholder="Search companies"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Search companies"
        />
        {term && (
          <button onClick={() => setTerm('')} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink-muted" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {debounced.trim() && (
        <Panel padded={false} className="overflow-hidden">
          {search.isLoading ? (
            <div className="flex items-center gap-2 p-4 text-xs text-ink-muted">
              <Spinner size={14} /> Searching FINN and Yahoo Finance…
            </div>
          ) : search.isError ? (
            <div className="p-4">
              <ErrorState error={search.error} />
            </div>
          ) : (
            <>
              {(search.data?.items.length ?? 0) > 0 && (
                <ul className="divide-y divide-divider dark:divide-ink-border">
                  {search.data!.items.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          onSelectCompany(c.id);
                          setTerm('');
                        }}
                        className="flex min-h-[56px] w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyLogo {...c} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Ticker symbol={c.nseSymbol ?? c.yahooSymbol} />
                              {c.bseCode && <span className="font-mono text-[10px] text-ink-muted">BSE {c.bseCode}</span>}
                            </div>
                            <div className="truncate text-xs text-ink-muted">{c.name}</div>
                          </div>
                        </div>
                        {c.isDemo && <DemoPill />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(search.data?.external?.length ?? 0) > 0 && (
                <div className="border-t border-divider dark:border-ink-border">
                  <div className="flex items-center gap-1.5 px-4 pt-3 text-2xs font-medium uppercase tracking-eyebrow text-ink-subtle">
                    <Globe size={12} /> From Yahoo Finance
                  </div>
                  <ul className="divide-y divide-divider dark:divide-ink-border">
                    {search.data!.external!.map((c) => (
                      <li key={c.yahooSymbol ?? c.name}>
                        <button
                          onClick={() => c.yahooSymbol && pickExternal(c.yahooSymbol)}
                          disabled={importCompany.isPending}
                          className="flex min-h-[56px] w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-cream-light disabled:opacity-60 dark:hover:bg-ink-surfaceSubtle"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CompanyLogo {...c} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Ticker symbol={c.yahooSymbol} />
                                <span className="text-[10px] text-ink-muted">{c.exchange}</span>
                              </div>
                              <div className="truncate text-xs text-ink-muted">{c.name}</div>
                            </div>
                          </div>
                          {importCompany.isPending && importCompany.variables === c.yahooSymbol ? (
                            <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                              <Spinner size={12} /> Retrieving data…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest dark:text-emerald">
                              <CloudDownload size={13} /> Research
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(search.data?.items.length ?? 0) === 0 && (search.data?.external?.length ?? 0) === 0 && (
                <div className="p-4 text-xs leading-relaxed text-ink-muted">
                  No listed company matches “{debounced}”. Try the NSE symbol (e.g. ASIANPAINT) or the company name. BSE numeric codes resolve only for companies already in FINN.
                </div>
              )}
              {importCompany.isError && (
                <div className="border-t border-divider p-3 dark:border-ink-border">
                  <ErrorState error={importCompany.error} />
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {!companyId ? (
        <PortfolioPicks onPick={onSelectCompany} />
      ) : research.isLoading ? (
        <LoadingBlock rows={5} />
      ) : research.isError || !research.data ? (
        <ErrorState error={research.error} onRetry={() => research.refetch()} />
      ) : (
        <>
          <CompanyHeader
            data={research.data}
            onClose={() => onSelectCompany(null)}
            onOpenCompany={() => onOpenCompany(companyId)}
            refreshing={refresh.isPending}
            onRefreshData={() => refresh.mutate()}
          />

          <div className="flex flex-col gap-2 xs:flex-row">
            {report ? (
              <>
                <PrimaryButton busy={running} onClick={() => run('refresh')} className="flex-1">
                  <RefreshCw size={14} strokeWidth={1.75} /> Refresh research
                </PrimaryButton>
                {research.data.history.length > 1 && (
                  <select
                    className="min-h-[44px] w-full min-w-0 truncate rounded-lg border border-divider bg-paper px-2 text-[12px] xs:w-[46%] dark:border-ink-border dark:bg-ink-surfaceSubtle"
                    value={report.id}
                    onChange={(e) => setReportId(e.target.value)}
                    aria-label="Report version"
                  >
                    {research.data.history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {dateTime(h.createdAt)} · {h.generator}
                      </option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              <PrimaryButton busy={running} onClick={() => run('generate')} className="flex-1">
                <Sparkles size={14} strokeWidth={1.75} /> Generate research
              </PrimaryButton>
            )}
          </div>
          {refresh.isError && <ErrorState error={refresh.error} />}
          {start.isError && <ErrorState error={start.error} />}
          {current?.status === 'failed' && <ErrorState error={new Error(current.error ?? 'Research generation failed.')} onRetry={() => run(report ? 'refresh' : 'generate')} />}
          {!health.data?.ai.configured && (
            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              AI is not configured ({health.data?.ai.reason ?? 'no provider'}). Reports contain reported facts and calculated metrics; AI sections are marked unavailable until an AI key is added on the server.
            </p>
          )}

          <AnimatePresence>
            {running && <AnalysisProgress job={current ?? null} companyName={research.data.company.name} aiLabel={health.data?.ai.configured ? health.data.ai.label : null} />}
          </AnimatePresence>

          {running ? (
            current?.partial ? (
              <ReportView report={liveReport(current)} companyId={companyId} companyName={research.data.company.name} analysis={analysis} aiConfigured={aiConfigured} progress={current.progress} live />
            ) : (
              <LoadingBlock rows={4} />
            )
          ) : !report ? (
            <ResearchSummary companyId={companyId} companyName={research.data.company.name} analysis={analysis} report={null} aiConfigured={aiConfigured} />
          ) : (
            <ReportView report={report} companyId={companyId} companyName={research.data.company.name} analysis={analysis} aiConfigured={aiConfigured} />
          )}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const CompanyHeader: React.FC<{ data: ResearchResponse; onClose: () => void; onOpenCompany: () => void; refreshing: boolean; onRefreshData: () => void }> = ({ data, onClose, onOpenCompany, refreshing, onRefreshData }) => {
  const c = data.company;
  const q = data.quote;
  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpenCompany} className="group flex min-w-0 items-start gap-4 text-left">
          <CompanyLogo {...c} size="lg" className="mt-1" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Ticker symbol={c.yahooSymbol ?? c.nseSymbol} />
              {c.exchange && <span className="text-[11px] text-ink-subtle">{c.exchange}</span>}
              {c.isDemo && <DemoPill />}
            </span>
            <h1 className="mt-1.5 font-serif text-[28px] leading-[1.1] text-forest-dark transition-colors group-hover:text-forest dark:text-white">{c.name}</h1>
            <span className="mt-1 block text-[12.5px] text-ink-muted">{[c.sector, c.industry, c.country].filter(Boolean).join(' · ') || 'Sector not available'}</span>
          </span>
        </button>
        <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle" aria-label="Close research">
          <X size={18} />
        </button>
      </div>

      {q && <QuoteStrip quote={q} />}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 dark:border-ink-border">
        <FreshnessLine items={data.freshness} />
        <button onClick={onRefreshData} disabled={refreshing} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-forest disabled:opacity-60 dark:text-emerald">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing from Yahoo…' : 'Refresh data'}
        </button>
      </div>
    </Panel>
  );
};

const QuoteStrip: React.FC<{ quote: Quote }> = ({ quote: q }) => {
  const range = q.fiftyTwoWeekHigh && q.fiftyTwoWeekLow ? q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow : null;
  const pos = range ? ((q.lastPrice - q.fiftyTwoWeekLow!) / range) * 100 : null;
  const mcapCr = q.marketCap ? q.marketCap / (q.currency === 'INR' ? 1e7 : 1e6) : null;
  return (
    <div className="grid gap-4">
      <div>
        <div className="font-mono text-[30px] font-medium leading-none text-ink dark:text-white">{inr(q.lastPrice)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
          <Change value={q.changePercent} />
          <span className="text-ink-muted">
            {TIMING_LABEL[q.quoteTiming ?? 'end_of_day']} · {shortDate(q.tradeDate)}
            {q.quoteTiming === 'delayed' && q.delayMinutes ? ` · ~${q.delayMinutes} min delay` : ''}
          </span>
          {q.isDemo && <DemoPill />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px]">
        <div>
          <Eyebrow>Prev. close</Eyebrow>
          <div className="mt-0.5 font-mono text-ink dark:text-ink-light">{inr(q.previousClose)}</div>
        </div>
        <div>
          <Eyebrow>Market cap</Eyebrow>
          <div className="mt-0.5 font-mono text-ink dark:text-ink-light">{mcapCr ? `₹${Math.round(mcapCr).toLocaleString('en-IN')} Cr` : 'Data unavailable'}</div>
        </div>
        <div>
          <Eyebrow>Avg volume</Eyebrow>
          <div className="mt-0.5 font-mono text-ink dark:text-ink-light">{q.averageVolume ? Math.round(q.averageVolume).toLocaleString('en-IN') : 'Data unavailable'}</div>
        </div>
        {pos !== null && (
          <div className="col-span-2">
            <div className="flex justify-between font-mono text-[10.5px] text-ink-muted">
              <span>52W low {inr(q.fiftyTwoWeekLow)}</span>
              <span>52W high {inr(q.fiftyTwoWeekHigh)}</span>
            </div>
            <div className="relative mt-1 h-1 rounded-full bg-cream-dark dark:bg-ink-surfaceSubtle">
              <div className="absolute -top-1 h-3 w-[3px] rounded-full bg-forest dark:bg-emerald" style={{ left: `calc(${Math.min(100, Math.max(0, pos))}% - 1.5px)` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FreshnessLine: React.FC<{ items: Freshness[] }> = ({ items }) => {
  if (items.length === 0) return <span className="text-[11px] text-ink-muted">No live data retrieved yet</span>;
  const ok = items.filter((i) => i.status === 'ok');
  const failed = items.filter((i) => i.status === 'failed');
  const newest = ok.reduce<string | null>((m, i) => (!m || i.fetchedAt > m ? i.fetchedAt : m), null);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
      <span className={cx('h-1.5 w-1.5 rounded-full', failed.length ? 'bg-fin-amber' : 'bg-fin-up')} />
      {newest ? `Data updated ${relativeTime(newest)} · Yahoo Finance (yfinance)` : 'Data not yet retrieved'}
      {failed.length > 0 && <span className="text-fin-amber">· {failed.map((f) => f.dataset).join(', ')} refresh failed</span>}
    </span>
  );
};

const STAGES: Array<{ id: ResearchJob['stage'][]; label: string }> = [
  { id: ['queued', 'data'], label: 'Retrieving market data and financial statements' },
  { id: ['analysis'], label: 'Computing metrics from reported figures' },
  { id: ['ai'], label: 'Generating evidence-cited analysis' },
  { id: ['saving', 'done'], label: 'Verifying citations and saving' },
];

/** A stored report shape built from the sections a running job has completed so far. */
const liveReport = (job: ResearchJob): ResearchReport => ({
  id: job.id,
  companyId: job.companyId,
  status: 'partial',
  generator: 'in progress',
  sections: job.partial!,
  limitations: [],
  dataAsOf: null,
  isDemo: false,
  createdAt: job.createdAt,
});

const AnalysisProgress: React.FC<{ job: ResearchJob | null; companyName: string; aiLabel: string | null }> = ({ job, companyName, aiLabel }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = job ? new Date(job.createdAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job?.createdAt]);
  const stageIndex = job ? STAGES.findIndex((st) => st.id.includes(job.stage)) : 0;
  const stages = aiLabel ? STAGES : STAGES.filter((st) => !st.id.includes('ai'));
  const current = aiLabel ? stageIndex : Math.min(stageIndex, stages.length - 1);
  const progress = job?.progress ?? {};
  const aiPending = SECTIONS.filter((s) => progress[s.key] === 'loading');
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      <Panel className="space-y-4" as="section" aria-live="polite" aria-label="Research in progress">
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-forest dark:bg-emerald-subtle dark:text-emerald">
            <Sparkles size={15} strokeWidth={1.75} />
            <span className="absolute inset-0 animate-ping rounded-full bg-forest/10 dark:bg-emerald/10" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-serif text-[19px] leading-tight text-forest-dark dark:text-white">FINN Intelligence is analyzing {companyName}…</div>
            <div className="mt-0.5 text-[11.5px] text-ink-muted">
              {aiLabel ? `${aiLabel} · ` : 'Facts and metrics only (AI not configured) · '}
              <span className="font-mono">{elapsed}s</span>
            </div>
          </div>
        </div>
        <ol className="space-y-1.5 text-[12.5px]">
          {stages.map((st, k) => (
            <li key={st.label} className={cx('flex items-center gap-2', k < current ? 'text-forest dark:text-emerald' : k === current ? 'text-ink dark:text-white' : 'text-ink-subtle')}>
              {k < current ? <Check size={13} strokeWidth={2.25} /> : k === current ? <Spinner size={13} /> : <span className="mx-[3px] h-1.5 w-1.5 rounded-full bg-divider dark:bg-ink-border" />}
              {st.label}
              {st.id.includes('ai') && k === current && aiPending.length > 0 && <span className="text-ink-muted">· {aiPending.length} section{aiPending.length === 1 ? '' : 's'} left</span>}
            </li>
          ))}
        </ol>
        {job?.partial && (
          <div className="flex flex-wrap gap-1.5" aria-label="Section status">
            {SECTIONS.map((s) => (
              <SectionChip key={s.key} letter={s.letter} title={s.title} state={progress[s.key] ?? job.partial?.[s.key]?.status ?? 'loading'} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink-muted">Sections appear as they complete. You can keep using FINN — progress continues in the background.</p>
      </Panel>
    </motion.div>
  );
};

const SectionChip: React.FC<{ letter: string; title: string; state: SectionProgress }> = ({ letter, title, state }) => (
  <span
    title={`${title}: ${state === 'loading' ? 'analyzing' : state}`}
    className={cx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
      state === 'loading' && 'bg-cream-dark text-ink-muted dark:bg-ink-surfaceSubtle',
      state === 'available' && 'bg-sage text-forest dark:bg-emerald-subtle dark:text-emerald',
      state === 'partial' && 'bg-fin-amber/10 text-fin-amber',
      state === 'unavailable' && 'bg-cream-dark/60 text-ink-subtle dark:bg-ink-surfaceSubtle',
    )}
  >
    <span className="font-mono">{letter}</span>
    {state === 'loading' ? <Spinner size={10} /> : state === 'unavailable' ? <Minus size={10} /> : <Check size={10} strokeWidth={2.5} />}
  </span>
);

// ---------------------------------------------------------------------------

type AnalysisQuery = ReturnType<typeof useFinancialAnalysis>;

const ReportView: React.FC<{
  report: ResearchReport;
  companyId: string;
  companyName: string;
  analysis: AnalysisQuery;
  aiConfigured: boolean;
  progress?: Partial<Record<SectionKey, SectionProgress>>;
  live?: boolean;
}> = ({ report, companyId, companyName, analysis, aiConfigured, progress, live }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['financialSnapshot']));
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  // Category navigation: open the section, then bring it to the top of the screen.
  const jump = (k: string) => {
    setOpen((s) => new Set(s).add(k));
    requestAnimationFrame(() => document.getElementById(`research-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const navItems = [
    { key: 'summary', label: 'Summary' },
    ...SECTIONS.filter((s) => s.key !== 'summary' && report.sections[s.key]).map((s) => ({ key: s.key as string, label: s.short })),
    ...(live ? [] : [{ key: 'evidence', label: 'Evidence' }]),
  ];

  return (
    <div className="space-y-4">
      <nav aria-label="Research sections" className="sticky top-0 z-10 -mx-4 border-b border-divider/70 bg-cream/95 px-4 py-2 backdrop-blur dark:border-ink-border dark:bg-ink-bg/95">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => jump(n.key)}
              className="min-h-[32px] shrink-0 rounded-full border border-divider bg-paper px-3 text-[12px] font-medium text-ink-muted transition-colors hover:border-forest/40 hover:text-forest dark:border-ink-border dark:bg-ink-surface dark:hover:text-emerald"
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {!live && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
          <span className="font-mono">{report.generator}</span>
          <span>· generated {dateTime(report.createdAt)}</span>
          {report.dataAsOf && <span>· data as of {dateTime(report.dataAsOf)}</span>}
          {report.isDemo && <DemoPill />}
        </div>
      )}

      {report.limitations.length > 0 && (
        <div className="space-y-1 border-l-2 border-fin-amber/60 pl-3.5 text-[11.5px] leading-relaxed text-ink-muted">
          <div className="flex items-center gap-1.5 font-semibold text-fin-amber">
            <AlertCircle size={13} /> Limitations
          </div>
          <ul className="list-disc space-y-0.5 pl-4">
            {report.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      <ResearchSummary companyId={companyId} companyName={companyName} analysis={analysis} report={report} aiConfigured={aiConfigured} summaryProgress={progress?.summary} live={live} />

      <div className="space-y-2.5">
        <h3 className="px-0.5 pt-2 font-serif text-[20px] leading-tight text-forest-dark dark:text-white">Detailed analysis</h3>
        {SECTIONS.map((s) => {
          const section = report.sections[s.key];
          if (!section || s.key === 'summary') return null;
          const isOpen = open.has(s.key);
          const loading = progress?.[s.key] === 'loading';
          return (
            <section key={s.key} id={`research-${s.key}`} className="scroll-mt-14 overflow-hidden rounded-card border border-divider bg-paper dark:border-ink-border dark:bg-ink-surface">
              <button onClick={() => toggle(s.key)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className="w-5 shrink-0 font-mono text-[11px] text-ink-subtle">{s.letter}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[17px] leading-tight text-forest-dark dark:text-white">{s.title}</span>
                  <span className="text-[11px] text-ink-muted">
                    {loading ? 'FINN Intelligence is writing this section…' : section.status === 'unavailable' ? 'Unavailable' : `${section.claims.length} item${section.claims.length === 1 ? '' : 's'}`}
                  </span>
                </span>
                {loading ? (
                  <span className="hidden shrink-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted xs:inline-flex">
                    <Spinner size={11} /> Analyzing
                  </span>
                ) : (
                  <StatusDot status={section.status} />
                )}
                <ChevronDown size={16} className={cx('shrink-0 text-ink-subtle transition-transform duration-200', isOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: EASE_OUT }} className="overflow-hidden">
                    <div className="space-y-4 border-t border-divider px-4 py-4 dark:border-ink-border">
                      {loading && section.status === 'unavailable' ? null : <SectionBody sectionKey={s.key} section={section} analysis={analysis.data} />}
                      {loading && (
                        <div className="space-y-2" role="status" aria-label="Analysis in progress">
                          <Skeleton className="h-3 w-11/12" />
                          <Skeleton className="h-3 w-9/12" />
                          <Skeleton className="h-3 w-10/12" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {!live && (
          <section id="research-evidence" className="scroll-mt-14 overflow-hidden rounded-card border border-divider bg-paper dark:border-ink-border dark:bg-ink-surface">
            <button onClick={() => toggle('evidence')} aria-expanded={open.has('evidence')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <span className="w-5 shrink-0 font-mono text-[11px] text-ink-subtle">J</span>
              <span className="flex-1 font-serif text-[18px] leading-tight text-forest-dark dark:text-white">Research evidence</span>
              <ChevronDown size={16} className={cx('shrink-0 text-ink-subtle transition-transform duration-200', open.has('evidence') && 'rotate-180')} />
            </button>
            {open.has('evidence') && (
              <div className="border-t border-divider px-4 py-4 dark:border-ink-border">
                <EvidencePanel companyId={companyId} reportId={report.id} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

/**
 * Research summary: executive overview and period comparisons (calculated, always available),
 * FINN Intelligence (AI, from the report), the five financial charts and Ask FINN.
 */
const ResearchSummary: React.FC<{
  companyId: string;
  companyName: string;
  analysis: ReturnType<typeof useFinancialAnalysis>;
  report: ResearchReport | null;
  aiConfigured: boolean;
  summaryProgress?: SectionProgress;
  live?: boolean;
}> = ({ companyId, companyName, analysis, report, aiConfigured, summaryProgress, live }) => {
  const a = analysis.data;
  const unanswered = (report?.sections.summary?.data as { unanswered?: string[] } | undefined)?.unanswered;
  const negative = a?.insights.find((i) => i.tone === 'negative');
  const openQuestion = unanswered?.[0]
    ? { text: unanswered[0], origin: 'ai' as const }
    : negative
      ? { text: `What explains “${negative.headline.toLowerCase()}”? FINN’s data has no segment split or management commentary to answer it.`, origin: 'data' as const }
      : null;
  return (
    <div id="research-summary" className="scroll-mt-14 space-y-4">
      {analysis.isLoading ? (
        <LoadingBlock rows={3} />
      ) : analysis.isError || !a ? (
        <ErrorState error={analysis.error} onRetry={() => analysis.refetch()} />
      ) : (
        <>
          {a.assessments.length > 0 && (
            <Panel as="section" className="space-y-3">
              <IntelligenceOverview analysis={a} openQuestion={openQuestion} />
              <SourceLine analysis={a} />
            </Panel>
          )}
          {(a.insights.length > 0 || a.annual.length > 0) && (
            <section aria-label="Key financial insights" className="space-y-3">
              <h3 className="px-0.5 font-serif text-[20px] leading-tight text-forest-dark dark:text-white">Key financial insights</h3>
              <InsightCards analysis={a} />
            </section>
          )}
        </>
      )}
      <Panel as="section" className="space-y-4">
        <FinnIntelligence report={report} progress={summaryProgress} latestPeriod={a?.latestPeriod ?? null} analysisDataAsOf={a?.dataAsOf ?? null} aiConfigured={aiConfigured} />
      </Panel>
      {a && (a.annual.length > 0 || a.quarterly.length > 0) && (
        <Panel as="section" className="space-y-4">
          <h3 className="font-serif text-[20px] leading-tight text-forest-dark dark:text-white">Financial trends</h3>
          <ResearchCharts analysis={a} />
          {a.gaps.length > 0 && (
            <ul className="space-y-1 border-t border-divider pt-3 text-[11px] leading-snug text-ink-subtle dark:border-ink-border">
              {a.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          <SourceLine analysis={a} />
        </Panel>
      )}
      {!live && (
        <Panel as="section">
          <AskFinn companyId={companyId} companyName={companyName} aiConfigured={aiConfigured} />
        </Panel>
      )}
    </div>
  );
};

const StatusDot: React.FC<{ status: ResearchSection['status'] }> = ({ status }) => (
  <span
    className={cx(
      'hidden shrink-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] xs:inline-flex',
      status === 'available' ? 'text-forest dark:text-emerald' : status === 'partial' ? 'text-fin-amber' : 'text-ink-subtle',
    )}
  >
    <span className={cx('h-1.5 w-1.5 rounded-full', status === 'available' ? 'bg-forest dark:bg-emerald' : status === 'partial' ? 'bg-fin-amber' : 'bg-ink-subtle')} />
    {status}
  </span>
);

const METRIC_SECTIONS: SectionKey[] = ['financialSnapshot', 'balanceSheet', 'cashQuality'];

/** A claim that is a single labelled figure, e.g. "ROCE: 28.4%" (rendered in the metric grid). */
const isMetricClaim = (c: Claim) =>
  c.claimType !== 'ai_interpretation' && c.label !== 'Business description' && ((c.value !== undefined && c.value !== null) || /^[^:]{2,40}: [₹$\d\-−+.,%×x a-zA-Z()]{1,40}$/.test(c.text));

const SectionBody: React.FC<{ sectionKey: SectionKey; section: ResearchSection; analysis?: FinancialAnalysis }> = ({ sectionKey, section, analysis }) => {
  const segments = (section.data as { segments?: Array<{ name: string; sharePercent: number; growthYoY: number }> } | undefined)?.segments;
  const unanswered = sectionKey === 'summary' ? (section.data as { unanswered?: string[] } | undefined)?.unanswered : undefined;
  return (
    <>
      {section.reason && <p className="text-[12px] leading-relaxed text-ink-muted">{section.reason}</p>}
      {METRIC_SECTIONS.includes(sectionKey) && <MetricGrid claims={section.claims} />}
      {sectionKey === 'financialSnapshot' && analysis && (analysis.annual.length > 0 || analysis.quarterly.length > 0) && <StatementTable analysis={analysis} />}
      {sectionKey === 'businessSnapshot' && segments && <Segments segments={segments} />}
      {sectionKey === 'bullBear' && section.claims.length > 0 ? (
        <BullBear claims={section.claims} />
      ) : sectionKey === 'narrativeVsNumbers' && Array.isArray(section.data) && section.data.length > 0 ? (
        <NarrativeTable rows={section.data as NarrativeRow[]} claims={section.claims} />
      ) : (
        <ClaimList
          claims={
            sectionKey === 'businessSnapshot'
              ? section.claims.filter((c) => c.label !== 'Segment')
              : METRIC_SECTIONS.includes(sectionKey)
                ? section.claims.filter((c) => !isMetricClaim(c))
                : section.claims
          }
        />
      )}
      {unanswered && unanswered.length > 0 && (
        <div className="rounded-xl bg-cream-light p-3 text-[12px] dark:bg-ink-surfaceSubtle">
          <Eyebrow>Important unanswered questions</Eyebrow>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-ink dark:text-ink-light">
            {unanswered.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const MetricGrid: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  const metrics = claims.filter(isMetricClaim);
  if (metrics.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-divider bg-divider dark:border-ink-border dark:bg-ink-border">
      {metrics.map((c, i) => {
        const [label, ...rest] = c.text.split(': ');
        const value = rest.join(': ').replace(/\s*\([^)]*\)\s*$/, '');
        return (
          <div key={i} className="bg-paper p-3.5 dark:bg-ink-surface" title={c.formula ? `Formula: ${c.formula}` : c.sourceTitle ?? undefined}>
            <Eyebrow className="block truncate">{c.label ?? label}</Eyebrow>
            <div className="mt-1.5 font-mono text-[16px] font-medium leading-tight text-ink dark:text-white">{value || 'Data unavailable'}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-subtle">
              <span className={c.claimType === 'calculated_metric' ? 'text-ink-muted' : c.claimType === 'reported_fact' ? 'text-forest dark:text-emerald' : 'text-fin-amber'}>
                {c.claimType === 'calculated_metric' ? 'Calculated' : c.claimType === 'reported_fact' ? 'Reported' : 'Demo note'}
              </span>
              {c.period && <span className="font-mono">· {c.period}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PortfolioPicks: React.FC<{ onPick: (id: string) => void }> = ({ onPick }) => {
  const portfolio = usePortfolio();
  const items = portfolio.data ?? [];
  if (portfolio.isLoading) return <LoadingBlock rows={2} />;
  if (items.length === 0) return <EmptyState title="Research any company" body="Search by name, NSE symbol or Yahoo ticker to open a structured research workspace." />;
  return (
    <section className="space-y-3">
      <Eyebrow>From your portfolio</Eyebrow>
      <ul className="divide-y divide-divider overflow-hidden rounded-card border border-divider bg-paper dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface">
        {items.map((h) => (
          <li key={h.id}>
            <button onClick={() => onPick(h.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream-light dark:hover:bg-ink-surfaceSubtle">
              <CompanyLogo {...h} size="sm" />
              <span className="min-w-0 flex-1">
                <Ticker symbol={h.nseSymbol} />
                <span className="block truncate text-[11.5px] text-ink-muted">{h.name}</span>
              </span>
              <Change value={h.quote?.changePercent} className="text-[11.5px]" />
              <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-subtle" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const ClaimList: React.FC<{ claims: Claim[] }> = ({ claims }) =>
  claims.length === 0 ? null : (
    <ul className="divide-y divide-divider dark:divide-ink-border">
      {claims.map((c, i) => (
        <li key={i} className="py-2.5 first:pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ClaimTag type={c.claimType} />
            {c.label && <Eyebrow>{c.label}</Eyebrow>}
          </div>
          <p className={cx('mt-1 leading-relaxed text-ink dark:text-ink-light', c.label === 'Business description' ? 'text-[13px]' : 'text-sm')}>{c.text}</p>
          {(c.formula || c.sourceTitle) && (
            <p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">
              {c.formula && <>Formula: {c.formula}</>}
              {c.formula && c.sourceTitle && ' · '}
              {c.sourceTitle && <>Source: {c.sourceTitle}</>}
            </p>
          )}
        </li>
      ))}
    </ul>
  );

const Segments: React.FC<{ segments: Array<{ name: string; sharePercent: number; growthYoY: number }> }> = ({ segments }) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-1.5">
      <Eyebrow>Revenue by segment</Eyebrow>
      <ClaimTag type="reported_fact" />
    </div>
    {segments.map((s) => (
      <div key={s.name} className="space-y-1">
        <div className="flex justify-between gap-2 text-xs">
          <span className="font-medium text-ink dark:text-white">{s.name}</span>
          <span className="font-mono text-ink-muted">
            {s.sharePercent}% · {s.growthYoY > 0 ? '+' : ''}
            {s.growthYoY}% YoY
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark dark:bg-ink-surfaceSubtle">
          <div className="h-full rounded-full bg-forest dark:bg-emerald" style={{ width: `${s.sharePercent}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const BullBear: React.FC<{ claims: Claim[] }> = ({ claims }) => {
  const bull = claims.filter((c) => c.label === 'Bull');
  const bear = claims.filter((c) => c.label === 'Bear');
  const Col = ({ title, items, tone }: { title: string; items: Claim[]; tone: string }) => (
    <div className="space-y-2 rounded-xl border border-divider p-3 dark:border-ink-border">
      <div className={cx('text-xs font-bold uppercase tracking-wider', tone)}>{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">No supported points.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink dark:text-ink-light">
              <ClaimTag type={c.claimType} />
              <p className="mt-1">{c.text}</p>
              {c.sourceTitle && <p className="font-mono text-[10.5px] text-ink-muted">Source: {c.sourceTitle}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="grid gap-3">
      <Col title="Bull case" items={bull} tone="text-forest dark:text-emerald" />
      <Col title="Bear case" items={bear} tone="text-fin-red" />
    </div>
  );
};

interface NarrativeRow {
  period?: string;
  statement: string;
  statementDate?: string;
  source?: string;
  actualText?: string;
  variance?: string;
  assessment: string | null;
  expected?: { completion: string | null; capexCr: number | null };
  actual?: { completion: string | null; capexCr: number | null };
  delayDays?: number | null;
}

const NarrativeTable: React.FC<{ rows: NarrativeRow[]; claims: Claim[] }> = ({ rows, claims }) => {
  const interpretations = claims.filter((c) => c.claimType === 'ai_interpretation');
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-divider p-3 text-xs dark:border-ink-border">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-forest dark:text-emerald">{r.period ?? (r.statementDate ? shortDate(r.statementDate) : '')}</span>
            {r.assessment && <span className="rounded-md bg-cream-dark px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink dark:bg-ink-surfaceSubtle">{humanize(r.assessment)}</span>}
          </div>
          <div>
            <Eyebrow>Management statement</Eyebrow>
            <p className="mt-0.5 text-sm text-ink dark:text-ink-light">{r.statement}</p>
            {r.source && <p className="font-mono text-[10.5px] text-ink-muted">Source: {r.source}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Eyebrow>Expected</Eyebrow>
              <p className="mt-0.5 text-ink dark:text-ink-light">{r.expected ? `${r.expected.completion ? shortDate(r.expected.completion) : 'no date'}${r.expected.capexCr ? ` · ₹${r.expected.capexCr} Cr` : ''}` : '—'}</p>
            </div>
            <div>
              <Eyebrow>Actual</Eyebrow>
              <p className="mt-0.5 text-ink dark:text-ink-light">{r.actualText ?? (r.actual ? `${r.actual.completion ? shortDate(r.actual.completion) : 'not reported'}${r.actual.capexCr ? ` · ₹${r.actual.capexCr} Cr` : ''}` : '—')}</p>
            </div>
          </div>
          <div>
            <Eyebrow>Variance</Eyebrow>
            <p className="mt-0.5 font-mono text-ink dark:text-ink-light">{r.variance ?? (r.delayDays !== null && r.delayDays !== undefined ? (r.delayDays <= 30 ? 'On schedule' : `${Math.round(r.delayDays / 30.44)} months late`) : 'Not computable')}</p>
          </div>
        </div>
      ))}
      {interpretations.length > 0 && <ClaimList claims={interpretations} />}
    </div>
  );
};

const EvidencePanel: React.FC<{ companyId: string; reportId: string }> = ({ companyId, reportId }) => {
  const evidence = useEvidence(companyId, reportId, true);
  if (evidence.isLoading) return <LoadingBlock rows={3} />;
  if (evidence.isError || !evidence.data) return <ErrorState error={evidence.error} onRetry={() => evidence.refetch()} />;
  const docs = evidence.data.documents;
  const counts = evidence.data.items.reduce<Record<string, number>>((acc, e) => {
    acc[e.claimType] = (acc[e.claimType] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
        {Object.entries(counts).map(([type, n]) => (
          <span key={type} className="inline-flex items-center gap-1">
            <ClaimTag type={type as Claim['claimType']} /> {n}
          </span>
        ))}
      </div>
      <Eyebrow>Source documents ({docs.length})</Eyebrow>
      {docs.length === 0 ? (
        <EmptyState title="No source documents stored" />
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start gap-2 rounded-xl border border-divider p-3 text-xs dark:border-ink-border">
              <FileText size={14} className="mt-0.5 shrink-0 text-forest dark:text-emerald" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink dark:text-white">{d.title}</div>
                <div className="text-ink-muted">
                  {d.provider}
                  {d.publishedAt ? ` · ${shortDate(d.publishedAt)}` : ''}
                </div>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 font-semibold text-forest dark:text-emerald">
                    Open original <ExternalLink size={11} />
                  </a>
                ) : (
                  <p className="mt-0.5 text-[10.5px] text-ink-subtle">No original document link available.</p>
                )}
              </div>
              {d.isDemo && <DemoPill />}
            </li>
          ))}
        </ul>
      )}
      <SecondaryButton className="w-full" onClick={() => evidence.refetch()}>
        <RefreshCw size={14} /> Refresh evidence
      </SecondaryButton>
    </div>
  );
};
