import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { EventMemoryItem, CommitmentStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { LightColors, DarkColors } from '../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { EventMemoryDetailModal } from '../components/memory/EventMemoryDetailModal';

interface EventMemoryScreenProps {
  items: EventMemoryItem[];
  onNavigateToResearch: (ticker: string) => void;
  initialSelectedId?: string;
  isDark?: boolean;
}

export const EventMemoryScreen: React.FC<EventMemoryScreenProps> = ({
  items,
  onNavigateToResearch,
  initialSelectedId,
  isDark = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<EventMemoryItem | null>(() => {
    if (initialSelectedId) {
      return items.find((i) => i.id === initialSelectedId) || null;
    }
    return null;
  });

  const colors = isDark ? DarkColors : LightColors;

  // Accountability Statistics
  const totalCount = items.length;
  const deliveredCount = items.filter((i) => i.status === 'delivered').length;
  const delayedCount = items.filter((i) => i.status === 'delayed').length;
  const trackingCount = items.filter((i) => i.status === 'pending' || i.status === 'revised').length;
  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.ticker.toLowerCase().includes(q) ||
          item.companyName.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.announcedMetric.toLowerCase().includes(q) ||
          item.factsSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedStatus, selectedCategory, searchQuery]);

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="forest" dot isDark={isDark}>Delivered on Time</Badge>;
      case 'delayed':
        return <Badge variant="red" dot isDark={isDark}>Delayed / Rescheduled</Badge>;
      case 'revised':
        return <Badge variant="amber" dot isDark={isDark}>Target Revised</Badge>;
      case 'pending':
      default:
        return <Badge variant="sage" dot isDark={isDark}>Actively Tracking</Badge>;
    }
  };

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
      {/* Top Accountability Summary Banner */}
      <View
        style={[
          styles.summaryBanner,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryTitleGroup}>
            <View style={styles.signatureBadge}>
              <Ionicons name="time-outline" size={13} color={colors.forest} />
              <Text style={[styles.signatureText, { color: colors.forest }]}>
                Signature Feature
              </Text>
            </View>
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              Corporate Commitment Ledger
            </Text>
          </View>
          <View style={styles.rateCircle}>
            <Text style={[styles.rateValue, { color: colors.forest }]}>{deliveryRate}%</Text>
            <Text style={[styles.rateLabel, { color: colors.textMuted }]}>Delivered</Text>
          </View>
        </View>

        <Text style={[styles.summaryDesc, { color: colors.textSecondary }]}>
          Auditing management concall guidance, capex deadlines, and operational promises against subsequent audited exchange filings.
        </Text>

        <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Pledges</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.positive }]}>{deliveredCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Fulfilled</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.negative }]}>{delayedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Delayed</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{trackingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>In-Flight</Text>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          placeholder="Filter commitments, tickers, capex targets..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsScroll}
      >
        {[
          { id: 'all', label: 'All Statuses' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'delayed', label: 'Delayed / Missed' },
          { id: 'pending', label: 'Actively Tracking' },
          { id: 'revised', label: 'Revised' },
        ].map((chip) => {
          const isSelected = selectedStatus === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => setSelectedStatus(chip.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? colors.forest : colors.surface,
                  borderColor: isSelected ? colors.forest : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  isSelected && { fontWeight: FontWeight.bold },
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Commitment List Header */}
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderTitle, { color: colors.textPrimary }]}>
          Audited Commitments ({filteredItems.length})
        </Text>
        <Text style={[styles.listHeaderSub, { color: colors.textMuted }]}>
          Tap row for full timeline
        </Text>
      </View>

      {/* Commitment Ledger Cards */}
      <View style={styles.cardsList}>
        {filteredItems.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="filter-outline" size={24} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No commitments match the active filter criteria.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveModalItem(item)}
              activeOpacity={0.7}
              style={[
                styles.commitmentCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardTickerRow}>
                  {formatTicker(item.ticker)}
                  <Text style={[styles.cardCompanyName, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.companyName}
                  </Text>
                </View>
                {getStatusBadge(item.status)}
              </View>

              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>

              {/* Metric Box */}
              <View
                style={[
                  styles.metricCalloutBox,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.metricRow}>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Promised Target:</Text>
                  <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                    {item.announcedMetric}
                  </Text>
                </View>
                <View style={[styles.metricRow, { marginTop: 4 }]}>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Deadline / Milestone:</Text>
                  <Text style={[styles.metricVal, { color: colors.forest }]}>
                    {item.milestoneDeadline}
                  </Text>
                </View>
              </View>

              {/* Facts Summary */}
              <Text
                style={[styles.factsSummaryText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.factsSummary}
              </Text>

              {/* Card Footer */}
              <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
                <View style={styles.footerSourceGroup}>
                  <Ionicons name="document-text-outline" size={12} color={colors.textTertiary} />
                  <Text style={[styles.footerSourceText, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.sourceDoc} • Declared {item.commitmentDate}
                  </Text>
                </View>

                <View style={styles.auditActionRow}>
                  <Text style={[styles.auditActionText, { color: colors.forest }]}>Audit History</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.forest} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Detail Modal */}
      <EventMemoryDetailModal
        visible={!!activeModalItem}
        onClose={() => setActiveModalItem(null)}
        item={activeModalItem}
        onNavigateToResearch={onNavigateToResearch}
        isDark={isDark}
      />

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
  summaryBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  signatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  signatureText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
    letterSpacing: 0.3,
  },
  summaryTitle: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  rateCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5EEE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateValue: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  rateLabel: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  summaryDesc: {
    fontSize: FontSize.caption,
    lineHeight: 19,
    fontFamily: FontFamily.ui,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  statLabel: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
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
  filterChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  listHeaderTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  listHeaderSub: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  cardsList: {
    gap: 12,
  },
  commitmentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTickerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  tickerText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.mono,
  },
  tickerMain: {
    fontWeight: FontWeight.bold,
  },
  tickerSub: {
    fontSize: FontSize.caption,
  },
  cardCompanyName: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
    lineHeight: 20,
    marginBottom: 8,
  },
  metricCalloutBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  metricVal: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
    flexShrink: 1,
    textAlign: 'right',
  },
  factsSummaryText: {
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  footerSourceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerSourceText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
    flex: 1,
  },
  auditActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  auditActionText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    textAlign: 'center',
  },
});
