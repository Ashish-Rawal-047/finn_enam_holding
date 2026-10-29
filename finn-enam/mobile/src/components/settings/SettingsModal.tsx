import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Company, AlertSettings, AnnouncementCategory, DigestWindow } from '../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Badge } from '../common/Badge';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_LABELS, DEFAULT_ALERT_SETTINGS } from '../../data/alertSettings';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  companies: Company[];
  onToggleWatchlist: (ticker: string) => void;
  settings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
  isDark?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  companies,
  onToggleWatchlist,
  settings,
  onChangeSettings,
  isDark = false,
}) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts' | 'categories'>('watchlist');
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const colors = isDark ? DarkColors : LightColors;

  const filteredCompanies = companies.filter((c) => {
    if (!watchlistSearch.trim()) return true;
    const q = watchlistSearch.toLowerCase().trim();
    return c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const watchlistCount = companies.filter((c) => c.inWatchlist).length;

  const priceThresholdOptions = [2, 3, 5, 7, 10];
  const volumeThresholdOptions = [1.5, 2.0, 2.5, 3.0, 5.0];
  const windowOptions: Array<{ id: DigestWindow; label: string }> = [
    { id: '24h', label: '24 Hours' },
    { id: '48h', label: '48 Hours' },
    { id: '7d', label: '7 Days' },
    { id: 'all', label: 'All History' },
  ];

  const handleToggleCategory = (cat: AnnouncementCategory) => {
    onChangeSettings({
      ...settings,
      enabledCategories: {
        ...settings.enabledCategories,
        [cat]: !settings.enabledCategories[cat],
      },
    });
  };

  const handleResetDefaults = () => {
    onChangeSettings(DEFAULT_ALERT_SETTINGS);
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Settings & Watchlist"
      subtitle={`${watchlistCount} of ${companies.length} companies tracked`}
      isDark={isDark}
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={handleResetDefaults}
            style={[styles.resetBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>
              Reset Defaults
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.doneBtn, { backgroundColor: colors.forest }]}
          >
            <Text style={styles.doneBtnText}>Save & Apply</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* Sub Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('watchlist')}
          style={[
            styles.tabItem,
            activeTab === 'watchlist' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'watchlist' ? colors.forest : colors.textMuted },
              activeTab === 'watchlist' && { fontWeight: FontWeight.bold },
            ]}
          >
            Watchlist ({watchlistCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('alerts')}
          style={[
            styles.tabItem,
            activeTab === 'alerts' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'alerts' ? colors.forest : colors.textMuted },
              activeTab === 'alerts' && { fontWeight: FontWeight.bold },
            ]}
          >
            Alert Thresholds
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('categories')}
          style={[
            styles.tabItem,
            activeTab === 'categories' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'categories' ? colors.forest : colors.textMuted },
              activeTab === 'categories' && { fontWeight: FontWeight.bold },
            ]}
          >
            Categories (17)
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: WATCHLIST MANAGER */}
      {activeTab === 'watchlist' && (
        <View style={styles.tabContent}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="search" size={14} color={colors.textTertiary} />
            <TextInput
              placeholder="Search universe..."
              placeholderTextColor={colors.textTertiary}
              value={watchlistSearch}
              onChangeText={setWatchlistSearch}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
          </View>

          <View style={styles.companiesList}>
            {filteredCompanies.map((c) => (
              <View
                key={c.ticker}
                style={[
                  styles.companyRow,
                  { borderBottomColor: colors.borderLight },
                ]}
              >
                <View style={styles.companyInfo}>
                  <View style={styles.tickerCapRow}>
                    <Text style={[styles.tickerText, { color: colors.textPrimary }]}>
                      {c.ticker}
                    </Text>
                    <Badge variant="sage" isDark={isDark}>
                      {c.marketCapCategory}
                    </Badge>
                  </View>
                  <Text style={[styles.companyNameText, { color: colors.textMuted }]} numberOfLines={1}>
                    {c.name} • {c.sector}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onToggleWatchlist(c.ticker)}
                  style={[
                    styles.watchToggleBtn,
                    {
                      backgroundColor: c.inWatchlist ? colors.forest : colors.surfaceMuted,
                      borderColor: c.inWatchlist ? colors.forest : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={c.inWatchlist ? 'star' : 'star-outline'}
                    size={14}
                    color={c.inWatchlist ? '#FFFFFF' : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.watchToggleText,
                      { color: c.inWatchlist ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {c.inWatchlist ? 'Tracking' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* TAB 2: ALERT SENSITIVITY THRESHOLDS */}
      {activeTab === 'alerts' && (
        <View style={styles.tabContent}>
          {/* Price Move Sensitivity */}
          <View style={styles.settingBlock}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
              Price Move Sensitivity Trigger
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
              Alert when a company moves more than this percentage in a single session.
            </Text>
            <View style={styles.optionsRow}>
              {priceThresholdOptions.map((opt) => {
                const isSelected = settings.priceMoveThresholdPercent === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() =>
                      onChangeSettings({ ...settings, priceMoveThresholdPercent: opt })
                    }
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? colors.forest : colors.surfaceMuted,
                        borderColor: isSelected ? colors.forest : colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                    >
                      ±{opt}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Volume Spike Sensitivity */}
          <View style={styles.settingBlock}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
              Volume Spike Sensitivity Trigger
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
              Alert when daily volume exceeds multiple of 20-day moving average.
            </Text>
            <View style={styles.optionsRow}>
              {volumeThresholdOptions.map((opt) => {
                const isSelected = settings.volumeSpikeMultiplier === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() =>
                      onChangeSettings({ ...settings, volumeSpikeMultiplier: opt })
                    }
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? colors.forest : colors.surfaceMuted,
                        borderColor: isSelected ? colors.forest : colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                    >
                      {opt}x 20-DMA
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Digest Time Window */}
          <View style={styles.settingBlock}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
              Active Digest Window
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
              Historical lookback timeframe for market triggers and announcements.
            </Text>
            <View style={styles.optionsRow}>
              {windowOptions.map((win) => {
                const isSelected = settings.activeDigestWindow === win.id;
                return (
                  <TouchableOpacity
                    key={win.id}
                    onPress={() =>
                      onChangeSettings({ ...settings, activeDigestWindow: win.id })
                    }
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? colors.forest : colors.surfaceMuted,
                        borderColor: isSelected ? colors.forest : colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                    >
                      {win.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* TAB 3: 17 BSE/NSE ANNOUNCEMENT CATEGORIES */}
      {activeTab === 'categories' && (
        <View style={styles.tabContent}>
          <Text style={[styles.settingDesc, { color: colors.textMuted, marginBottom: 12 }]}>
            Toggle statutory filing classifications defined by ENAM institutional framework.
          </Text>

          {(Object.keys(CATEGORY_LABELS) as AnnouncementCategory[]).map((cat) => {
            const isEnabled = settings.enabledCategories[cat] !== false;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => handleToggleCategory(cat)}
                style={[
                  styles.categoryRow,
                  { borderBottomColor: colors.borderLight },
                ]}
              >
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                    {CATEGORY_LABELS[cat]?.label || cat}
                  </Text>
                  <Text style={[styles.categorySlug, { color: colors.textTertiary }]}>
                    {CATEGORY_LABELS[cat]?.desc || cat}
                  </Text>
                </View>

                <View
                  style={[
                    styles.toggleSwitch,
                    { backgroundColor: isEnabled ? colors.forest : colors.surfaceMuted },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      isEnabled ? { alignSelf: 'flex-end', backgroundColor: '#FFFFFF' } : { alignSelf: 'flex-start', backgroundColor: colors.textTertiary },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  tabText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  tabContent: {
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    paddingVertical: 0,
  },
  companiesList: {
    gap: 2,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  companyInfo: {
    flex: 1,
    marginRight: 10,
  },
  tickerCapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  tickerText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  companyNameText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  watchToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  watchToggleText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  settingBlock: {
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  categorySlug: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.mono,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    fontFamily: FontFamily.ui,
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    fontFamily: FontFamily.ui,
  },
});
