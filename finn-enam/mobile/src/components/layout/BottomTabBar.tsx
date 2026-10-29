import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

export type NavigationTab = 'today' | 'signals' | 'research' | 'memory';

interface BottomTabBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unreadSignalsCount?: number;
  isDark?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  unreadSignalsCount = 0,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  const tabs: Array<{
    id: NavigationTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    badge?: number;
  }> = [
    {
      id: 'today',
      label: 'Today',
      icon: 'sparkles-outline',
      activeIcon: 'sparkles',
    },
    {
      id: 'signals',
      label: 'Signals',
      icon: 'notifications-outline',
      activeIcon: 'notifications',
      badge: unreadSignalsCount,
    },
    {
      id: 'research',
      label: 'Research',
      icon: 'search-outline',
      activeIcon: 'search',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: 'time-outline',
      activeIcon: 'time',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.tabBarBg, borderTopColor: colors.tabBarBorder }]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconName = isActive ? tab.activeIcon : tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={styles.tabButton}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isActive ? colors.tabActive : colors.tabInactive}
                />
                {tab.badge && tab.badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: isDark ? colors.primary : colors.primary }]}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.tabActive : colors.tabInactive,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>

              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.tabActive }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 1,
    shadowColor: '#102A1F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    position: 'relative',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },
  tabLabel: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.tiny,
    marginTop: 3,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

