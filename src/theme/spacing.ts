/**
 * Spacing scale — consistent 4px base unit
 * Generous negative space per reference design
 */

export const spacing = {
  // Base unit: 4px
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  lg: 16,   // 16px
  xl: 20,   // 20px
  xxl: 24,  // 24px
  xxxl: 32, // 32px
  huge: 48, // 48px

  // Semantic aliases
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  componentGap: 16,
  itemGap: 12,
  tightGap: 8,
} as const;

export type SpacingKey = keyof typeof spacing;

// Border radius scale
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,

  // Semantic
  card: 12,
  button: 10,
  sheet: 24,      // Bottom sheet top corners
  chip: 8,        // Tab chips
  avatar: 9999,
} as const;

export type RadiusKey = keyof typeof radius;

// Shadow / elevation (minimal, flat design)
export const elevation = {
  none: 0,
  sheet: 2,       // Bottom sheet subtle shadow
  card: 0,        // Flat cards per reference
  modal: 4,
} as const;