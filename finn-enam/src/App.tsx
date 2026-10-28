import { useState, useMemo } from 'react';
import { ScreenId, BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { HomeScreen } from './screens/HomeScreen';
import { EventMemoryScreen } from './screens/EventMemoryScreen';
import { CompanyResearchScreen } from './screens/CompanyResearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Drawer } from './components/common/Drawer';
import { MOCK_COMPANIES, DEMO_DATA_DISCLAIMER } from './data/companies';
import { MOCK_ANNOUNCEMENTS, MOCK_TRIGGERED_ALERTS } from './data/announcements';
import { MOCK_EVENT_MEMORY } from './data/eventMemory';
import { DEFAULT_ALERT_SETTINGS } from './data/alertSettings';
import { Company, AlertSettings, TriggeredAlert, DigestWindow } from './types';

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [selectedResearchTicker, setSelectedResearchTicker] = useState<string>('TRENT.NS');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);

  // Toggle watchlist
  const handleToggleWatchlist = (ticker: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.ticker === ticker ? { ...c, inWatchlist: !c.inWatchlist } : c
      )
    );
  };

  // Switch to Research Screen
  const handleSelectCompanyForResearch = (ticker: string) => {
    setSelectedResearchTicker(ticker);
    setActiveScreen('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch to Event Memory Screen
  const handleOpenEventMemory = (memoryId: string) => {
    setActiveMemoryId(memoryId);
    setActiveScreen('memory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Change digest window
  const handleChangeDigestWindow = (w: DigestWindow) => {
    setAlertSettings((prev) => ({ ...prev, activeDigestWindow: w }));
  };

  // Dynamically compute triggered anomaly alerts based on user threshold sliders
  const dynamicAlerts = useMemo<TriggeredAlert[]>(() => {
    const list: TriggeredAlert[] = [];

    companies.forEach((comp) => {
      // Check price threshold breach
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

      // Check volume threshold breach
      if (comp.volumeRatio >= alertSettings.volumeSpikeMultiplier) {
        list.push({
          id: `dyn-vol-${comp.ticker}`,
          ticker: comp.ticker,
          companyName: comp.name,
          type: 'volume_spike',
          severity: comp.volumeRatio >= alertSettings.volumeSpikeMultiplier * 1.4 ? 'critical' : 'high',
          headline: `Volume spike of ${comp.volumeRatio.toFixed(2)}x 20-DMA crossed ${alertSettings.volumeSpikeMultiplier}x trigger`,
          triggerMetric: `${comp.volumeRatio.toFixed(2)}x Vol`,
          explanation: `Exceptional institutional participation. Daily turnover significantly surpasses rolling 20-day moving average volume.`,
          timestamp: 'EOD Verified',
          isEod: true,
        });
      }
    });

    // Also include curated material filing alerts if enabled
    MOCK_TRIGGERED_ALERTS.forEach((curated) => {
      if (curated.type === 'material_filing' || curated.type === 'guidance_miss') {
        if (!list.some((item) => item.ticker === curated.ticker && item.type === curated.type)) {
          list.push(curated);
        }
      }
    });

    return list.slice(0, 6);
  }, [companies, alertSettings.priceMoveThresholdPercent, alertSettings.volumeSpikeMultiplier]);

  return (
    <div className="min-h-screen w-full max-w-full bg-dark-bg text-dark-text antialiased flex flex-col">
      {/* Header Container */}
      <Header
        activeScreen={activeScreen}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
      />

      {/* Main Responsive Viewport Container (Mobile-first 390px-430px up to sm/md max-w-xl) */}
      <main className="w-full max-w-xl mx-auto px-3 sm:px-5 pt-3.5 flex-1">
        {activeScreen === 'home' && (
          <HomeScreen
            companies={companies}
            announcements={MOCK_ANNOUNCEMENTS}
            triggeredAlerts={dynamicAlerts}
            activeWindow={alertSettings.activeDigestWindow}
            onChangeWindow={handleChangeDigestWindow}
            onOpenEventMemory={handleOpenEventMemory}
            onSelectCompanyForResearch={handleSelectCompanyForResearch}
          />
        )}

        {activeScreen === 'memory' && (
          <EventMemoryScreen
            memoryItems={MOCK_EVENT_MEMORY}
            initialActiveId={activeMemoryId}
          />
        )}

        {activeScreen === 'research' && (
          <CompanyResearchScreen
            companies={companies}
            selectedTicker={selectedResearchTicker}
            onSelectTicker={(ticker) => setSelectedResearchTicker(ticker)}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            companies={companies}
            settings={alertSettings}
            onChangeSettings={setAlertSettings}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectCompanyForResearch={handleSelectCompanyForResearch}
            activeAlerts={dynamicAlerts}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Dock */}
      <BottomNav
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        unreadCount={dynamicAlerts.length}
      />

      {/* Data Provenance & Demo Disclaimer Drawer */}
      <Drawer
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
        title="Data Provenance & System Disclaimer"
        subtitle="ENAM Holdings — AI Engineer Challenge Build"
        footer={
          <button
            onClick={() => setIsDisclaimerOpen(false)}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white py-2 text-xs font-semibold transition-colors"
          >
            Acknowledge & Continue
          </button>
        }
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="rounded-lg bg-teal-950/20 border border-teal-900/40 p-3 text-teal-200">
            <span className="font-bold text-teal-400 font-mono block mb-1">
              DEMONSTRATION FIXTURE DATA
            </span>
            {DEMO_DATA_DISCLAIMER}
          </div>

          <div className="space-y-2 text-slate-300">
            <h4 className="font-semibold text-white">System Data Discipline:</h4>
            <p>
              • <strong>Primary Source Grounding:</strong> All quarterly numbers, EBITDA calculations, and management quotes are extracted strictly from official company filings and transcripts (no broker commentary).
            </p>
            <p>
              • <strong>End-of-Day Market Series:</strong> Baseline closing prices, 20-DMA volumes, and sparklines reflect real Indian market close series formatted for local testing without external API rate-limit risks.
            </p>
            <p>
              • <strong>Event Memory Subsystem:</strong> Evaluated commitments link directly to historical disclosures, separating reported corporate facts from AI contextual synthesis.
            </p>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default App;
