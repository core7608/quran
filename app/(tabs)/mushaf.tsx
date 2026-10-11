/**
 * Mushaf Screen — the page-based reader.
 *
 * Renders one QCF Madani page at a time via `MushafPage`, phone-sized, with
 * prev/next page navigation, a jump sheet (سورة / صفحة / جزء), per-word verse
 * selection and a Quick Tools sheet (zoom + shared tools).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { BottomSheet } from '@/components/common/BottomSheet';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { QuickToolsSheet, type QuickToolsZoom } from '@/components/quran/QuickToolsSheet';
import { MushafPage } from '@/components/mushaf/MushafPage';
import { quranData, toArabicDigits } from '@/data/quran';
import { getMushafPageCount } from '@/data/mushaf/layout';
import { quranStorage } from '@/storage';
import type { NavigationMode } from '@/types';

const TOTAL_PAGES = getMushafPageCount();
type JumpMode = NavigationMode;

export default function MushafScreen() {
  const params = useLocalSearchParams<{ page?: string; juz?: string }>();

  // Last-read page is captured once; deep-link params take precedence.
  const lastReadPage = useMemo(() => {
    const lastRead = quranStorage.getLastRead();
    return lastRead && lastRead.page >= 1 ? lastRead.page : 1;
  }, []);

  const startPage = useMemo(() => {
    if (params.page) {
      const p = Number(params.page);
      if (Number.isInteger(p) && p >= 1 && p <= TOTAL_PAGES) return p;
    } else if (params.juz) {
      const j = Number(params.juz);
      const start = quranData.getJuzStart(j);
      if (start) return start.page;
    }
    return lastReadPage;
  }, [params.page, params.juz, lastReadPage]);

  // `key` remounts the reader whenever the target page changes, so the reader
  // never has to sync its state from params inside an effect.
  return <MushafReader key={startPage} initialPage={startPage} />;
}

function MushafReader({ initialPage }: { initialPage: number }) {
  const router = useRouter();

  const [page, setPage] = useState<number>(initialPage);
  const [zoom, setZoom] = useState(1);
  const [activeVerse, setActiveVerse] = useState<{ surah: number; verse: number } | null>(null);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [jumpVisible, setJumpVisible] = useState(false);
  const [jumpMode, setJumpMode] = useState<JumpMode>('surah');
  const [pageInput, setPageInput] = useState('');

  const safePage = Math.max(1, Math.min(page, TOTAL_PAGES));

  const surah = useMemo(() => quranData.getSurahByPage(safePage), [safePage]);
  const firstVerse = useMemo(() => quranData.getVersesByPage(safePage)[0], [safePage]);
  const juzText = firstVerse ? `جزء ${toArabicDigits(firstVerse.juz)}` : '';

  const zoomTool: QuickToolsZoom = {
    value: zoom,
    min: 0.8,
    max: 1.6,
    step: 0.05,
    label: 'تكبير الصفحة',
    onChange: setZoom,
  };

  const goPage = useCallback(
    (p: number) => {
      const next = Math.max(1, Math.min(p, TOTAL_PAGES));
      setPage(next);
      setActiveVerse(null);
      setPageInput(String(next));
    },
    []
  );

  const prevPage = () => goPage(safePage - 1);
  const nextPage = () => goPage(safePage + 1);

  const onWordPress = useCallback(
    (owner: { surah: number; verse: number }) => {
      setActiveVerse(owner);
      const verse = quranData.getVerse(owner.surah, owner.verse);
      if (verse) {
        quranStorage.addProgress({
          surah: owner.surah,
          verse: owner.verse,
          page: verse.page,
          lastReadAt: Date.now(),
        });
        quranStorage.setLastRead({
          surah: owner.surah,
          verse: owner.verse,
          page: verse.page,
          lastReadAt: Date.now(),
        });
      }
    },
    []
  );

  const openReaderAtVerse = () => {
    if (!activeVerse) return;
    router.push({
      pathname: '/reader',
      params: { surah: String(activeVerse.surah), verse: String(activeVerse.verse), mode: 'surah' },
    });
  };

  const jumpToSurah = (number: number) => {
    const s = quranData.getSurah(number);
    if (s) {
      goPage(s.pageStart);
      setJumpVisible(false);
    }
  };

  const jumpToJuz = (juz: number) => {
    const start = quranData.getJuzStart(juz);
    if (start) {
      goPage(start.page);
      setJumpVisible(false);
    }
  };

  const submitPage = () => {
    const p = Math.max(1, Math.min(Number(pageInput) || 1, TOTAL_PAGES));
    goPage(p);
    setJumpVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={surah?.nameArabic ?? 'المصحف'}
        subtitle={`صفحة ${toArabicDigits(safePage)} من ${toArabicDigits(TOTAL_PAGES)}${juzText ? ` • ${juzText}` : ''}`}
        leadingIcon={<Text style={styles.navGlyph}>‹</Text>}
        onLeadingPress={prevPage}
        leadingLabel="الصفحة السابقة"
        trailingIcon={<Text style={styles.navGlyph}>›</Text>}
        onTrailingPress={nextPage}
        trailingLabel="الصفحة التالية"
      >
        <Pressable style={styles.toolButton} onPress={() => setToolsVisible(true)} accessibilityLabel="الأدوات السريعة">
          <Text style={styles.toolGlyph}>☰</Text>
        </Pressable>
      </AppHeader>

      {/* Mushaf page body — page fills the width, phone-sized */}
      <View style={styles.body}>
        <MushafPage
          key={safePage}
          page={safePage}
          zoom={zoom}
          activeVerse={activeVerse}
          onWordPress={onWordPress}
        />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.pageButton} onPress={prevPage} accessibilityRole="button">
          <Text style={styles.pageButtonGlyph}>‹</Text>
          <Text style={styles.pageButtonText}>السابقة</Text>
        </Pressable>

        <View style={styles.bottomActions}>
          {activeVerse && (
            <Pressable style={styles.verseChip} onPress={openReaderAtVerse} accessibilityRole="button">
              <Text style={styles.verseChipText}>
                الآية {toArabicDigits(activeVerse.verse)} — اقرأ
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.jumpButton} onPress={() => setJumpVisible(true)} accessibilityRole="button">
            <Text style={styles.jumpButtonText}>الانتقال</Text>
          </Pressable>
        </View>

        <Pressable style={styles.pageButton} onPress={nextPage} accessibilityRole="button">
          <Text style={styles.pageButtonText}>التالية</Text>
          <Text style={styles.pageButtonGlyph}>›</Text>
        </Pressable>
      </View>

      {/* Jump sheet */}
      <BottomSheet visible={jumpVisible} onClose={() => setJumpVisible(false)} title="الانتقال إلى" height={0.6}>
        <View style={styles.jumpHeader}>
          <SegmentedControl
            segments={NAV_SEGMENTS}
            value={jumpMode}
            onChange={(key) => setJumpMode(key as JumpMode)}
            scrollable={false}
          />
        </View>

        {jumpMode === 'surah' && (
          <FlatList
            data={quranData.getAllSurahs()}
            keyExtractor={(item) => String(item.number)}
            initialNumToRender={12}
            style={styles.jumpList}
            renderItem={({ item }) => (
              <Pressable style={styles.jumpRow} onPress={() => jumpToSurah(item.number)}>
                <View style={styles.jumpOrnament}>
                  <Text style={styles.jumpOrnamentText}>{toArabicDigits(item.number)}</Text>
                </View>
                <Text style={[textStyles.body, styles.jumpRowTitle]}>{item.nameArabic}</Text>
                <Text style={[textStyles.caption, styles.jumpRowMeta]}>{item.nameTransliterated}</Text>
              </Pressable>
            )}
          />
        )}

        {jumpMode === 'page' && (
          <View style={styles.pageJumpArea}>
            <Text style={[textStyles.body, styles.jumpRowTitle]}>أدخل رقم الصفحة (1 – {toArabicDigits(TOTAL_PAGES)})</Text>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <TextInput
                style={styles.pageInput}
                keyboardType="number-pad"
                value={pageInput}
                onChangeText={setPageInput}
                placeholder="مثال: ١٢"
                placeholderTextColor={theme.colors.textMuted}
                onSubmitEditing={submitPage}
              />
            </KeyboardAvoidingView>
            <Pressable style={styles.primaryButton} onPress={submitPage} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>انتقال</Text>
            </Pressable>
          </View>
        )}

        {jumpMode === 'juz' && (
          <FlatList
            data={quranData.getJuzStarts()}
            keyExtractor={(item) => String(item.juz)}
            initialNumToRender={12}
            style={styles.jumpList}
            renderItem={({ item }) => {
              const s = quranData.getSurah(item.surah);
              return (
                <Pressable style={styles.jumpRow} onPress={() => jumpToJuz(item.juz)}>
                  <View style={styles.jumpOrnament}>
                    <Text style={styles.jumpOrnamentText}>{toArabicDigits(item.juz)}</Text>
                  </View>
                  <Text style={[textStyles.body, styles.jumpRowTitle]}>{s?.nameArabic ?? ''}</Text>
                  <Text style={[textStyles.caption, styles.jumpRowMeta]}>
                    صفحة {toArabicDigits(item.page)}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
      </BottomSheet>

      {/* Quick tools */}
      <QuickToolsSheet
        visible={toolsVisible}
        onClose={() => setToolsVisible(false)}
        showFontSize={false}
        showTafsir={false}
        showTranslation={false}
        showReciter={true}
        zoom={zoomTool}
      />
    </SafeAreaView>
  );
}

const NAV_SEGMENTS = [
  { key: 'surah', label: 'سورة' },
  { key: 'page', label: 'صفحة' },
  { key: 'juz', label: 'جزء' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navGlyph: {
    fontSize: 30,
    color: theme.colors.textPrimary,
    width: 44,
    textAlign: 'center',
    marginTop: -2,
  },
  toolButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolGlyph: {
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  body: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.chip,
  },
  pageButtonGlyph: {
    fontSize: 22,
    color: theme.colors.brownPrimary,
    lineHeight: 24,
  },
  pageButtonText: {
    ...textStyles.label,
    color: theme.colors.brownPrimary,
  },
  bottomActions: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  verseChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  verseChipText: {
    ...textStyles.caption,
    color: theme.colors.brownPrimary,
  },
  jumpButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.brownPrimary,
  },
  jumpButtonText: {
    ...textStyles.label,
    color: theme.colors.surfaceHighlight,
  },
  jumpHeader: {
    marginBottom: theme.spacing.md,
  },
  jumpList: {
    flexGrow: 0,
  },
  jumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  jumpOrnament: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  jumpOrnamentText: {
    fontFamily: theme.fontFamily.latinBold,
    fontSize: theme.fontSize.xs,
    color: theme.colors.brownPrimary,
    fontWeight: '700',
  },
  jumpRowTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
  },
  jumpRowMeta: {
    color: theme.colors.textMuted,
  },
  pageJumpArea: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  pageInput: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fontFamily.arabicUIMedium,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: theme.colors.brownPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...textStyles.label,
    color: theme.colors.surfaceHighlight,
  },
});