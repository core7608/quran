/**
 * Bookmarks Screen — saved verses.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { quranStorage } from '@/storage';
import { quranData, toArabicDigits } from '@/data/quran';
import type { Bookmark } from '@/types';

export default function BookmarksScreen() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);

  const bookmarks = quranStorage.getBookmarks();

  const remove = useCallback((bookmark: Bookmark) => {
    Alert.alert('حذف الإشارة؟', 'سيتم حذف هذه الإشارة المرجعية.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          quranStorage.removeBookmark(bookmark.id);
          forceUpdate((n) => n + 1);
        },
      },
    ]);
  }, []);

  const open = (bookmark: Bookmark) => {
    router.push({
      pathname: '/reader',
      params: { surah: String(bookmark.surah), verse: String(bookmark.verse), mode: 'surah' },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="الإشارات المرجعية"
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[textStyles.body, styles.emptyText]}>
            لا توجد إشارات بعد. اضغط مطولاً على آية في القارئ لتخزينها.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const surah = quranData.getSurah(item.surah);
            const verse = quranData.getVerse(item.surah, item.verse);
            return (
              <Pressable
                style={styles.row}
                onPress={() => open(item)}
                onLongPress={() => remove(item)}
                delayLongPress={350}
              >
                <View style={styles.ornament}>
                  <Text style={styles.ornamentGlyph}>★</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[textStyles.body, styles.rowTitle]}>
                    {surah?.nameArabic ?? ''} • آية {toArabicDigits(item.verse)}
                  </Text>
                  <Text style={[textStyles.bodySmall, styles.rowVerse]} numberOfLines={2}>
                    {verse?.text ?? ''}
                  </Text>
                  <Text style={[textStyles.caption, styles.rowTime]}>
                    {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navGlyph: {
    fontSize: 24,
    color: theme.colors.textPrimary,
    width: 44,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  ornament: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  ornamentGlyph: {
    fontSize: 14,
    color: theme.colors.goldMuted,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
  },
  rowVerse: {
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: theme.lineHeight.base,
  },
  rowTime: {
    color: theme.colors.textMuted,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});