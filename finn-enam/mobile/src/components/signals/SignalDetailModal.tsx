import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Announcement, TriggeredAlert, QuarterlyResults, ManagementChange } from '../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Badge } from '../common/Badge';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface SignalDetailModalProps {
  visible: boolean;
  onClose: () => void;
  signal: Announcement | TriggeredAlert | null;
  onNavigateToResearch: (ticker: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
  isDark?: boolean;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({
  visible,
  onClose,
  signal,
  onNavigateToResearch,
  onNavigateToMemory,
  isDark = false,
}) => {
  const [showFullEvidence, setShowFullEvidence] = useState(false);
  const colors = isDark ? DarkColors : LightColors;

  if (!signal) return null;

  const isAnnouncement = 'category' in signal;
  const ticker = signal.ticker;
  const companyName = signal.companyName;
  const headline = 'title' in signal ? signal.title : signal.headline;
  const takeaway = 'oneLineTakeaway' in signal ? signal.oneLineTakeaway : signal.explanation;
  const whyItMatters = 'whyItMatters' in signal ? signal.whyItMatters : 'Breached configured anomaly sensitivity threshold.';
  const timestamp = signal.timestamp;
  const quarterlyResults: QuarterlyResults | undefined = isAnnouncement ? signal.quarterlyResults : undefined;
  const managementChange: ManagementChange | undefined = isAnnouncement ? signal.managementChange : undefined;
  const eventMemoryId: string | undefined = isAnnouncement ? signal.eventMemoryId : undefined;
  const sourceDocTitle = isAnnouncement ? signal.sourceDocTitle : 'NSE / BSE Official End-of-Day Series';
  const sourceUrl = isAnnouncement ? signal.sourceUrl : 'https://www.nseindia.com';

  const formatDelta = (val: number, isBps = false) => {
    const isPos = val >= 0;
    const sign = isPos ? '+' : '';
    const unit = isBps ? ' bps' : '%';
    return (
      <Text style={[styles.deltaText, { color: isPos ? colors.positive : colors.negative }]}>
        {sign}{val.toFixed(1)}{unit}
      </Text>
    );
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={headline}
      subtitle={`${ticker} • ${companyName} • ${timestamp}`}
      isDark={isDark}
      footer={
        <TouchableOpacity
          onPress={() => {
            onClose();
            onNavigateToResearch(ticker);
          }}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            Investigate {ticker} in Research Workspace &rarr;
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.content}>
        {/* Layer 1: Executive Summary */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#183026' : '#F7F3E8', borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            EXECUTIVE TAKEAWAY
          </Text>
          <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
            {takeaway}
          </Text>
          <View style={[styles.relevanceBox, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.relevanceLabel, { color: colors.textSecondary }]}>
              Relevance: <Text style={{ fontWeight: FontWeight.regular, color: colors.textSecondary }}>{whyItMatters}</Text>
            </Text>
          </View>
        </View>

        {/* Layer 2A: Quarterly Financial Results Table */}
        {quarterlyResults && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {quarterlyResults.quarter} Audited Headline Metrics
              </Text>
              <Text style={[styles.metricSubtitle, { color: colors.textMuted }]}>
                Margin: <Text style={{ color: colors.textPrimary, fontWeight: FontWeight.bold }}>{quarterlyResults.ebitdaMargin.toFixed(1)}%</Text> ({formatDelta(quarterlyResults.ebitdaMarginChangeBps, true)})
              </Text>
            </View>

            <View style={styles.gridContainer}>
              <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cellLabel, { color: colors.textMuted }]}>REVENUE</Text>
                <Text style={[styles.cellValue, { color: colors.textPrimary }]}>₹{quarterlyResults.revenue.toLocaleString()} Cr</Text>
                <Text style={styles.cellSub}>{formatDelta(quarterlyResults.revenueYoY)} YoY</Text>
              </View>

              <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cellLabel, { color: colors.textMuted }]}>EBITDA</Text>
                <Text style={[styles.cellValue, { color: colors.textPrimary }]}>₹{quarterlyResults.ebitda.toLocaleString()} Cr</Text>
                <Text style={styles.cellSub}>{formatDelta(quarterlyResults.ebitdaYoY)} YoY</Text>
              </View>

              <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cellLabel, { color: colors.textMuted }]}>PBT</Text>
                <Text style={[styles.cellValue, { color: colors.textPrimary }]}>₹{quarterlyResults.pbt.toLocaleString()} Cr</Text>
                <Text style={styles.cellSub}>{formatDelta(quarterlyResults.pbtYoY)} YoY</Text>
              </View>

              <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cellLabel, { color: colors.textMuted }]}>PAT</Text>
                <Text style={[styles.cellValue, { color: colors.textPrimary }]}>₹{quarterlyResults.pat.toLocaleString()} Cr</Text>
                <Text style={styles.cellSub}>{formatDelta(quarterlyResults.patYoY)} YoY</Text>
              </View>
            </View>
          </View>
        )}

        {/* Layer 2B: Management Change Dossier */}
        {managementChange && managementChange.incomingBio && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Executive Appointment Dossier
              </Text>
              <Badge variant="forest" size="xs" isDark={isDark}>
                {managementChange.direction.toUpperCase()}
              </Badge>
            </View>

            <View style={styles.bioContent}>
              <Text style={[styles.executiveName, { color: colors.textPrimary }]}>
                {managementChange.personName}
              </Text>
              <Text style={[styles.executiveRole, { color: colors.textSecondary }]}>
                {managementChange.role}
              </Text>
              <Text style={[styles.bioSummary, { color: colors.textSecondary }]}>
                {managementChange.incomingBio.summary}
              </Text>

              <View style={styles.pedigreeRow}>
                <View style={[styles.pedigreeBadge, { backgroundColor: colors.surfaceSage }]}>
                  <Text style={[styles.pedigreeLabel, { color: colors.textMuted }]}>PREVIOUS COMPANY</Text>
                  <Text style={[styles.pedigreeValue, { color: colors.textPrimary }]}>{managementChange.incomingBio.previousCompany}</Text>
                </View>
                <View style={[styles.pedigreeBadge, { backgroundColor: colors.surfaceSage }]}>
                  <Text style={[styles.pedigreeLabel, { color: colors.textMuted }]}>TENURE</Text>
                  <Text style={[styles.pedigreeValue, { color: colors.textPrimary }]}>{managementChange.incomingBio.tenureYears}+ Years</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Layer 3: Linked Event Memory Target */}
        {eventMemoryId && onNavigateToMemory && (
          <TouchableOpacity
            onPress={() => {
              onClose();
              onNavigateToMemory(eventMemoryId);
            }}
            style={[styles.memoryLinkCard, { backgroundColor: isDark ? '#1C3B2E' : '#E5EEE5', borderColor: colors.borderHighlight }]}
            activeOpacity={0.8}
          >
            <View style={styles.memoryLinkHeader}>
              <Ionicons name="time" size={16} color={colors.primary} />
              <View style={styles.memoryLinkText}>
                <Text style={[styles.memoryLinkTitle, { color: colors.textPrimary }]}>
                  Linked Historical Commitment
                </Text>
                <Text style={[styles.memoryLinkSub, { color: colors.textSecondary }]}>
                  This filing updates a tracked management milestone in Event Memory.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Layer 4: Primary Evidence Accordion */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowFullEvidence(!showFullEvidence)}
            style={styles.evidenceToggle}
            activeOpacity={0.7}
          >
            <View style={styles.evidenceLeft}>
              <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.evidenceTitle, { color: colors.textPrimary }]}>
                Primary Source Filing Reference
              </Text>
            </View>
            <Ionicons
              name={showFullEvidence ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showFullEvidence && (
            <View style={[styles.evidenceBody, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.sourceDocTitle, { color: colors.textPrimary }]}>
                {sourceDocTitle}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(sourceUrl)}
                style={styles.openPdfLink}
                activeOpacity={0.7}
              >
                <Text style={[styles.openPdfText, { color: colors.primary }]}>
                  Open Official Exchange PDF Circular
                </Text>
                <Ionicons name="open-outline" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  summaryText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    lineHeight: 19,
    marginTop: 4,
  },
  relevanceBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  relevanceLabel: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    lineHeight: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  metricSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
  },
  deltaText: {
    fontFamily: FontFamily.mono,
    fontWeight: FontWeight.bold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cellLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  cellValue: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  cellSub: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    marginTop: 2,
  },
  bioContent: {
    gap: 4,
  },
  executiveName: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
  },
  executiveRole: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
  bioSummary: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    lineHeight: 18,
    marginTop: 4,
  },
  pedigreeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pedigreeBadge: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
  },
  pedigreeLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    fontWeight: FontWeight.bold,
  },
  pedigreeValue: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  memoryLinkCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  memoryLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memoryLinkText: {
    flex: 1,
  },
  memoryLinkTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
  memoryLinkSub: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
    marginTop: 2,
  },
  evidenceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  evidenceBody: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  sourceDocTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
  },
  openPdfLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openPdfText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
});
