/**
 * Unified theme — single source of truth for design tokens
 */

import { colors } from './colors';
import { spacing, radius, elevation } from './spacing';
import { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing, textStyles } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  elevation,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  textStyles,
} as const;

export type Theme = typeof theme;

// Helper to access theme values with type safety
export const useTheme = () => theme;

// Platform-specific adjustments
export const platformAdjustments = {
  ios: {
    // iOS safe area handling
    headerExtraHeight: 0,
  },
  android: {
    // Android status bar
    headerExtraHeight: 0,
  },
  web: {
    // Web-specific
    headerExtraHeight: 0,
  },
} as const;