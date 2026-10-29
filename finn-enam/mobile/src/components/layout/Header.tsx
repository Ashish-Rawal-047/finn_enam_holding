import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  watchlistCount: number;
  onOpenSettings: () => void;
  onOpenProvenance: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  watchlistCount,
  onOpenSettings,
  onOpenProvenance,
  isDark,
  onToggleTheme,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        {/* Brand & Wordmark */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>FN</Text>
          </View>
          <View style={styles.brandTextContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
                FINN
              </Text>
              <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
                ENAM INTEL
              </Text>
            </View>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              Institutional Agent
            </Text>
          </View>
        </View>

        {/* Right Actions */}
        <View style={styles.actionsContainer}>
          {/* EOD Data Pill */}
          <TouchableOpacity
            onPress={onOpenProvenance}
            style={[styles.pillButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.primaryLight }]} />
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>EOD</Text>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Watchlist Counter Pill */}
          <TouchableOpacity
            onPress={onOpenSettings}
            style={[styles.pillButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={12} color="#D97706" />
            <Text style={[styles.pillTextBold, { color: colors.textPrimary }]}>
              {watchlistCount}
            </Text>
          </TouchableOpacity>

          {/* Settings Trigger */}
          <TouchableOpacity
            onPress={onOpenSettings}
            style={[styles.iconButton, { backgroundColor: colors.surfaceSage }]}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={onToggleTheme}
            style={[styles.iconButton, { backgroundColor: colors.surfaceSage }]}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={15}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandTitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
    letterSpacing: 0.8,
  },
  tagline: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.medium,
  },
  pillTextBold: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
