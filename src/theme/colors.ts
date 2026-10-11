/**
 * Design tokens — Warm Editorial Minimalism palette
 * Derived from the reference image specification
 */

export const colors = {
  // Base surfaces
  background: '#F5ECE7',        // App background — warm cream
  surface: '#FFFAF5',           // Main surface — ivory white
  surfaceSecondary: '#FCF0E0',  // Secondary surface — warm beige
  surfaceHighlight: '#FFFFFF',  // White highlight

  // Text
  textPrimary: '#493B30',       // Primary text — dark brown
  textSecondary: '#927D68',     // Secondary text — muted brown
  textMuted: '#B8A999',         // Muted metadata

  // Brand / Interactive
  brownPrimary: '#795746',      // Primary brown — nav, selected states
  brownActive: '#B38B6C',       // Active tab background — lighter beige-brown
  goldMuted: '#AD9064',         // Muted gold — accent, slider active track
  goldLight: '#D4C4B0',         // Lighter gold for subtle accents

  // UI
  divider: '#EEE4DB',           // Thin separators
  disabled: '#D9D4CF',          // Disabled controls
  overlay: 'rgba(73, 59, 48, 0.35)', // Bottom sheet backdrop

  // Renad Moment accent (sky blue — reserved for that feature only)
  renadBlue: '#6BA3D6',
  renadBlueLight: '#A8D0E6',

  // Semantic
  success: '#6B8E5C',
  warning: '#C49A3C',
  error: '#B85C4A',

  // Verse highlight
  verseHighlight: 'rgba(179, 139, 108, 0.18)', // Subtle beige highlight
} as const;

export type ColorKey = keyof typeof colors;

// Dark theme (future — keep structure ready)
export const colorsDark = {
  ...colors,
  background: '#2D2520',
  surface: '#3A302A',
  surfaceSecondary: '#443830',
  surfaceHighlight: '#251F1B',
  textPrimary: '#F5ECE7',
  textSecondary: '#C9B8A8',
  textMuted: '#9E8D7A',
  divider: '#4A3E35',
  disabled: '#5A4E45',
  overlay: 'rgba(245, 236, 231, 0.25)',
  verseHighlight: 'rgba(179, 139, 108, 0.25)',
} as const;