import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertSettings, DigestWindow, AnnouncementCategory } from '../../types';
import { ModalSheet } from '../common/ModalSheet';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { CATEGORY_LABELS } from '../../data/alertSettings';

interface SignalFilterModalProps {
  visible: boolean;
  onClose: () => void;
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  activeFilterCount: number;
  onResetFilters: () => void;
  isDark?: boolean;
}

export const SignalFilterModal: React.FC<SignalFilterModalProps> = ({
  visible,
  onClose,
  settings,
  onChangeSettings,
  activeFilterCount,
  onResetFilters,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  const windows: Array<{ id: DigestWindow; label: string }> = [
    { id: '24h', label: 'Last 24 Hours' },
    { id: '48h', label: 'Last 48 Hours' },
    { id: '7d', label: 'Past 7 Days' },
    { id: 'all', label: 'All Recent' },
  ];

  const categories = Object.keys(CATEGORY_LABELS) as AnnouncementCategory[];

  const toggleCategory = (cat: AnnouncementCategory) => {
    onChangeSettings({
      ...settings,
      enabledCategories: {
        ...settings.enabledCategories,
        [cat]: !settings.enabledCategories[cat],
      },
    });
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Signal Filters & Digest Window"
      subtitle={`${activeFilterCount} custom filters active`}
      isDark={isDark}
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={onResetFilters}
            style={[styles.resetButton, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.container}>
        {/* Section 1: Time Horizon Digest */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Digest Time Window
          </Text>
          <View style={styles.pillRow}>
            {windows.map((w) => {
              const isSelected = settings.activeDigestWindow === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => onChangeSettings({ ...settings, activeDigestWindow: w.id })}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Severity Threshold */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Minimum Severity
          </Text>
          <View style={styles.pillRow}>
            {[
              { id: 'all', label: 'All Disclosures' },
              { id: 'high_only', label: 'High & Critical Only' },
            ].map((s) => {
              const isSelected = settings.minSeverity === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => onChangeSettings({ ...settings, minSeverity: s.id as any })}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: 17 Announcement Categories */}
        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Exchange Filing Categories (17 Reference Classes)
            </Text>
          </View>

          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const isEnabled = settings.enabledCategories[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => toggleCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isEnabled ? (isDark ? '#1C3B2E' : '#E5EEE5') : colors.surface,
                      borderColor: isEnabled ? colors.borderHighlight : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isEnabled ? colors.primary : colors.textMuted,
                        fontWeight: isEnabled ? FontWeight.bold : FontWeight.medium,
                      },
                    ]}
                  >
                    {CATEGORY_LABELS[cat]?.label || cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  applyButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
});
