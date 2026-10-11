/**
 * Typography system — Arabic-first, licensed fonts
 * 
 * Fonts to be added to assets/fonts/:
 * - IBM Plex Sans Arabic (OFL) — UI font
 * - Amiri Quran (OFL) — Quranic text (Uthmani script support)
 * - Amiri (OFL) — Translation/Tafsir Arabic
 * - Inter (OFL) — Latin/UI labels
 * - Renad Script (custom licensed) — Renad Moment handwriting
 */

export const fontFamily = {
  // Arabic UI
  arabicUI: 'IBMPlexSansArabic-Regular',
  arabicUIMedium: 'IBMPlexSansArabic-Medium',
  arabicUISemiBold: 'IBMPlexSansArabic-SemiBold',
  arabicUIBold: 'IBMPlexSansArabic-Bold',

  // Quranic text (Uthmani)
  quran: 'AmiriQuran-Regular',
  quranBold: 'AmiriQuran-Bold',

  // Arabic content (translation, tafsir)
  arabicContent: 'Amiri-Regular',
  arabicContentMedium: 'Amiri-Medium',
  arabicContentBold: 'Amiri-Bold',

  // Latin
  latin: 'Inter-Regular',
  latinMedium: 'Inter-Medium',
  latinSemiBold: 'Inter-SemiBold',
  latinBold: 'Inter-Bold',

  // Special
  renadScript: 'RenadScript-Regular', // For Renad Moment only
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

// Font size scale — comfortable reading sizes
export const fontSize = {
  // Caption / metadata
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  xxxl: 26,
  display: 32,

  // Quran-specific
  quranSmall: 20,
  quranBase: 24,
  quranLarge: 28,
  quranXLarge: 32,

  // Translation/Tafsir
  translationBase: 14,
  translationLarge: 16,
} as const;

export type FontSizeKey = keyof typeof fontSize;

// Line height scale — generous for Arabic readability
export const lineHeight = {
  tight: 1.3,
  base: 1.6,
  relaxed: 1.8,
  quran: 2.0,        // Extra generous for Quranic text
  translation: 1.7,
} as const;

// Font weight (mapped to font family variants above)
export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

// Letter spacing
export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
  arabic: 0.15,     // Slight spacing for Arabic readability
} as const;

// Text styles — semantic combinations
export const textStyles = {
  // Headings
  h1: { fontFamily: fontFamily.arabicUIBold, fontSize: fontSize.xxxl, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight },
  h2: { fontFamily: fontFamily.arabicUIBold, fontSize: fontSize.xxl, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight },
  h3: { fontFamily: fontFamily.arabicUIBold, fontSize: fontSize.xl, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight },
  h4: { fontFamily: fontFamily.arabicUIMedium, fontSize: fontSize.lg, lineHeight: lineHeight.base },

  // Body
  bodyLarge: { fontFamily: fontFamily.arabicUI, fontSize: fontSize.lg, lineHeight: lineHeight.relaxed, letterSpacing: letterSpacing.arabic },
  body: { fontFamily: fontFamily.arabicUI, fontSize: fontSize.base, lineHeight: lineHeight.relaxed, letterSpacing: letterSpacing.arabic },
  bodySmall: { fontFamily: fontFamily.arabicUI, fontSize: fontSize.sm, lineHeight: lineHeight.base, letterSpacing: letterSpacing.arabic },

  // Quran text
  quranSmall: { fontFamily: fontFamily.quran, fontSize: fontSize.quranSmall, lineHeight: lineHeight.quran, letterSpacing: letterSpacing.arabic },
  quran: { fontFamily: fontFamily.quran, fontSize: fontSize.quranBase, lineHeight: lineHeight.quran, letterSpacing: letterSpacing.arabic },
  quranLarge: { fontFamily: fontFamily.quran, fontSize: fontSize.quranLarge, lineHeight: lineHeight.quran, letterSpacing: letterSpacing.arabic },
  quranXLarge: { fontFamily: fontFamily.quran, fontSize: fontSize.quranXLarge, lineHeight: lineHeight.quran, letterSpacing: letterSpacing.arabic },

  // Translation / Tafsir
  translation: { fontFamily: fontFamily.arabicContent, fontSize: fontSize.translationBase, lineHeight: lineHeight.translation, letterSpacing: letterSpacing.arabic },
  translationLarge: { fontFamily: fontFamily.arabicContent, fontSize: fontSize.translationLarge, lineHeight: lineHeight.translation, letterSpacing: letterSpacing.arabic },
  tafsir: { fontFamily: fontFamily.arabicContent, fontSize: fontSize.translationBase, lineHeight: lineHeight.translation, letterSpacing: letterSpacing.arabic },

  // UI labels
  label: { fontFamily: fontFamily.arabicUIMedium, fontSize: fontSize.sm, lineHeight: lineHeight.base, letterSpacing: letterSpacing.wide },
  labelLatin: { fontFamily: fontFamily.latinMedium, fontSize: fontSize.xs, lineHeight: lineHeight.base, letterSpacing: letterSpacing.wider },
  caption: { fontFamily: fontFamily.arabicUI, fontSize: fontSize.xs, lineHeight: lineHeight.base, letterSpacing: letterSpacing.normal },
  button: { fontFamily: fontFamily.arabicUIMedium, fontSize: fontSize.base, lineHeight: lineHeight.base, letterSpacing: letterSpacing.wide },

  // Renad Moment
  renadName: { fontFamily: fontFamily.renadScript, fontSize: fontSize.display, lineHeight: lineHeight.tight },
  renadVerse: { fontFamily: fontFamily.quran, fontSize: fontSize.quranLarge, lineHeight: lineHeight.quran, letterSpacing: letterSpacing.arabic },
} as const;

export type TextStyleKey = keyof typeof textStyles;