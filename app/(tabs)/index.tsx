/**
 * Home Screen — Warm editorial design per reference.
 *
 * Header (title + quick tools), "آخر قراءة" horizontal cards, a segmented
 * navigation (سورة / صفحة / جزء) and a data-driven list. The old hamburger
 * drawer and the hizb/ruku tabs are gone: the only navigation modes are those
 * derivable from the bundled data.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { AppHeader } from '@/components/common/AppHeader';
import { SurahRow } from '@/components/quran/SurahRow';
import { QuickToolsSheet } from '@/components/quran/QuickToolsSheet';
import { quranData, toArabicDigits } from '@/data/quran';
import { computeProgress } from '@/data/khatmah';
import { quranStorage, khatmahStorage } from '@/storage';
import type { ReadingProgress, NavigationMode, KhatmahPlan } from '@/types';

const NAV_TABS = [
  { key: 'surah', label: 'سورة' },
  { key: 'page', label: 'صفحة' },
  { key: 'juz', label: 'جزء' },
];

interface PageRowData {
  page: number;
  surahNumber: number;
  surahName: string;
  surahTransliterated: string;
}

interface JuzRowData {
  juz: number;
  surahName: string;
  page: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [lastRead, setLastRead] = useState<ReadingProgress[]>(() =>
    quranStorage.getProgress().slice(0, 5)
  );
  const [khatmah, setKhatmah] = useState<KhatmahPlan | null>(() => khatmahStorage.getPlan());
  const [navMode, setNavMode] = useState<NavigationMode>('surah');
  const [refreshing, setRefreshing] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);

  // Re-read the plan whenever the tab regains focus (e.g. after using Khatmah).
  useFocusEffect(
    useCallback(() => {
      setKhatmah(khatmahStorage.getPlan());
    }, [])
  );

  const refresh = useCallback(() => {
    // Quran data is synchronous & bundled; last-read comes from storage.
    setLastRead(quranStorage.getProgress().slice(0, 5));
    setKhatmah(khatmahStorage.getPlan());
  }, []);

  const surahs = useMemo(() => quranData.getAllSurahs(), []);
  const juzStarts = useMemo(() => quranData.getJuzStarts(), []);

  const pagesData = useMemo<PageRowData[]>(() => {
    const rows: PageRowData[] = [];
    for (let p = 1; p <= 604; p++) {
      const surah = quranData.getSurahByPage(p);
      rows.push({
        page: p,
        surahNumber: surah?.number ?? 0,
        surahName: surah?.nameArabic ?? '',
        surahTransliterated: surah?.nameTransliterated ?? '',
      });
    }
    return rows;
  }, []);

  const juzData = useMemo<JuzRowData[]>(
    () =>
      juzStarts.map((j) => ({
        juz: j.juz,
        surahName: quranData.getSurah(j.surah)?.nameArabic ?? '',
        page: j.page,
      })),
    [juzStarts]
  );

  const openSurah = (number: number) => {
    router.push({ pathname: '/reader', params: { surah: String(number), mode: 'surah' } });
  };

  const openPage = (page: number) => {
    router.push({ pathname: '/mushaf', params: { page: String(page) } });
  };

  const openLastRead = (progress: ReadingProgress) => {
    router.push({
      pathname: '/reader',
      params: { surah: String(progress.surah), verse: String(progress.verse), mode: 'surah' },
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderRow = ({ item }: { item: unknown }) => {
    if (navMode === 'page') {
      const row = item as PageRowData;
      return (
        <TouchableOpacity style={styles.listRow} onPress={() => openPage(row.page)} activeOpacity={0.7}>
          <View style={styles.ornament}>
            <Text style={styles.ornamentNumber}>{toArabicDigits(row.page)}</Text>
          </View>
          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <Text style={[textStyles.body, styles.rowTitle]} numberOfLines={1}>
                {row.surahName || '—'}
              </Text>
              <Text style={[textStyles.caption, styles.rowMeta]}>صفحة {toArabicDigits(row.page)}</Text>
            </View>
            <Text style={[textStyles.caption, styles.rowSubtitle]} numberOfLines={1}>
              {row.surahTransliterated}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (navMode === 'juz') {
      const row = item as JuzRowData;
      return (
        <TouchableOpacity style={styles.listRow} onPress={() => openPage(row.page)} activeOpacity={0.7}>
          <View style={styles.ornament}>
            <Text style={styles.ornamentNumber}>{toArabicDigits(row.juz)}</Text>
          </View>
          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <Text style={[textStyles.body, styles.rowTitle]} numberOfLines={1}>
                {row.surahName || '—'}
              </Text>
              <Text style={[textStyles.caption, styles.rowMeta]}>جزء {toArabicDigits(row.juz)}</Text>
            </View>
            <Text style={[textStyles.caption, styles.rowSubtitle]}>يبدأ في صفحة {toArabicDigits(row.page)}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const surah = item as (typeof surahs)[number];
    const progress = lastRead.find((lr) => lr.surah === surah.number);
    return (
      <SurahRow
        surah={surah}
        onPress={() => openSurah(surah.number)}
        isLastRead={Boolean(progress)}
        progress={progress ? Math.min(progress.verse / surah.verseCount, 1) : 0}
        showProgress={Boolean(progress)}
      />
    );
  };

  const data: unknown[] =
    navMode === 'page' ? pagesData : navMode === 'juz' ? juzData : surahs;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="القرآن الكريم"
        leadingIcon={<Text style={styles.headerGlyph}>☰</Text>}
        onLeadingPress={() => setToolsVisible(true)}
        leadingLabel="الأدوات السريعة"
        trailingIcon={<Text style={styles.headerGlyph}>⌕</Text>}
        onTrailingPress={() => router.push({ pathname: '/search' })}
        trailingLabel="البحث"
      />

      <FlatList
        data={data}
        keyExtractor={(item) => {
          const it = item as { page?: number; juz?: number; number?: number };
          return String(it.page ?? it.juz ?? it.number ?? 0);
        }}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.brownPrimary]} tintColor={theme.colors.brownPrimary} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            {lastRead.length > 0 && <LastReadSection lastRead={lastRead} onPress={openLastRead} />}

            <KhatmahCard plan={khatmah} onPress={() => router.push({ pathname: '/khatmah' })} />

            <View style={styles.section}>
              <SegmentedControl
                segments={NAV_TABS}
                value={navMode}
                onChange={(key) => setNavMode(key as NavigationMode)}
                scrollable={false}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[textStyles.h4, styles.sectionTitle]}>
                {navMode === 'surah' ? 'السور' : navMode === 'page' ? 'الصفحات' : 'الأجزاء'}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews={false}
      />

      <QuickToolsSheet visible={toolsVisible} onClose={() => setToolsVisible(false)} />
    </SafeAreaView>
  );
}

// ============================================
// Last Read section
// ============================================

interface LastReadSectionProps {
  lastRead: ReadingProgress[];
  onPress: (progress: ReadingProgress) => void;
}

function LastReadSection({ lastRead, onPress }: LastReadSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[textStyles.h4, styles.sectionTitle]}>آخر قراءة</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lastReadContent}>
        {lastRead.map((progress) => {
          const surah = quranData.getSurah(progress.surah);
          if (!surah) return null;
          return (
            <TouchableOpacity key={`${progress.surah}-${progress.verse}`} onPress={() => onPress(progress)} style={styles.lastReadCard} activeOpacity={0.85}>
              <View style={styles.lastReadCardContent}>
                <Text style={styles.lastReadSurahName}>{surah.nameArabic}</Text>
                <Text style={styles.lastReadTransliterated}>{surah.nameTransliterated}</Text>
                <View style={styles.lastReadMeta}>
                  <Text style={styles.lastReadVerse}>
                    آية {toArabicDigits(progress.verse)} من {toArabicDigits(surah.verseCount)}
                  </Text>
                  <Text style={styles.lastReadJuz}>
                    جزء {toArabicDigits(quranData.getVerse(progress.surah, progress.verse)?.juz ?? 0)}
                  </Text>
                </View>
                <View style={styles.lastReadProgress}>
                  <View
                    style={[
                      styles.lastReadProgressBar,
                      { width: `${Math.min((progress.verse / surah.verseCount) * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.lastReadTime}>{formatRelativeTime(progress.lastReadAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ============================================
// Khatmah card
// ============================================

function KhatmahCard({ plan, onPress }: { plan: KhatmahPlan | null; onPress: () => void }) {
  const progress = useMemo(() => computeProgress(plan), [plan]);

  if (!plan) {
    return (
      <TouchableOpacity style={styles.khatmahCard} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.khatmahIcon}>
          <Text style={styles.khatmahIconGlyph}>۞</Text>
        </View>
        <View style={styles.khatmahInfo}>
          <Text style={[textStyles.body, styles.khatmahTitle]}>رحلة ختمة</Text>
          <Text style={[textStyles.caption, styles.khatmahSubtitle]}>
            حدّد مدة ختمتك وسنوزّع الورد اليومي تلقائيًا
          </Text>
        </View>
        <Text style={styles.khatmahChevron}>‹</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.khatmahCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.khatmahIcon}>
        <Text style={styles.khatmahIconGlyph}>۞</Text>
      </View>
      <View style={styles.khatmahInfo}>
        <View style={styles.khatmahTop}>
          <Text style={[textStyles.body, styles.khatmahTitle]}>ختمتك</Text>
          <Text style={[textStyles.caption, styles.khatmahPercent]}>
            {toArabicDigits(progress.percent)}%
          </Text>
        </View>
        <Text style={[textStyles.caption, styles.khatmahSubtitle]}>
          {progress.remainingCount === 0
            ? 'أتممت الختمة، تقبّل الله 🤍'
            : `وِرد اليوم ${toArabicDigits(progress.todayTarget)} صفحة · ويتبقّى ${toArabicDigits(progress.daysRemaining)} يومًا`}
        </Text>
        <View style={styles.khatmahTrack}>
          <View style={[styles.khatmahFill, { width: `${progress.percent}%` }]} />
        </View>
      </View>
      <Text style={styles.khatmahChevron}>‹</Text>
    </TouchableOpacity>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${toArabicDigits(minutes)} دقيقة`;
  if (hours < 24) return `منذ ${toArabicDigits(hours)} ساعة`;
  if (days < 7) return `منذ ${toArabicDigits(days)} يوم`;
  return new Date(timestamp).toLocaleDateString('ar-SA');
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGlyph: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    width: 44,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  section: {
    paddingHorizontal: theme.spacing.screenPadding,
    marginTop: theme.spacing.sectionGap,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.screenPadding,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  // Last read
  lastReadContent: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    paddingBottom: theme.spacing.xs,
  },
  lastReadCard: {
    width: 176,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.cardPadding,
    minHeight: 148,
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  lastReadCardContent: {
    gap: theme.spacing.xs,
  },
  lastReadSurahName: {
    ...textStyles.bodyLarge,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  lastReadTransliterated: {
    ...textStyles.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  lastReadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  lastReadVerse: {
    ...textStyles.caption,
    color: theme.colors.textSecondary,
  },
  lastReadJuz: {
    ...textStyles.caption,
    color: theme.colors.goldMuted,
  },
  lastReadProgress: {
    height: 3,
    backgroundColor: theme.colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  lastReadProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.brownActive,
    borderRadius: 2,
  },
  lastReadTime: {
    ...textStyles.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  // List rows
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    gap: theme.spacing.lg,
  },
  ornament: {
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
  ornamentNumber: {
    fontFamily: theme.fontFamily.latinBold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.brownPrimary,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  rowMeta: {
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  rowSubtitle: {
    color: theme.colors.textMuted,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.screenPadding,
  },
  // Khatmah card
  khatmahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.screenPadding,
    marginTop: theme.spacing.sectionGap,
    padding: theme.spacing.cardPadding,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  khatmahIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  khatmahIconGlyph: {
    fontSize: 22,
    color: theme.colors.goldMuted,
  },
  khatmahInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  khatmahTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  khatmahTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  khatmahPercent: {
    color: theme.colors.brownPrimary,
    fontWeight: '700',
  },
  khatmahSubtitle: {
    color: theme.colors.textMuted,
  },
  khatmahTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.divider,
    overflow: 'hidden',
    marginTop: 2,
  },
  khatmahFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.brownActive,
  },
  khatmahChevron: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.goldMuted,
  },
});