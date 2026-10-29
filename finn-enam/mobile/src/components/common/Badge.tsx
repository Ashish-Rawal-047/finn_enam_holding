import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'forest' | 'sage' | 'amber' | 'red' | 'neutral';
  size?: 'xs' | 'sm';
  dot?: boolean;
  isDark?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'forest',
  size = 'xs',
  dot = false,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  const getColors = () => {
    switch (variant) {
      case 'forest':
        return {
          bg: isDark ? '#163828' : '#E5EEE5',
          text: isDark ? '#48BB88' : '#164E3B',
          dot: isDark ? '#48BB88' : '#164E3B',
        };
      case 'sage':
        return {
          bg: isDark ? '#1C3B2E' : '#EAECE6',
          text: isDark ? '#C3CEB9' : '#3E5045',
          dot: isDark ? '#C3CEB9' : '#3E5045',
        };
      case 'amber':
        return {
          bg: isDark ? '#382510' : '#FDF6E8',
          text: isDark ? '#E29A44' : '#B97924',
          dot: isDark ? '#E29A44' : '#B97924',
        };
      case 'red':
        return {
          bg: isDark ? '#3D1C1B' : '#FBEBEB',
          text: isDark ? '#D97572' : '#B94B48',
          dot: isDark ? '#D97572' : '#B94B48',
        };
      case 'neutral':
      default:
        return {
          bg: isDark ? '#183026' : '#F0ECE1',
          text: isDark ? '#84968C' : '#5A6860',
          dot: isDark ? '#84968C' : '#5A6860',
        };
    }
  };

  const styleColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: styleColors.bg },
        size === 'sm' ? styles.badgeSm : styles.badgeXs,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: styleColors.dot }]} />
      )}
      <Text
        style={[
          styles.text,
          { color: styleColors.text },
          size === 'sm' ? styles.textSm : styles.textXs,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeXs: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  badgeSm: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4.5,
  },
  text: {
    fontFamily: FontFamily.mono,
    fontWeight: FontWeight.semibold,
  },
  textXs: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
