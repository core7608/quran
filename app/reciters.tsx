/**
 * Reciters Screen — pick the default recitation.
 * Catalogue is a curated list of 22 recitations served by AlQuran Cloud (no
 * audio is bundled). Reciters labelled "سورة" serve one file per surah;
 * others serve one file per ayah.
 */

import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/providers';
import { RECITERS } from '@/services/api/reciters';
import { toArabicDigits } from '@/data/quran';

export default function RecitersScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useAppTheme();
  const defaultId = settings.audio.defaultReciterId;

  const select = (id: string) => {
    updateSettings({ audio: { ...settings.audio, defaultReciterId: id } });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="القُرّاء"
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <FlatList
        data={RECITERS}
        keyExtractor={(item) => item.id}
        initialNumToRender={22}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[textStyles.caption, styles.listHint]}>
            الاستماع عبر الإنترنت من AlQuran Cloud — {toArabicDigits(RECITERS.length)} قارئاً
          </Text>
        }
        renderItem={({ item, index }) => {
          const isActive = item.id === defaultId;
          return (
            <Pressable style={[styles.row, index === 0 && styles.rowFirst]} onPress={() => select(item.id)} accessibilityRole="button">
              <View style={styles.ornament}>
                <Text style={styles.ornamentText}>{index + 1}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={[textStyles.body, styles.rowTitle]}>{item.name}</Text>
                <Text style={[textStyles.caption, styles.rowSubtitle]}>{item.nameTransliterated}</Text>
              </View>
              <View style={[styles.modeBadge, item.mode === 'surah' && styles.modeBadgeSurah]}>
                <Text style={styles.modeBadgeText}>{item.mode === 'surah' ? 'سورة' : 'آيات'}</Text>
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
  ornament: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ornamentText: {
    fontFamily: theme.fontFamily.latinBold,
    fontSize: theme.fontSize.xs,
    color: theme.colors.brownPrimary,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
  },
  rowSubtitle: {
    color: theme.colors.textMuted,
  },
  modeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  modeBadgeSurah: {
    backgroundColor: theme.colors.goldLight,
  },
  modeBadgeText: {
    ...textStyles.caption,
    color: theme.colors.brownPrimary,
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
});