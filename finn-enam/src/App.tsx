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
import { FinnApi } from './services/api';
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

  // Load live database-backed portfolio and settings on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const [backendCompanies, backendPrefs] = await Promise.all([
          FinnApi.getPortfolio(),
          FinnApi.getAlertPreferences()
        ]);
        if (isMounted) {
          if (backendCompanies && backendCompanies.length > 0) {
            setCompanies(backendCompanies);
          }
          if (backendPrefs) {
            setAlertSettings((prev) => ({
              ...prev,
              priceMoveThresholdPercent: backendPrefs.priceChangeThreshold ?? prev.priceMoveThresholdPercent,
              volumeSpikeMultiplier: backendPrefs.volumeThreshold ?? prev.volumeSpikeMultiplier
            }));
          }
        }
      } catch (err) {
        console.warn('Backend load notice:', err);
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toggle company watchlist status
  const handleToggleWatchlist = async (ticker: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.ticker === ticker ? { ...c, inWatchlist: !c.inWatchlist } : c
      )
    );
    try {
      await FinnApi.toggleWatchlist(ticker);
    } catch {
      // Handled gracefully
    }
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
    <div className="min-h-screen w-full max-w-full bg-cream dark:bg-ink-bg text-ink dark:text-ink-text antialiased flex flex-col transition-colors">
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
        <aside className="hidden lg:flex w-52 flex-col justify-between py-6 pr-6 border-r border-divider dark:border-ink-border">
          <nav className="space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-ink-muted mb-2 px-2.5">
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
                      ? 'bg-forest text-white shadow-sm font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-cream-dark dark:hover:bg-ink-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className={`h-4 min-w-[16px] px-1.5 rounded-full font-mono text-[9px] font-bold flex items-center justify-center ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-sage text-forest'
                    }`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="rounded-xl bg-white dark:bg-ink-surface border border-divider dark:border-ink-border p-3 space-y-1.5 text-[11px] text-ink-muted shadow-subtle">
            <div className="font-semibold text-ink dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-forest dark:text-emerald" />
              Primary Discipline
            </div>
            <p className="leading-snug">
              No broker notes or secondary rumors. Grounded strictly in exchange filings.
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
              onOpenSettings={() => {
                setWatchlistDrawerTab('thresholds');
                setIsWatchlistDrawerOpen(true);
              }}
              onSelectSignal={(sig) => setSelectedSignalDetail(sig)}
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

      {/* Persistent Mobile Bottom Navigation Bar (< 1024px) */}
      <div className="lg:hidden">
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unreadSignalsCount={dynamicAlerts.length}
        />
      </div>

      {/* Slide-over Drawers */}
      <WatchlistDrawer
        isOpen={isWatchlistDrawerOpen}
        onClose={() => setIsWatchlistDrawerOpen(false)}
        initialTab={watchlistDrawerTab}
        companies={companies}
        onToggleWatchlist={handleToggleWatchlist}
        onSelectCompanyForResearch={(ticker) => {
          handleSelectCompanyForResearch(ticker);
          setIsWatchlistDrawerOpen(false);
        }}
        settings={alertSettings}
        onChangeSettings={setAlertSettings}
        activeAlerts={dynamicAlerts}
      />

      <SignalDetailDrawer
        isOpen={!!selectedSignalDetail}
        onClose={() => setSelectedSignalDetail(null)}
        signal={selectedSignalDetail}
        onInvestigateCompany={(ticker) => {
          handleSelectCompanyForResearch(ticker);
          setSelectedSignalDetail(null);
        }}
        onInspectMemory={(memId) => {
          handleNavigateToMemory(memId);
          setSelectedSignalDetail(null);
        }}
      />

      {/* Provenance Verification Drawer */}
      <Drawer
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        title="Market Baseline & Data Provenance"
        subtitle="Verification & Architecture"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-ink dark:text-ink-light">
          <div className="rounded-xl bg-sage/50 p-3.5 border border-divider">
            <div className="flex items-center gap-2 text-forest font-bold text-xs">
              <ShieldCheck size={16} />
              <span>Grounding Standard</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
              Every takeaway, financial table, and Event Memory commitment audit in FINN is linked to primary official filings published on BSE and NSE archives.
            </p>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between py-1.5 border-b border-divider">
              <span className="text-ink-muted">End-of-Day Baseline</span>
              <span className="font-mono font-bold text-forest">October 28, 2026 (Closing Bhavcopy)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-divider">
              <span className="text-ink-muted">Monitored Portfolio</span>
              <span className="font-mono font-bold">18 NSE/BSE Equities</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-divider">
              <span className="text-ink-muted">Event Memory Ledger</span>
              <span className="font-mono font-bold text-forest">6 Active Corporate Pledges</span>
            </div>
          </div>

          <div className="p-3 bg-cream-dark rounded-lg text-[10px] text-ink-muted leading-normal">
            {DEMO_DATA_DISCLAIMER}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default App;
