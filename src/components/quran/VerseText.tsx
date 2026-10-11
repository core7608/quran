/**
 * Quranic Verse Text Component
 * Uthmani script rendering, verse number ornament, selection highlight.
 * Translation / Tafsir are shown below the Arabic text when enabled.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme, textStyles } from '@/theme';
import type { Verse, QuranDisplaySettings } from '@/types';

interface VerseTextProps {
  verse: Verse;
  index?: number;
  settings: QuranDisplaySettings;
  translation?: string;
  tafsir?: string;
  isSelected?: boolean;
  onPress?: (verse: Verse) => void;
  onLongPress?: (verse: Verse) => void;
  showToolbar?: boolean;
  toolbarActions?: React.ReactNode;
}

const FONT_SIZE_MAP = {
  small: theme.fontSize.quranSmall,
  medium: theme.fontSize.quranBase,
  large: theme.fontSize.quranLarge,
  xlarge: theme.fontSize.quranXLarge,
} as const;

export const VerseText = React.memo(
  ({
    verse,
    settings,
    translation,
    tafsir,
    isSelected = false,
    onPress,
    onLongPress,
    showToolbar = false,
    toolbarActions,
  }: VerseTextProps) => {
    const quranFontSize = FONT_SIZE_MAP[settings.fontSize];
    const quranLineHeight = quranFontSize * theme.lineHeight.quran;

    return (
      <View style={styles.container}>
        {/* Main Quranic Text */}
        <Pressable
          onPress={() => onPress?.(verse)}
          onLongPress={() => onLongPress?.(verse)}
          style={[
            styles.verseWrapper,
            isSelected && styles.verseSelected,
            settings.highlightActiveVerse && isSelected && styles.verseHighlighted,
          ]}
          android_ripple={{ color: theme.colors.verseHighlight }}
          accessibilityRole="button"
          accessibilityLabel={`الآية ${verse.verse}`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={styles.verseContent}>
            {/* Verse Number Ornament */}
            {settings.showVerseNumbers && (
              <View style={styles.verseNumber}>
                <Text style={styles.verseNumberText}>{verse.verse}</Text>
              </View>
            )}

            {/* Arabic Text — Uthmani Script */}
            <Text
              style={[
                styles.arabicText,
                {
                  fontFamily: theme.fontFamily.quran,
                  fontSize: quranFontSize,
                  lineHeight: quranLineHeight,
                },
              ]}
              selectable={false}
            >
              {verse.text}
            </Text>
          </View>
        </Pressable>

        {/* Translation */}
        {settings.translationEnabled && translation ? (
          <View style={styles.translationWrapper}>
            <Text style={[textStyles.translation, styles.translationText]}>{translation}</Text>
          </View>
        ) : null}

        {/* Tafsir */}
        {settings.tafsirEnabled && tafsir ? (
          <View style={styles.tafsirWrapper}>
            <Text style={[textStyles.tafsir, styles.tafsirText]}>{tafsir}</Text>
          </View>
        ) : null}

        {/* Verse Action Toolbar */}
        {showToolbar && isSelected && toolbarActions ? (
          <View style={styles.toolbar}>{toolbarActions}</View>
        ) : null}
      </View>
    );
  }
);

VerseText.displayName = 'VerseText';

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  verseWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  verseSelected: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  verseHighlighted: {
    backgroundColor: theme.colors.verseHighlight,
  },
  verseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  verseNumber: {
    marginTop: theme.spacing.xs,
    flexShrink: 0,
  },
  verseNumberText: {
    fontFamily: theme.fontFamily.latinMedium,
    fontSize: theme.fontSize.xs,
    color: theme.colors.goldMuted,
    fontWeight: '600',
  },
  arabicText: {
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: theme.letterSpacing.arabic,
  },
  translationWrapper: {
    marginTop: theme.spacing.sm,
    paddingRight: theme.spacing.md + 24,
    borderRightWidth: 2,
    borderRightColor: theme.colors.goldLight,
    paddingVertical: theme.spacing.xs,
  },
  translationText: {
    textAlign: 'right',
    color: theme.colors.textSecondary,
  },
  tafsirWrapper: {
    marginTop: theme.spacing.sm,
    paddingRight: theme.spacing.md + 24,
    borderRightWidth: 2,
    borderRightColor: theme.colors.goldMuted,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.sm,
  },
  tafsirText: {
    textAlign: 'right',
    color: theme.colors.textPrimary,
  },
  toolbar: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
});