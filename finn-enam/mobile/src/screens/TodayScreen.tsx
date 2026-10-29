import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Company, TriggeredAlert, EventMemoryItem } from '../types';
import { Badge } from '../components/common/Badge';
import { LightColors, DarkColors } from '../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface TodayScreenProps {
  companies: Company[];
  triggeredAlerts: TriggeredAlert[];
  eventMemoryItems: EventMemoryItem[];
  onSelectSignal: (alert: TriggeredAlert) => void;
  onNavigateToSignals: () => void;
  onNavigateToMemory: (memoryId?: string) => void;
  isDark?: boolean;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  companies,
  triggeredAlerts,
  eventMemoryItems,
  onSelectSignal,
  onNavigateToSignals,
  onNavigateToMemory,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  // 1. Data-Driven Dynamic Briefing Synthesis
  const priorityCount = triggeredAlerts.length;
  const highPriorityAlerts = triggeredAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  );

  let focalHeadline = "No critical alerts across your watchlist today.";
  let focalExplanation = "Monitored exchange disclosures and end-of-day market movements remain within standard volatility thresholds.";

  if (highPriorityAlerts.length > 0) {
    const uniqueTickers = Array.from(new Set(highPriorityAlerts.map((a) => a.ticker)));
    if (uniqueTickers.length === 1) {
      const top = highPriorityAlerts[0];
      focalHeadline = `${top.ticker} requires immediate review today.`;
      focalExplanation = top.explanation;
    } else {
      focalHeadline = `${uniqueTickers.length} developments deserve your attention today.`;
      const first = highPriorityAlerts[0];
      const second = highPriorityAlerts.find((a) => a.ticker !== first.ticker) || highPriorityAlerts[1];
      if (second && second.ticker !== first.ticker) {
        focalExplanation = `${first.ticker} recorded an exceptional ${first.triggerMetric} move, while ${second.ticker} crossed threshold criteria with material filings.`;
      } else {
        focalExplanation = `${first.ticker} recorded an extraordinary ${first.triggerMetric} move alongside material exchange disclosures.`;
      }
    }
  }

  // 2. Compact Portfolio Overview (Exactly 3 Key Metrics)
  const watchlistCount = companies.filter((c) => c.inWatchlist).length;
  const advancingCount = companies.filter((c) => c.changePercent > 0).length;
  const decliningCount = companies.filter((c) => c.changePercent < 0).length;
  const avgChange = (
    companies.reduce((sum, c) => sum + c.changePercent, 0) / (companies.length || 1)
  ).toFixed(2);
  const isAvgPositive = parseFloat(avgChange) >= 0;

  // 3. Top 3 Priority Signals Only
  const topThreeSignals = triggeredAlerts.slice(0, 3);

  // 4. Single Event Memory Highlight
  const spotlightMemory = eventMemoryItems.find(
    (m) => m.status === 'delivered' || m.status === 'delayed'
  ) || eventMemoryItems[0];

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <Text style={styles.tickerText}>
        <Text style={[styles.tickerMain, { color: colors.textPrimary }]}>{parts[0]}</Text>
        {parts[1] && <Text style={[styles.tickerSub, { color: colors.textMuted }]}>.{parts[1]}</Text>}
      </Text>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. EDITORIAL BRIEFING HERO */}
      <View style={styles.heroSection}>
        <Text style={[styles.briefingDate, { color: colors.textMuted }]}>
          WEDNESDAY, OCTOBER 29 • MORNING BRIEFING
        </Text>

        <Text style={[styles.displayHeadline, { color: colors.textPrimary }]}>
          {focalHeadline}
        </Text>

        <Text style={[styles.headlineExplanation, { color: colors.textSecondary }]}>
          {focalExplanation}
        </Text>
      </View>

      {/* 2. RESTRAINED HORIZONTAL PORTFOLIO SUMMARY (3 Metrics) */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryColLabel, { color: colors.textMuted }]}>WATCHLIST</Text>
          <Text style={[styles.summaryColVal, { color: colors.textPrimary }]}>
            {watchlistCount}{' '}
            <Text style={[styles.summaryColSub, { color: colors.textMuted }]}>of {companies.length}</Text>
          </Text>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.summaryCol}>
          <Text style={[styles.summaryColLabel, { color: colors.textMuted }]}>SIGNALS</Text>
          <View style={styles.signalsRow}>
            <Text style={[styles.summaryColVal, { color: colors.textPrimary }]}>
              {priorityCount}
            </Text>
            {priorityCount > 0 && (
              <View style={[styles.signalsIndicator, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.summaryCol}>
          <Text style={[styles.summaryColLabel, { color: colors.textMuted }]}>DAILY POSTURE</Text>
          <Text
            style={[
              styles.summaryColVal,
              { color: isAvgPositive ? colors.positive : colors.negative },
            ]}
          >
            {isAvgPositive ? `+${avgChange}%` : `${avgChange}%`}
          </Text>
          <Text style={[styles.postureSub, { color: colors.textMuted }]}>
            ({advancingCount}&uarr; {decliningCount}&darr;)
          </Text>
        </View>
      </View>

      {/* 3. PRIORITY SIGNALS SECTION */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Priority Signals
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            ({topThreeSignals.length} of {triggeredAlerts.length})
          </Text>
        </View>

        <TouchableOpacity
          onPress={onNavigateToSignals}
          style={styles.viewAllButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View all signals</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Unified Editorial Container for Signals */}
      <View style={[styles.editorialContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {topThreeSignals.map((signal, idx) => (
          <TouchableOpacity
            key={signal.id}
            onPress={() => onSelectSignal(signal)}
            style={[
              styles.signalRow,
              idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.signalTopRow}>
              {formatTicker(signal.ticker)}
              <Text style={[styles.signalCompany, { color: colors.textMuted }]} numberOfLines={1}>
                {signal.companyName}
              </Text>
              <Badge
                variant={signal.severity === 'critical' ? 'red' : 'amber'}
                size="xs"
                isDark={isDark}
              >
                {signal.triggerMetric}
              </Badge>
            </View>

            <Text style={[styles.signalHeadline, { color: colors.textPrimary }]}>
              {signal.headline}
            </Text>

            <Text style={[styles.signalExplanation, { color: colors.textSecondary }]} numberOfLines={2}>
              {signal.explanation}
            </Text>

            <View style={styles.signalFooter}>
              <View style={styles.timestampRow}>
                <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.timestampText, { color: colors.textMuted }]}>
                  {signal.timestamp}
                </Text>
              </View>

              <View style={styles.inspectRow}>
                <Text style={[styles.inspectText, { color: colors.primary }]}>
                  Inspect details
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {topThreeSignals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No active priority signals detected across your watchlist today.
            </Text>
          </View>
        )}
      </View>

      {/* 4. EVENT MEMORY SPOTLIGHT */}
      {spotlightMemory && (
        <View style={styles.memorySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time" size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Event Memory Spotlight
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onNavigateToMemory(spotlightMemory.id)}
              style={styles.viewAllButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Explore ledger</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => onNavigateToMemory(spotlightMemory.id)}
            style={[styles.memoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <View style={styles.memoryTopRow}>
              {formatTicker(spotlightMemory.ticker)}
              <Badge
                variant={spotlightMemory.status === 'delivered' ? 'forest' : 'amber'}
                size="xs"
                dot
                isDark={isDark}
              >
                {spotlightMemory.status.toUpperCase()}
              </Badge>
            </View>

            <Text style={[styles.memoryHeadline, { color: colors.textPrimary }]}>
              {spotlightMemory.title}
            </Text>

            <Text style={[styles.memoryFact, { color: colors.textSecondary }]} numberOfLines={2}>
              {spotlightMemory.factsSummary}
            </Text>

            <View style={[styles.memoryFooter, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.memoryDeadline, { color: colors.textMuted }]}>
                Goal: {spotlightMemory.milestoneDeadline}
              </Text>
              <View style={styles.inspectRow}>
                <Text style={[styles.inspectText, { color: colors.primary }]}>
                  View chronological trail
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. GROUNDING ASSURANCE FOOTER */}
      <View style={styles.groundingFooter}>
        <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
        <Text style={[styles.groundingText, { color: colors.textMuted }]}>
          Grounded in audited exchange filings & primary transcripts
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroSection: {
    gap: 6,
  },
  briefingDate: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
    letterSpacing: 0.8,
  },
  displayHeadline: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.hero,
    lineHeight: 32,
  },
  headlineExplanation: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    lineHeight: 19,
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryColLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  summaryColVal: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
    marginTop: 3,
  },
  summaryColSub: {
    fontSize: 10,
    fontWeight: FontWeight.regular,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  signalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalsIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  postureSub: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  editorialContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  signalRow: {
    padding: 14,
    gap: 5,
  },
  signalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tickerText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
  },
  tickerMain: {
    fontWeight: FontWeight.bold,
  },
  tickerSub: {
    fontSize: 10,
  },
  signalCompany: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    flex: 1,
  },
  signalHeadline: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    lineHeight: 18,
    marginTop: 2,
  },
  signalExplanation: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    lineHeight: 17,
  },
  signalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
  },
  inspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inspectText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  memorySection: {
    gap: 8,
  },
  memoryCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  memoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryHeadline: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  memoryFact: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    lineHeight: 17,
  },
  memoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  memoryDeadline: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
  },
  groundingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 8,
  },
  groundingText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
  },
});

