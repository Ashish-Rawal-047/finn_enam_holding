import { useState, useMemo, useEffect } from 'react';
import { NavigationTab, AppTheme, Company, AlertSettings, TriggeredAlert, Announcement } from './types';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNav } from './components/layout/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { SignalsScreen } from './screens/SignalsScreen';
import { ResearchScreen } from './screens/ResearchScreen';
import { EventMemoryScreen } from './screens/EventMemoryScreen';
import { WatchlistDrawer } from './components/settings/WatchlistDrawer';
import { SignalDetailDrawer } from './components/signals/SignalDetailDrawer';
import { Drawer } from './components/common/Drawer';
import { MOCK_COMPANIES, DEMO_DATA_DISCLAIMER } from './data/companies';
import { MOCK_ANNOUNCEMENTS, MOCK_TRIGGERED_ALERTS } from './data/announcements';
import { MOCK_EVENT_MEMORY } from './data/eventMemory';
import { DEFAULT_ALERT_SETTINGS } from './data/alertSettings';
import { Sparkles, Bell, Search, History, ShieldCheck } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('today');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [selectedResearchTicker, setSelectedResearchTicker] = useState<string>('TRENT.NS');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [selectedSignalDetail, setSelectedSignalDetail] = useState<Announcement | TriggeredAlert | null>(null);

  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);

  const [isWatchlistDrawerOpen, setIsWatchlistDrawerOpen] = useState<boolean>(false);
  const [watchlistDrawerTab, setWatchlistDrawerTab] = useState<'watchlist' | 'thresholds'>('watchlist');
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toggle company watchlist status
  const handleToggleWatchlist = (ticker: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.ticker === ticker ? { ...c, inWatchlist: !c.inWatchlist } : c
      )
    );
  };

  // Cross-Navigation Handlers
  const handleSelectCompanyForResearch = (ticker: string) => {
    setSelectedResearchTicker(ticker);
    setActiveTab('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToMemory = (memoryId?: string) => {
    if (memoryId) setActiveMemoryId(memoryId);
    setActiveTab('memory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamically compute triggered anomaly alerts based on user sensitivity sliders
  const dynamicAlerts = useMemo<TriggeredAlert[]>(() => {
    const list: TriggeredAlert[] = [];

    companies.forEach((comp) => {
      // 1. Price Threshold Check
      if (Math.abs(comp.changePercent) >= alertSettings.priceMoveThresholdPercent) {
        list.push({
          id: `dyn-price-${comp.ticker}`,
          ticker: comp.ticker,
          companyName: comp.name,
          type: 'price_move',
          severity: Math.abs(comp.changePercent) >= alertSettings.priceMoveThresholdPercent * 1.5 ? 'critical' : 'high',
          headline: `Price move of ${comp.changePercent > 0 ? '+' : ''}${comp.changePercent.toFixed(2)}% breached ±${alertSettings.priceMoveThresholdPercent}% threshold`,
          triggerMetric: `${comp.changePercent > 0 ? '+' : ''}${comp.changePercent.toFixed(2)}%`,
          explanation: `Daily price shift exceeds configured sensitivity of ±${alertSettings.priceMoveThresholdPercent}%. Traded volume ratio is ${comp.volumeRatio}x 20-DMA.`,
          timestamp: 'EOD Verified',
          isEod: true,
        });
      }

      // 2. Volume Spike Check
      if (comp.volumeRatio >= alertSettings.volumeSpikeMultiplier) {
        list.push({
          id: `dyn-vol-${comp.ticker}`,
          ticker: comp.ticker,
          companyName: comp.name,
          type: 'volume_spike',
          severity: comp.volumeRatio >= alertSettings.volumeSpikeMultiplier * 1.4 ? 'critical' : 'high',
          headline: `Volume spike of ${comp.volumeRatio.toFixed(2)}x 20-DMA crossed ${alertSettings.volumeSpikeMultiplier}x trigger`,
          triggerMetric: `${comp.volumeRatio.toFixed(2)}x Vol`,
          explanation: `Exceptional institutional turnover significantly surpasses rolling 20-day moving average volume.`,
          timestamp: 'EOD Verified',
          isEod: true,
        });
      }
    });

    // Merge with curated material corporate announcements
    MOCK_TRIGGERED_ALERTS.forEach((curated) => {
      if (curated.type === 'material_filing' || curated.type === 'guidance_miss') {
        if (!list.some((item) => item.ticker === curated.ticker && item.type === curated.type)) {
          list.push(curated);
        }
      }
    });

    return list.slice(0, 6);
  }, [companies, alertSettings.priceMoveThresholdPercent, alertSettings.volumeSpikeMultiplier]);

  const watchlistCount = companies.filter((c) => c.inWatchlist).length;

  const navItems = [
    { id: 'today' as NavigationTab, label: 'Today', icon: Sparkles },
    { id: 'signals' as NavigationTab, label: 'Signals', icon: Bell, badge: dynamicAlerts.length },
    { id: 'research' as NavigationTab, label: 'Research', icon: Search },
    { id: 'memory' as NavigationTab, label: 'Event Memory', icon: History },
  ];

  return (
    <div className="min-h-screen w-full max-w-full bg-ivory-bg dark:bg-ink-bg text-ivory-text dark:text-ink-text antialiased flex flex-col transition-colors">
      {/* Editorial Header */}
      <AppHeader
        activeTab={activeTab}
        theme={theme}
        onToggleTheme={toggleTheme}
        watchlistCount={watchlistCount}
        onOpenWatchlist={() => {
          setWatchlistDrawerTab('watchlist');
          setIsWatchlistDrawerOpen(true);
        }}
        onOpenSettings={() => {
          setWatchlistDrawerTab('thresholds');
          setIsWatchlistDrawerOpen(true);
        }}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
      />

      {/* Responsive Main Layout Container */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 px-4 sm:px-6">
        {/* Desktop Sidebar Rail (Visible on >= 1024px) */}
        <aside className="hidden lg:flex w-52 flex-col justify-between py-6 pr-6 border-r border-stone-200/70 dark:border-ink-border">
          <nav className="space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-stone-400 dark:text-slate-500 mb-2 px-2.5">
              Destinations
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-semibold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-ink-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="rounded-xl bg-stone-100 dark:bg-ink-surfaceSubtle border border-stone-200/60 dark:border-ink-border p-3 space-y-1.5 text-[11px] text-stone-500 dark:text-slate-400">
            <div className="font-semibold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              Primary Discipline
            </div>
            <p className="leading-snug">
              No broker notes or secondary news. Grounded strictly in exchange filings.
            </p>
          </div>
        </aside>

        {/* Central Reading / Working Canvas */}
        <main className="w-full flex-1 max-w-2xl mx-auto lg:pl-8">
          {activeTab === 'today' && (
            <TodayScreen
              companies={companies}
              triggeredAlerts={dynamicAlerts}
              eventMemoryItems={MOCK_EVENT_MEMORY}
              onSelectSignal={(alert) => setSelectedSignalDetail(alert)}
              onNavigateToSignals={() => setActiveTab('signals')}
              onNavigateToMemory={handleNavigateToMemory}
            />
          )}

          {activeTab === 'signals' && (
            <SignalsScreen
              announcements={MOCK_ANNOUNCEMENTS}
              triggeredAlerts={dynamicAlerts}
              settings={alertSettings}
              onChangeSettings={setAlertSettings}
              onNavigateToResearch={handleSelectCompanyForResearch}
              onNavigateToMemory={handleNavigateToMemory}
            />
          )}

          {activeTab === 'research' && (
            <ResearchScreen
              companies={companies}
              selectedTicker={selectedResearchTicker}
              onSelectTicker={(ticker) => setSelectedResearchTicker(ticker)}
              onToggleWatchlist={handleToggleWatchlist}
              onNavigateToMemory={handleNavigateToMemory}
            />
          )}

          {activeTab === 'memory' && (
            <EventMemoryScreen
              memoryItems={MOCK_EVENT_MEMORY}
              initialActiveId={activeMemoryId}
              onNavigateToResearch={handleSelectCompanyForResearch}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Fixed on screens < 1024px) */}
      <div className="lg:hidden">
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          unreadSignalsCount={dynamicAlerts.length}
        />
      </div>

      {/* Signal Detail Modal */}
      <SignalDetailDrawer
        isOpen={Boolean(selectedSignalDetail)}
        onClose={() => setSelectedSignalDetail(null)}
        signal={selectedSignalDetail}
        onNavigateToResearch={handleSelectCompanyForResearch}
        onNavigateToMemory={handleNavigateToMemory}
      />

      {/* Watchlist & Threshold Controls Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistDrawerOpen}
        onClose={() => setIsWatchlistDrawerOpen(false)}
        initialTab={watchlistDrawerTab}
        companies={companies}
        onToggleWatchlist={handleToggleWatchlist}
        onSelectCompanyForResearch={handleSelectCompanyForResearch}
        settings={alertSettings}
        onChangeSettings={setAlertSettings}
        activeAlerts={dynamicAlerts}
      />

      {/* Data Provenance & Grounding Drawer */}
      <Drawer
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        title="Data Provenance & System Grounding"
        subtitle="ENAM Holdings — AI Engineer Build Challenge"
        footer={
          <button
            onClick={() => setIsProvenanceOpen(false)}
            className="w-full rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-2.5 text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Acknowledge & Continue
          </button>
        }
      >
        <div className="space-y-3.5 text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
          <div className="rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 p-3.5 text-teal-900 dark:text-teal-200 space-y-1">
            <span className="font-bold text-teal-950 dark:text-teal-300 font-mono text-[11px] block">
              DEMONSTRATION FIXTURE DATA
            </span>
            <p className="text-xs">{DEMO_DATA_DISCLAIMER}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-stone-900 dark:text-white">Strict Financial Disciplines:</h4>
            <p>
              • <strong>Primary Source Disclosures:</strong> Numbers, percentages, and quotes are strictly sourced from official company filings (Annual Reports, Quarterly Exchange Form 10-Q equivalents, concall audio transcripts).
            </p>
            <p>
              • <strong>No Broker or News Distortion:</strong> Broker recommendation notes and secondary press commentary are excluded to prevent noisy bias.
            </p>
            <p>
              • <strong>Event Memory Subsystem:</strong> Evaluated commitments explicitly separate audited corporate delivery from model-generated capital allocation interpretations.
            </p>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default App;
