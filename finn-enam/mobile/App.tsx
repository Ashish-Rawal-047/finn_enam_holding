import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Company,
  Announcement,
  TriggeredAlert,
  EventMemoryItem,
  AlertSettings,
  NavigationTab,
} from './src/types';
import { MOCK_COMPANIES } from './src/data/companies';
import { MOCK_ANNOUNCEMENTS, MOCK_TRIGGERED_ALERTS } from './src/data/announcements';
import { MOCK_EVENT_MEMORY } from './src/data/eventMemory';
import { DEFAULT_ALERT_SETTINGS } from './src/data/alertSettings';
import { FinnMobileApi } from './src/services/api';
import { LightColors, DarkColors } from './src/theme/colors';
import { FontFamily, FontSize } from './src/theme/typography';

// Layout Components
import { Header } from './src/components/layout/Header';
import { BottomTabBar } from './src/components/layout/BottomTabBar';

// Screens
import { TodayScreen } from './src/screens/TodayScreen';
import { SignalsScreen } from './src/screens/SignalsScreen';
import { ResearchScreen } from './src/screens/ResearchScreen';
import { EventMemoryScreen } from './src/screens/EventMemoryScreen';

// Modals
import { SignalDetailModal } from './src/components/signals/SignalDetailModal';
import { SignalFilterModal } from './src/components/signals/SignalFilterModal';
import { SettingsModal } from './src/components/settings/SettingsModal';
import { ModalSheet } from './src/components/common/ModalSheet';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('today');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Core Data State
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>(MOCK_TRIGGERED_ALERTS);
  const [eventMemoryItems, setEventMemoryItems] = useState<EventMemoryItem[]>(MOCK_EVENT_MEMORY);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);

  // Navigation & Modal State
  const [selectedSignal, setSelectedSignal] = useState<Announcement | TriggeredAlert | null>(null);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProvenanceModal, setShowProvenanceModal] = useState<boolean>(false);
  const [selectedResearchTicker, setSelectedResearchTicker] = useState<string>('TRENT.NS');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | undefined>(undefined);

  const colors = isDark ? DarkColors : LightColors;

  // Hydrate from Express backend if running
  useEffect(() => {
    let mounted = true;

    async function loadBackendData() {
      try {
        const [backendCompanies, backendSignals, backendMemory] = await Promise.all([
          FinnMobileApi.getPortfolio(),
          FinnMobileApi.getSignals(),
          FinnMobileApi.getEventMemory(),
        ]);

        if (mounted) {
          if (backendCompanies && backendCompanies.length > 0) {
            setCompanies(backendCompanies);
          }
          if (backendSignals && backendSignals.length > 0) {
            setAnnouncements(backendSignals);
          }
          if (backendMemory && backendMemory.length > 0) {
            setEventMemoryItems(backendMemory);
          }
        }
      } catch {
        // Graceful offline fallback already loaded from mock fixtures
      }
    }

    loadBackendData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleWatchlist = async (ticker: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.ticker === ticker ? { ...c, inWatchlist: !c.inWatchlist } : c))
    );
    try {
      await FinnMobileApi.toggleWatchlist(ticker);
    } catch {
      // offline state already updated
    }
  };

  const handleSelectSignal = (signal: Announcement | TriggeredAlert) => {
    setSelectedSignal(signal);
  };

  const handleNavigateToResearch = (ticker: string) => {
    setSelectedResearchTicker(ticker);
    setSelectedSignal(null);
    setActiveTab('research');
  };

  const handleNavigateToMemory = (memoryId?: string) => {
    setSelectedMemoryId(memoryId);
    setSelectedSignal(null);
    setActiveTab('memory');
  };

  const watchlistCount = companies.filter((c) => c.inWatchlist).length;
  const criticalSignalsCount = triggeredAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  ).length;

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Header */}
      <Header
        watchlistCount={watchlistCount}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenProvenance={() => setShowProvenanceModal(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Screen View Container */}
      <View style={styles.screenContainer}>
        {activeTab === 'today' && (
          <TodayScreen
            companies={companies}
            triggeredAlerts={triggeredAlerts}
            eventMemoryItems={eventMemoryItems}
            onSelectSignal={handleSelectSignal}
            onNavigateToSignals={() => setActiveTab('signals')}
            onNavigateToMemory={handleNavigateToMemory}
            isDark={isDark}
          />
        )}

        {activeTab === 'signals' && (
          <SignalsScreen
            announcements={announcements}
            triggeredAlerts={triggeredAlerts}
            settings={settings}
            onOpenFilters={() => setShowFilterModal(true)}
            onSelectSignal={handleSelectSignal}
            isDark={isDark}
          />
        )}

        {activeTab === 'research' && (
          <ResearchScreen
            companies={companies}
            initialTicker={selectedResearchTicker}
            onSelectMemory={handleNavigateToMemory}
            isDark={isDark}
          />
        )}

        {activeTab === 'memory' && (
          <EventMemoryScreen
            items={eventMemoryItems}
            onNavigateToResearch={handleNavigateToResearch}
            initialSelectedId={selectedMemoryId}
            isDark={isDark}
          />
        )}
      </View>

      {/* Persistent Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadSignalsCount={criticalSignalsCount}
        isDark={isDark}
      />

      {/* Signal Detail Modal */}
      <SignalDetailModal
        visible={!!selectedSignal}
        onClose={() => setSelectedSignal(null)}
        signal={selectedSignal}
        onNavigateToResearch={handleNavigateToResearch}
        onNavigateToMemory={handleNavigateToMemory}
        isDark={isDark}
      />

      {/* Signal Filter Modal */}
      <SignalFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        settings={settings}
        onChangeSettings={setSettings}
        activeFilterCount={
          Object.values(settings.enabledCategories).filter((v) => !v).length +
          (settings.minSeverity !== 'all' ? 1 : 0) +
          (settings.activeDigestWindow !== '24h' ? 1 : 0)
        }
        onResetFilters={() => setSettings(DEFAULT_ALERT_SETTINGS)}
        isDark={isDark}
      />

      {/* Settings & Watchlist Modal */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        companies={companies}
        onToggleWatchlist={handleToggleWatchlist}
        settings={settings}
        onChangeSettings={setSettings}
        isDark={isDark}
      />

      {/* Provenance & Methodology Modal */}
      <ModalSheet
        visible={showProvenanceModal}
        onClose={() => setShowProvenanceModal(false)}
        title="Data Provenance & Architecture"
        subtitle="ENAM AI Engineer Challenge 2026/2027"
        isDark={isDark}
      >
        <View style={styles.provenanceContent}>
          <View style={styles.provItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.forest} />
            <View style={styles.provText}>
              <Text style={[styles.provTitle, { color: colors.textPrimary }]}>
                Primary Regulatory Grounding
              </Text>
              <Text style={[styles.provDesc, { color: colors.textSecondary }]}>
                All corporate intelligence is grounded in SEBI Regulation 30 corporate disclosures, official BSE/NSE PDF filings, and audited annual reports.
              </Text>
            </View>
          </View>

          <View style={styles.provItem}>
            <Ionicons name="time" size={20} color={colors.forest} />
            <View style={styles.provText}>
              <Text style={[styles.provTitle, { color: colors.textPrimary }]}>
                End-of-Day Market Sync
              </Text>
              <Text style={[styles.provDesc, { color: colors.textSecondary }]}>
                Prices, session percentage changes, and 20-DMA volume multiples are calculated against closing bhavcopy records for the 18 monitored enterprises.
              </Text>
            </View>
          </View>

          <View style={styles.provItem}>
            <Ionicons name="git-commit" size={20} color={colors.forest} />
            <View style={styles.provText}>
              <Text style={[styles.provTitle, { color: colors.textPrimary }]}>
                Event Memory Signature Engine
              </Text>
              <Text style={[styles.provDesc, { color: colors.textSecondary }]}>
                Commitments made in earnings conference calls are indexed and automatically tracked against subsequent quarterly results to measure executive fulfillment accuracy.
              </Text>
            </View>
          </View>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  provenanceContent: {
    paddingVertical: 10,
    gap: 16,
  },
  provItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  provText: {
    flex: 1,
  },
  provTitle: {
    fontSize: FontSize.body,
    fontWeight: 'bold',
    fontFamily: FontFamily.ui,
    marginBottom: 4,
  },
  provDesc: {
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
  },
});
