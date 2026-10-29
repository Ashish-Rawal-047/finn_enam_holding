/**
 * FINN Mobile Typography System
 * Editorial serif display for focal insights + clean modern sans for institutional density.
 */

import { Platform } from 'react-native';

const sansFont = Platform.select({
  ios: '-apple-system',
  android: 'sans-serif',
  default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
});

export const FontFamily = {
  // Editorial display serif
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: "'DM Serif Display', Georgia, 'Times New Roman', serif",
  }),
  // Clean UI sans-serif
  sans: sansFont,
  ui: sansFont,
  body: sansFont,
  // Financial numbers & ticker codes
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
  }),
};

export const FontSize = {
  hero: 28,
  h1: 24,
  h2: 20,
  h3: 17,
  title: 17,
  subhead: 15,
  bodyLarge: 15,
  body: 13,
  caption: 11,
  tiny: 10,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
