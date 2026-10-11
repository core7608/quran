/**
 * Surah Row — Clean list item per reference design
 * Geometric ornament with surah number, transliterated name, verse count, revelation type, Arabic name
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme, textStyles } from '@/theme';
import type { Surah } from '@/types';

interface SurahRowProps {
  surah: Surah;
  onPress: () => void;
  isLastRead?: boolean;
  progress?: number; // 0-1
  showProgress?: boolean;
}

export const SurahRow = React.memo(({ surah, onPress, isLastRead, progress, showProgress = false }: SurahRowProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      android_ripple={{ color: theme.colors.brownActive }}
      accessibilityRole="button"
      accessibilityLabel={`${surah.nameTransliterated}، سورة ${surah.nameArabic}، ${surah.verseCount} آيات`}
    >
      {/* Surah Number Ornament — Geometric Islamic pattern */}
      <View style={styles.numberOrnament}>
        <Text style={styles.numberText}>{surah.number}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>

        {/* Top row: Transliterated name + Verse count + Revelation type */}
        <View style={styles.topRow}>
          <Text style={styles.nameTransliterated} numberOfLines={1}>
            {surah.nameTransliterated}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.verseCount}>
              {surah.verseCount} \u0622\u064A\u0629
            </Text>
            <View style={styles.revelationBadge}>
              <Text style={styles.revelationText}>
                {surah.revelationType === 'meccan' ? '\u0645\u0643\u064A\u0629' : '\u0645\u062F\u0646\u064A\u0629'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom row: Arabic name (aligned right per reference) */}
        <View style={styles.bottomRow}>
          <Text style={styles.nameArabic} numberOfLines={1}>
            {surah.nameArabic}
          </Text>
        </View>

        {/* Optional progress bar for "Last Read" cards */}
        {showProgress && progress !== undefined && progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(progress, 1) * 100}%` },
              ]}
            />
          </View>
        )}
      </View>

      {/* Last Read indicator */}
      {isLastRead && <View style={styles.lastReadDot} />}
    </Pressable>
  );
});

SurahRow.displayName = 'SurahRow';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    gap: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    position: 'relative',
  },
  numberOrnament: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    flexShrink: 0,
  },
  numberText: {
    fontFamily: theme.fontFamily.latinBold,
    fontSize: theme.fontSize.md,
    color: theme.colors.brownPrimary,
    fontWeight: '700',
    lineHeight: theme.fontSize.md,
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  nameTransliterated: {
    ...textStyles.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexShrink: 0,
  },
  verseCount: {
    ...textStyles.caption,
    color: theme.colors.textSecondary,
  },
  revelationBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  revelationText: {
    ...textStyles.labelLatin,
    color: theme.colors.textSecondary,
    textTransform: 'lowercase',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nameArabic: {
    ...textStyles.bodyLarge,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
    height: 3,
    backgroundColor: theme.colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.brownActive,
    borderRadius: 2,
  },
  lastReadDot: {
    position: 'absolute',
    right: theme.spacing.screenPadding,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.brownActive,
  },
});