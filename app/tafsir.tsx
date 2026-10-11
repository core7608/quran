/**
 * Tafsir Screen — choose the tafsir used in the Reader.
 *
 * Exactly ONE tafsir is bundled: التفسير الميسّر (`ar.muyassar`), which works
 * fully offline. Additional editions are fetched from the Quran.com API
 * (online only) — they are never bundled.
 */

import React from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/providers';
import { tafsirApi } from '@/services/api/tafsir';
import { MUYASSAR_EDITION } from '@/data/tafsir/muyassar';
import { toArabicDigits } from '@/data/quran';
import type { TafsirEdition } from '@/types';

export default function TafsirScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useAppTheme();
  const quranDisplay = settings.quranDisplay;

  const editionsQuery = useQuery({
    queryKey: ['tafsir-editions'],
    queryFn: () => tafsirApi.getEditions(),
    staleTime: 10 * 60 * 1000,
  });

  const onlineEditions = editionsQuery.data?.data ?? [];

  const select = (id: string) => {
    updateSettings({ quranDisplay: { ...quranDisplay, tafsirSource: id, tafsirEnabled: true } });
    router.back();
  };

  const bundledRow: TafsirEdition = MUYASSAR_EDITION;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="التفسير"
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <FlatList
        data={[bundledRow, ...onlineEditions]}
        keyExtractor={(item) => item.id}
        initialNumToRender={16}
        ListHeaderComponent={
          <Text style={[textStyles.caption, styles.listHint]}>
            التفسير الميسّر مضمَّن ويعمل بدون إنترنت. بقية التفاسير تُجلب من Quran.com عند الاتصال.
          </Text>
        }
        ListEmptyComponent={
          editionsQuery.isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={theme.colors.brownPrimary} size="small" />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={[textStyles.bodySmall, { color: theme.colors.textMuted }]}>
                تعذّر جلب التفاسير عبر الإنترنت.
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isActive = quranDisplay.tafsirSource === item.id;
          return (
            <Pressable style={[styles.row, index === 0 && styles.rowFirst]} onPress={() => select(item.id)} accessibilityRole="button">
              <View style={styles.rowText}>
                <View style={styles.rowTitleLine}>
                  <Text style={[textStyles.body, styles.rowTitle]}>{item.nameArabic || item.name}</Text>
                  {item.isBundled && (
                    <View style={styles.bundledBadge}>
                      <Text style={styles.bundledBadgeText}>مضمَّن</Text>
                    </View>
                  )}
                </View>
                <Text style={[textStyles.caption, styles.rowSubtitle]} numberOfLines={1}>
                  {item.author} • {item.language === 'ar' ? 'العربية' : item.language}
                  {' • '}
                  {item.isBundled ? `${toArabicDigits(item.verseCoverage)}% من الآيات بدون إنترنت` : 'عبر الإنترنت'}
                </Text>
              </View>
              <View style={[styles.radio, isActive && styles.radioActive]}>
                {isActive && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        }}
      />
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
  listHint: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
  },
  bundledBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.goldLight,
  },
  bundledBadgeText: {
    ...textStyles.caption,
    color: theme.colors.brownPrimary,
  },
  rowSubtitle: {
    color: theme.colors.textMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.goldMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: theme.colors.brownPrimary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.brownPrimary,
  },
  empty: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
});