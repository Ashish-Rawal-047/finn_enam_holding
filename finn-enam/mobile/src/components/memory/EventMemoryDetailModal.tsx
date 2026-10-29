import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EventMemoryItem, CommitmentStatus } from '../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Badge } from '../common/Badge';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface EventMemoryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  item: EventMemoryItem | null;
  onNavigateToResearch: (ticker: string) => void;
  isDark?: boolean;
}

export const EventMemoryDetailModal: React.FC<EventMemoryDetailModalProps> = ({
  visible,
  onClose,
  item,
  onNavigateToResearch,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  if (!item) return null;

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

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={item.title}
      subtitle={`${item.ticker} • ${item.companyName} • Declared: ${item.commitmentDate}`}
      isDark={isDark}
      footer={
        <TouchableOpacity
          onPress={() => {
            onClose();
            onNavigateToResearch(item.ticker);
          }}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            Investigate {item.ticker} Fundamentals &rarr;
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.content}>
        {/* Milestone Goal Bar */}
        <View style={[styles.goalCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={styles.goalRow}>
            <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
              TARGET METRIC:
            </Text>
            {getStatusBadge(item.status)}
          </View>
          <Text style={[styles.goalValue, { color: colors.textPrimary }]}>
            {item.announcedMetric}
          </Text>
          <Text style={[styles.goalDeadline, { color: colors.textSecondary }]}>
            Stated Deadline: <Text style={{ fontWeight: FontWeight.bold }}>{item.milestoneDeadline}</Text>
          </Text>
        </View>

        {/* Verbatim Quote Box */}
        <View style={[styles.quoteCard, { backgroundColor: isDark ? '#163828' : '#E5EEE5', borderColor: colors.borderHighlight }]}>
          <View style={styles.quoteHeader}>
            <Text style={[styles.quoteLabel, { color: colors.primary }]}>
              ORIGINAL VERBATIM PROMISE ({item.commitmentDate})
            </Text>
            <Text style={[styles.quoteSource, { color: colors.textMuted }]}>
              {item.sourceDoc}
            </Text>
          </View>
          <Text style={[styles.quoteText, { color: colors.textPrimary }]}>
            "{item.sourcePageOrQuote}"
          </Text>
        </View>

        {/* 3-Step Chronological Audit Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>
              Chronological Audit Trail ({item.timeline.length} Observations)
            </Text>
            <Text style={[styles.timelineVerified, { color: colors.primary }]}>
              Verified Filings
            </Text>
          </View>

          <View style={styles.timelineContainer}>
            {item.timeline.map((obs, idx) => (
              <View key={idx} style={styles.timelineStep}>
                {/* Vertical connecting line */}
                {idx < item.timeline.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: isDark ? '#213B2E' : '#D2DEC5' }]} />
                )}

                {/* Node icon */}
                <View style={[styles.timelineNode, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                  <View style={styles.timelineNodeInner} />
                </View>

                {/* Content */}
                <View style={[styles.timelineContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepDate, { color: colors.textPrimary }]}>
                      {obs.date}
                    </Text>
                    <Text style={[styles.stepSource, { color: colors.textMuted }]}>
                      {obs.sourceDoc}
                    </Text>
                  </View>

                  <Text style={[styles.stepObs, { color: colors.textSecondary }]}>
                    {obs.observation}
                  </Text>

                  {obs.reportedMetric ? (
                    <View style={[styles.reportedPill, { backgroundColor: colors.surfaceSage }]}>
                      <Text style={[styles.reportedText, { color: colors.primary }]}>
                        Audited Metric: {obs.reportedMetric}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Fact vs. AI Assessment Separation */}
        <View style={styles.separationGrid}>
          {/* Audited Facts */}
          <View style={[styles.assessmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.assessmentHeader}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={[styles.assessmentTitle, { color: colors.textPrimary }]}>
                Audited Corporate Facts
              </Text>
            </View>
            <Text style={[styles.assessmentText, { color: colors.textSecondary }]}>
              {item.factsSummary}
            </Text>
          </View>

          {/* AI Assessment */}
          <View style={[styles.assessmentCard, { backgroundColor: isDark ? '#1C3B2E' : '#F7F3E8', borderColor: colors.borderHighlight }]}>
            <View style={styles.assessmentHeader}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={[styles.assessmentTitle, { color: colors.primary }]}>
                FINN Capital Allocation Assessment
              </Text>
            </View>
            <Text style={[styles.assessmentText, { color: colors.textSecondary }]}>
              {item.aiInterpretation}
            </Text>
          </View>
        </View>

        {/* Historical Precedents Comps */}
        {item.historicalComps && item.historicalComps.length > 0 && (
          <View style={[styles.compsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.compsHeader}>
              <Ionicons name="git-compare-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.compsTitle, { color: colors.textPrimary }]}>
                Comparable Historical Precedent
              </Text>
            </View>

            {item.historicalComps.map((comp, idx) => (
              <View key={idx} style={[styles.compItem, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <View style={styles.compItemHeader}>
                  <Text style={[styles.compCompany, { color: colors.textPrimary }]}>
                    {comp.companyOrPeer}
                  </Text>
                  <Text style={[styles.compYear, { color: colors.textMuted }]}>
                    {comp.year}
                  </Text>
                </View>
                <Text style={[styles.compPast, { color: colors.textSecondary }]}>
                  {comp.pastEvent}
                </Text>
                <Text style={[styles.compOutcome, { color: colors.primary }]}>
                  Historical Outcome: {comp.outcome}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  goalCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  goalValue: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
  },
  goalDeadline: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  quoteCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  quoteSource: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
  },
  quoteText: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.body,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timelineSection: {
    gap: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  timelineVerified: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.semibold,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStep: {
    position: 'relative',
    paddingLeft: 22,
    paddingBottom: 14,
  },
  timelineLine: {
    position: 'absolute',
    left: 4.5,
    top: 14,
    bottom: 0,
    width: 2,
  },
  timelineNode: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeInner: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  timelineContent: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepDate: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stepSource: {
    fontFamily: FontFamily.sans,
    fontSize: 9,
  },
  stepObs: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    lineHeight: 16,
  },
  reportedPill: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  reportedText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: FontWeight.semibold,
  },
  separationGrid: {
    gap: 10,
  },
  assessmentCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  assessmentTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  assessmentText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    lineHeight: 17,
  },
  compsCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  compsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compsTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  compItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  compItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compCompany: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
  compYear: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
  },
  compPast: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    lineHeight: 16,
  },
  compOutcome: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
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
