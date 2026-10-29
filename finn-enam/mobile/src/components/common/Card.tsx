import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LightColors, DarkColors } from '../../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'subtle' | 'sage';
  isDark?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return colors.surfaceSubtle;
      case 'sage':
        return colors.surfaceSage;
      case 'surface':
      default:
        return colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#18342A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
});
