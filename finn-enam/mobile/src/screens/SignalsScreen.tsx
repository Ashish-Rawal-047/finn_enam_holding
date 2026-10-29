import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Announcement, TriggeredAlert, AlertSettings } from '../types';
import { Badge } from '../components/common/Badge';
import { LightColors, DarkColors } from '../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_LABELS } from '../data/alertSettings';

interface SignalsScreenProps {
  announcements: Announcement[];
  triggeredAlerts: TriggeredAlert[];
  settings: AlertSettings;
  onOpenFilters: () => void;
  onSelectSignal: (item: Announcement | TriggeredAlert) => void;
  isDark?: boolean;
}

export const SignalsScreen: React.FC<SignalsScreenProps> = ({
  announcements,
  triggeredAlerts,
  settings,
  onOpenFilters,
  onSelectSignal,
  isDark = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoutine, setShowRoutine] = useState(false);
  const colors = isDark ? DarkColors : LightColors;

  // Filter signals based on settings & search query
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      // Category check
      if (settings.enabledCategories[ann.category] === false) return false;

      // Severity check
      if (settings.minSeverity === 'critical_only' && ann.severity !== 'critical') return false;
      if (
        settings.minSeverity === 'high_only' &&
        ann.severity !== 'critical' &&
        ann.severity !== 'high'
      )
        return false;

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTicker = ann.ticker.toLowerCase().includes(q);
        const matchesName = ann.companyName.toLowerCase().includes(q);
        const matchesTitle = ann.title.toLowerCase().includes(q);
        const matchesTakeaway = ann.oneLineTakeaway.toLowerCase().includes(q);
        return matchesTicker || matchesName || matchesTitle || matchesTakeaway;
      }
      return true;
    });
  }, [announcements, settings, searchQuery]);

  // Combine triggered alerts that match search
  const filteredAlerts = useMemo(() => {
    return triggeredAlerts.filter((alert) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          alert.ticker.toLowerCase().includes(q) ||
          alert.companyName.toLowerCase().includes(q) ||
          alert.headline.toLowerCase().includes(q) ||
          alert.explanation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [triggeredAlerts, searchQuery]);

  // 3-Tier Categorization: Needs Attention, Worth Watching, Routine Filings
  const needsAttention = useMemo(() => {
    const criticalAnnouncements = filteredAnnouncements.filter(
      (a) => a.severity === 'critical' || a.severity === 'high'
    );
    const criticalAlerts = filteredAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'high'
    );
    return [...criticalAlerts, ...criticalAnnouncements];
  }, [filteredAnnouncements, filteredAlerts]);

  const worthWatching = useMemo(() => {
    const mediumAnnouncements = filteredAnnouncements.filter(
      (a) => a.severity === 'normal' && !a.isRoutine
    );
    const mediumAlerts = filteredAlerts.filter((a) => a.severity === 'medium');
    return [...mediumAlerts, ...mediumAnnouncements];
  }, [filteredAnnouncements, filteredAlerts]);

  const routineCompliance = useMemo(() => {
    return filteredAnnouncements.filter(
      (a) => a.isRoutine || a.severity === 'routine'
    );
  }, [filteredAnnouncements]);

  const activeCategoryCount = Object.values(settings.enabledCategories).filter((v) => !v).length;
  const hasActiveFilters =
    activeCategoryCount > 0 ||
    settings.minSeverity !== 'all' ||
    settings.activeDigestWindow !== '24h';

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <Text style={styles.tickerText}>
        <Text style={[styles.tickerMain, { color: colors.textPrimary }]}>{parts[0]}</Text>
        {parts[1] && <Text style={[styles.tickerSub, { color: colors.textMuted }]}>.{parts[1]}</Text>}
      </Text>
    );
  };

  const renderSignalRow = (item: Announcement | TriggeredAlert, isLast = false) => {
    const isAlert = 'triggerMetric' in item;
    const ticker = item.ticker;
    const companyName = item.companyName;
    const headline = isAlert ? item.headline : item.title;
    const takeaway = isAlert ? item.explanation : item.oneLineTakeaway;
    const time = item.timestamp;
    const severity = item.severity;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => onSelectSignal(item)}
        activeOpacity={0.7}
        style={[
          styles.signalRow,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View style={styles.signalTopRow}>
          <View style={styles.signalTickerGroup}>
            {formatTicker(ticker)}
            <Text style={[styles.companyNameText, { color: colors.textMuted }]} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
          <View style={styles.signalBadgeGroup}>
            {isAlert ? (
              <Badge variant="amber" isDark={isDark}>
                {item.triggerMetric}
              </Badge>
            ) : (
              <Badge
                variant={severity === 'critical' ? 'red' : severity === 'high' ? 'forest' : 'sage'}
                isDark={isDark}
              >
                {CATEGORY_LABELS[item.category]?.label || item.category}
              </Badge>
            )}
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>{time}</Text>
          </View>
        </View>

        <Text
          style={[styles.headlineText, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {headline}
        </Text>

        <Text
          style={[styles.takeawayText, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {takeaway}
        </Text>

        <View style={styles.signalFooterRow}>
          <View style={styles.signalFooterLeft}>
            {isAlert && (
              <View style={styles.eodBadge}>
                <Ionicons name="flash-outline" size={11} color={colors.accentMuted} />
                <Text style={[styles.eodBadgeText, { color: colors.accentMuted }]}>
                  Threshold Breach
                </Text>
              </View>
            )}
            {'eventMemoryId' in item && item.eventMemoryId && (
              <View style={[styles.eodBadge, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="time-outline" size={11} color={colors.forest} />
                <Text style={[styles.eodBadgeText, { color: colors.forest }]}>
                  Audited vs Commitment
                </Text>
              </View>
            )}
          </View>
          <View style={styles.inspectButton}>
            <Text style={[styles.inspectText, { color: colors.forest }]}>Inspect</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.forest} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Search & Filter Bar */}
      <View style={styles.searchBarRow}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search signals, tickers, catalysts..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onOpenFilters}
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? colors.forest : colors.surface,
              borderColor: hasActiveFilters ? colors.forest : colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? '#FFFFFF' : colors.textPrimary}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Scope / Context Pill */}
      <View style={styles.contextRow}>
        <Text style={[styles.contextText, { color: colors.textMuted }]}>
          Window: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{settings.activeDigestWindow.toUpperCase()}</Text> • Monitored Universe: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>18 Tickers</Text>
        </Text>
      </View>

      {/* Tier 1: Needs Attention */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIndicator, { backgroundColor: colors.negative }]} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Needs Attention
          </Text>
          <Badge variant="red" isDark={isDark}>
            {needsAttention.length}
          </Badge>
        </View>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Immediate review
        </Text>
      </View>

      <View
        style={[
          styles.streamCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {needsAttention.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.forest} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No critical alerts or material guidance breaches.
            </Text>
          </View>
        ) : (
          needsAttention.map((item, idx) =>
            renderSignalRow(item, idx === needsAttention.length - 1)
          )
        )}
      </View>

      {/* Tier 2: Worth Watching */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIndicator, { backgroundColor: colors.accentMuted }]} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Worth Watching
          </Text>
          <Badge variant="sage" isDark={isDark}>
            {worthWatching.length}
          </Badge>
        </View>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Operational catalysts
        </Text>
      </View>

      <View
        style={[
          styles.streamCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {worthWatching.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No medium-priority operational updates matching criteria.
            </Text>
          </View>
        ) : (
          worthWatching.map((item, idx) =>
            renderSignalRow(item, idx === worthWatching.length - 1)
          )
        )}
      </View>

      {/* Tier 3: Routine Compliance Drawer (Collapsible) */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIndicator, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Routine Compliance
          </Text>
          <Badge variant="sage" isDark={isDark}>
            {routineCompliance.length}
          </Badge>
        </View>
        <TouchableOpacity
          onPress={() => setShowRoutine(!showRoutine)}
          style={styles.toggleRoutineButton}
        >
          <Text style={[styles.toggleRoutineText, { color: colors.forest }]}>
            {showRoutine ? 'Collapse' : 'Show All'}
          </Text>
          <Ionicons
            name={showRoutine ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.forest}
          />
        </TouchableOpacity>
      </View>

      {showRoutine ? (
        <View
          style={[
            styles.streamCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {routineCompliance.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No routine regulatory disclosures in this cycle.
              </Text>
            </View>
          ) : (
            routineCompliance.map((item, idx) =>
              renderSignalRow(item, idx === routineCompliance.length - 1)
            )
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowRoutine(true)}
          style={[
            styles.collapsedNotice,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.collapsedNoticeText, { color: colors.textMuted }]}>
            {routineCompliance.length} routine administrative filings categorized and silenced.
          </Text>
          <Text style={[styles.collapsedNoticeAction, { color: colors.forest }]}>
            Expand
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.ui,
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  contextRow: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  contextText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  toggleRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toggleRoutineText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    fontFamily: FontFamily.ui,
  },
  streamCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  signalRow: {
    padding: 14,
  },
  signalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  signalTickerGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  tickerText: {
    fontSize: FontSize.subhead,
    fontFamily: FontFamily.mono,
  },
  tickerMain: {
    fontWeight: FontWeight.bold,
  },
  tickerSub: {
    fontSize: FontSize.caption,
  },
  companyNameText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    flex: 1,
  },
  signalBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.mono,
  },
  headlineText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
    lineHeight: 20,
    marginBottom: 4,
  },
  takeawayText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    lineHeight: 18,
    marginBottom: 8,
  },
  signalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signalFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eodBadgeText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.medium,
    fontFamily: FontFamily.ui,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inspectText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  collapsedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  collapsedNoticeText: {
    flex: 1,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  collapsedNoticeAction: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    textAlign: 'center',
  },
});
