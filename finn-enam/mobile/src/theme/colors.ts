/**
 * FINN Mobile Design Tokens: Forest Green x Cream x White
 * Distinctive luxury fintech aesthetic for institutional investors.
 */

export const LightColors = {
  // Backgrounds & Surfaces
  background: '#F7F3E8',       // Warm cream
  surface: '#FFFFFF',          // Pure white card surfaces
  surfaceSubtle: '#FBF9F3',    // Ivory
  surfaceSage: '#E5EEE5',      // Soft sage accent surface
  surfaceMuted: '#EFEBE0',     // Muted surface / chip
  
  // Brand & Primaries
  primary: '#164E3B',          // Deep forest green
  forest: '#164E3B',           // Deep forest green alias
  primaryLight: '#187653',     // Rich emerald
  primaryMuted: '#2D6A4F',     // Mid green
  accentMuted: '#B97924',      // Muted amber accent
  
  // Typography
  textPrimary: '#18342A',      // Deep green-ink
  textSecondary: '#4A5B52',    // Mid olive-gray
  textMuted: '#758078',        // Muted olive-gray
  textInverse: '#FFFFFF',      // White
  textTertiary: '#9BA39B',     // Tertiary muted
  
  // Dividers & Borders
  border: '#E7E3D8',           // Subtle warm divider
  borderLight: '#F0ECE1',
  borderSubtle: '#F0ECE1',
  borderHighlight: '#D2DEC5',  // Sage tint border
  
  // Status Colors (Restrained)
  positive: '#164E3B',         // Forest green positive
  positiveLight: '#E8F5E9',
  negative: '#B94B48',         // Restrained muted red
  negativeLight: '#FBEBEB',
  warning: '#B97924',          // Muted amber
  warningLight: '#FDF6E8',
  info: '#187653',
  infoLight: '#E5EEE5',
  
  // Navigation & Badges
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E7E3D8',
  tabActive: '#164E3B',
  tabInactive: '#8A958E',
};

export const DarkColors = {
  // Backgrounds & Surfaces
  background: '#0B1B14',       // Deep green-black
  surface: '#12251D',          // Rich dark green surface
  surfaceSubtle: '#183026',    // Raised surface
  surfaceSage: '#1C3B2E',      // Dark sage surface
  surfaceMuted: '#1A3327',     // Dark muted surface
  
  // Brand & Primaries
  primary: '#2A9D6F',          // Bright emerald accent
  forest: '#2A9D6F',           // Bright emerald alias
  primaryLight: '#48BB88',
  primaryMuted: '#1E6F4E',
  accentMuted: '#E29A44',      // Dark amber accent
  
  // Typography
  textPrimary: '#F7F3E8',      // Warm cream text
  textSecondary: '#C3CEB9',    // Soft sage text
  textMuted: '#84968C',        // Muted sage text
  textInverse: '#0B1B14',
  textTertiary: '#5C7468',     // Dark tertiary muted
  
  // Dividers & Borders
  border: '#213B2E',           // Subtle dark sage divider
  borderLight: '#182C22',
  borderSubtle: '#182C22',
  borderHighlight: '#2A4D3B',
  
  // Status Colors
  positive: '#48BB88',
  positiveLight: '#113322',
  negative: '#D97572',
  negativeLight: '#3D1C1B',
  warning: '#E29A44',
  warningLight: '#382510',
  info: '#2A9D6F',
  infoLight: '#163828',
  
  // Navigation
  tabBarBg: '#0F2119',
  tabBarBorder: '#1A3327',
  tabActive: '#48BB88',
  tabInactive: '#6D8277',
};

export type ThemeColors = typeof LightColors;
