/**
 * More Screen — hub for the non-reading features.
 * Rows link to reciters, tafsir, bookmarks, settings, Renad Moment and about.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { quranStorage, notesStorage } from '@/storage';
import { toArabicDigits } from '@/data/quran';

interface MenuEntry {
  key: string;
  glyph: string;
  label: string;
  hint?: string;
  path:
    | '/reciters'
    | '/tafsir'
    | '/bookmarks'
    | '/khatmah'
    | '/notes'
    | '/settings'
    | '/renad-moment'
    | '/about';
}

export default function MoreScreen() {
  const router = useRouter();
  const bookmarkCount = useMemo(() => quranStorage.getBookmarks().length, []);
  const noteCount = useMemo(() => notesStorage.getAll().length, []);

  const entries: MenuEntry[] = [
    { key: 'khatmah', glyph: '۞', label: 'رحلة ختمة', hint: 'ورد يومي ذكي', path: '/khatmah' },
    { key: 'notes', glyph: '✎', label: 'دفتر التدبر', hint: noteCount ? `${toArabicDigits(noteCount)} خاطرة` : 'ملاحظاتك', path: '/notes' },
    { key: 'reciters', glyph: '♫', label: 'القُرّاء', hint: '22 قارئاً', path: '/reciters' },
    { key: 'tafsir', glyph: '✦', label: 'التفسير', hint: 'الميسّر مُضمَّن', path: '/tafsir' },
    { key: 'bookmarks', glyph: '★', label: 'الإشارات المرجعية', hint: bookmarkCount ? `(${bookmarkCount})` : undefined, path: '/bookmarks' },
    { key: 'settings', glyph: '⚙', label: 'الإعدادات', path: '/settings' },
    { key: 'renad', glyph: '☁', label: 'لحظة رناد', path: '/renad-moment' },
    { key: 'about', glyph: 'ℹ', label: 'حول التطبيق', path: '/about' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="المزيد" />

      <View style={styles.list}>
        {entries.map((entry, index) => (
          <Pressable
            key={entry.key}
            style={[styles.row, index === 0 && styles.rowFirst]}
            onPress={() => router.push({ pathname: entry.path })}
            accessibilityRole="button"
          >
            <View style={styles.ornament}>
              <Text style={styles.ornamentGlyph}>{entry.glyph}</Text>
            </View>
            <Text style={[textStyles.body, styles.rowLabel]}>{entry.label}</Text>
            <View style={styles.rowEnd}>
              {entry.hint ? <Text style={styles.rowHint}>{entry.hint}</Text> : null}
              <Text style={styles.rowChevron}>‹</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[textStyles.caption, styles.footerText]}>
          القرآن الكريم — نسخة مطابقة للمصحف (QCF Madani 1405)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    marginHorizontal: theme.spacing.screenPadding,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  ornament: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ornamentGlyph: {
    fontSize: 16,
    color: theme.colors.brownPrimary,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.textPrimary,
  },
  rowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rowHint: {
    ...textStyles.caption,
    color: theme.colors.textMuted,
  },
  rowChevron: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.goldMuted,
  },
  footer: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});