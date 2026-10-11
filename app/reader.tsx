/**
 * Reader Screen — verse-by-verse surah reading.
 *
 * Opened with `surah`, optional `verse` (scroll target) and `mode` params.
 * Features: per-verse recitation via the player store (AlQuran Cloud CDN,
 * 22 reciters), bundled Muyassar tafsir (offline) or an online edition,
 * on-demand translation, and a bottom mini-player.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { BottomSheet } from '@/components/common/BottomSheet';
import { QuickToolsSheet } from '@/components/quran/QuickToolsSheet';
import { NoteEditor } from '@/components/quran/NoteEditor';
import { VerseText } from '@/components/quran/VerseText';
import { quranData, toArabicDigits } from '@/data/quran';
import { getMuyassarStore } from '@/data/tafsir/muyassar';
import { tafsirApi } from '@/services/api/tafsir';
import { translationsApi } from '@/services/api/translations';
import { getReciter, buildVerseTrack } from '@/services/api/reciters';
import { usePlayer } from '@/store/player';
import { useAppTheme } from '@/providers';
import { quranStorage, notesStorage } from '@/storage';
import type { Verse } from '@/types';

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; verse?: string; mode?: string }>();
  const { settings } = useAppTheme();
  const quranDisplay = settings.quranDisplay;

  const surahNumber = useMemo(() => {
    const n = Number(params.surah);
    return Number.isInteger(n) && n >= 1 && n <= 114 ? n : 1;
  }, [params.surah]);

  const initialVerse = useMemo(() => {
    const v = Number(params.verse);
    return Number.isInteger(v) && v >= 1 ? v : 1;
  }, [params.verse]);

  const surahMeta = useMemo(() => quranData.getSurah(surahNumber), [surahNumber]);
  const verses = useMemo(() => quranData.getSurahVerses(surahNumber), [surahNumber]);

  const [selectedVerse, setSelectedVerse] = useState(initialVerse);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [jumpVisible, setJumpVisible] = useState(false);
  const [noteTarget, setNoteTarget] = useState<Verse | null>(null);

  // Keys of verses that carry a note / bookmark, so the reader can mark them.
  const [noteKeys, setNoteKeys] = useState<Set<string>>(
    () => new Set(notesStorage.getAll().map((n) => `${n.surah}:${n.verse}`))
  );
  const [bookmarkKeys, setBookmarkKeys] = useState<Set<string>>(
    () => new Set(quranStorage.getBookmarks().map((b) => `${b.surah}:${b.verse}`))
  );

  const refreshMarks = useCallback(() => {
    setNoteKeys(new Set(notesStorage.getAll().map((n) => `${n.surah}:${n.verse}`)));
    setBookmarkKeys(new Set(quranStorage.getBookmarks().map((b) => `${b.surah}:${b.verse}`)));
  }, []);

  const toggleBookmark = useCallback(
    (verse: Verse) => {
      quranStorage.toggleBookmark({
        id: `bm_${verse.surah}_${verse.verse}`,
        surah: verse.surah,
        verse: verse.verse,
        createdAt: Date.now(),
      });
      refreshMarks();
    },
    [refreshMarks]
  );

  // Tafsir (bundled Muyassar or online)
  const [bundledTafsir, setBundledTafsir] = useState<Map<number, string>>(new Map());
  const [onlineTafsir, setOnlineTafsir] = useState<Record<number, string>>({});

  // Translation (online)
  const [translations, setTranslations] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!quranDisplay.tafsirEnabled) return;

    if (quranDisplay.tafsirSource === 'ar.muyassar') {
      let mounted = true;
      getMuyassarStore().then((store) => {
        if (mounted) setBundledTafsir(store.getSurahTafsir(surahNumber));
      });
      return () => {
        mounted = false;
      };
    }
  }, [quranDisplay.tafsirEnabled, quranDisplay.tafsirSource, surahNumber]);

  useEffect(() => {
    if (!quranDisplay.translationEnabled) return;
    let mounted = true;
    translationsApi.getSurahTranslation(surahNumber, quranDisplay.translationSource).then((res) => {
      if (mounted) {
        setTranslations(res.data ? new Map(res.data.map((e) => [e.verse, e.text])) : new Map());
      }
    });
    return () => {
      mounted = false;
    };
  }, [quranDisplay.translationEnabled, quranDisplay.translationSource, surahNumber]);

  const loadOnlineTafsir = useCallback(
    (verseNumber: number) => {
      if (!quranDisplay.tafsirEnabled || quranDisplay.tafsirSource === 'ar.muyassar') return;
      if (onlineTafsir[verseNumber] !== undefined) return;
      void tafsirApi.getVerseTafsir(`${surahNumber}:${verseNumber}`, quranDisplay.tafsirSource).then((res) => {
        if (res.data) {
          setOnlineTafsir((prev) => ({ ...prev, [verseNumber]: res.data!.text }));
        }
      });
    },
    [quranDisplay.tafsirEnabled, quranDisplay.tafsirSource, onlineTafsir, surahNumber]
  );

  // Record progress whenever the user engages with a verse.
  const recordProgress = useCallback(
    (verse: Verse) => {
      quranStorage.addProgress({
        surah: verse.surah,
        verse: verse.verse,
        page: verse.page,
        lastReadAt: Date.now(),
      });
      quranStorage.setLastRead({
        surah: verse.surah,
        verse: verse.verse,
        page: verse.page,
        lastReadAt: Date.now(),
      });
    },
    []
  );

  const selectVerse = useCallback(
    (verse: Verse) => {
      setSelectedVerse(verse.verse);
      recordProgress(verse);
      loadOnlineTafsir(verse.verse);
    },
    [recordProgress, loadOnlineTafsir]
  );

  // --- Audio ---
  const player = usePlayer();

  const buildTrack = useCallback(
    (verse: Verse) => {
      const reciter = getReciter(settings.audio.defaultReciterId) ?? getReciter('ar.alafasy')!;
      return buildVerseTrack(reciter.id, verse.surah, verse.verse, verse.globalNumber);
    },
    [settings.audio.defaultReciterId]
  );

  const playVerse = useCallback(
    async (verse: Verse) => {
      const reciter = getReciter(settings.audio.defaultReciterId) ?? getReciter('ar.alafasy')!;
      const track = buildTrack(verse);
      // Queue full-surah tracks for `ayah` reciters (continuous recitation);
      // `surah` reciters expose one file per surah, so play it standalone.
      const queue =
        reciter.mode === 'surah'
          ? [track]
          : verses.map((v) => buildVerseTrack(reciter.id, v.surah, v.verse, v.globalNumber));

      await player.playTrack(track, queue, {
        title: `سورة ${surahMeta?.nameArabic ?? surahNumber}`,
        artist: reciter.name,
      });
      recordProgress(verse);
    },
    [settings.audio.defaultReciterId, buildTrack, verses, player, surahMeta, surahNumber, recordProgress]
  );

  const togglePlayVerse = useCallback(
    async (verse: Verse) => {
      const track = buildTrack(verse);
      if (player.currentTrack?.url === track.url) {
        await player.togglePlay();
      } else {
        await playVerse(verse);
      }
    },
    [buildTrack, playVerse, player]
  );

  // --- Scroll to target verse on mount ---
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<number, number>>({});
  const onVerseLayout = useCallback((verseNumber: number, y: number) => {
    offsets.current[verseNumber] = y;
  }, []);

  useEffect(() => {
    const target = verses.find((v) => v.verse === initialVerse) ? initialVerse : 1;
    // Wait a tick for layout to settle.
    const t = setTimeout(() => {
      const y = offsets.current[target];
      if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: false });
    }, 120);
    return () => clearTimeout(t);
  }, [initialVerse, verses]);

  const openSurah = (number: number) => {
    router.push({ pathname: '/reader', params: { surah: String(number), mode: 'surah' } });
  };

  const currentTrack = player.currentTrack;

  function tafsirContextFor(verse: Verse): { text: string; source: string } | null {
    if (!quranDisplay.tafsirEnabled) return null;
    const text =
      quranDisplay.tafsirSource === 'ar.muyassar'
        ? bundledTafsir.get(verse.verse)
        : onlineTafsir[verse.verse];
    return text ? { text, source: quranDisplay.tafsirSource } : null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={surahMeta?.nameArabic ?? `سورة ${toArabicDigits(surahNumber)}`}
        subtitle={`${surahMeta?.nameTransliterated ?? ''} • ${toArabicDigits(surahMeta?.verseCount ?? verses.length)} آية`}
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      >
        <Pressable style={styles.toolButton} onPress={() => setToolsVisible(true)} accessibilityLabel="الأدوات السريعة">
          <Text style={styles.toolGlyph}>☰</Text>
        </Pressable>
      </AppHeader>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {verses.map((verse) => {
          const isCurrent =
            currentTrack?.surah === surahNumber && currentTrack.verseStart === verse.verse;
          const tafsirText =
            quranDisplay.tafsirSource === 'ar.muyassar'
              ? bundledTafsir.get(verse.verse)
              : onlineTafsir[verse.verse];
          const markKey = `${verse.surah}:${verse.verse}`;
          const hasNote = noteKeys.has(markKey);
          const hasBookmark = bookmarkKeys.has(markKey);

          return (
            <View
              key={verse.verse}
              onLayout={(e: LayoutChangeEvent) => onVerseLayout(verse.verse, e.nativeEvent.layout.y)}
            >
              <View style={styles.verseRow}>
                <View style={styles.verseMain}>
                  <VerseText
                    verse={verse}
                    settings={quranDisplay}
                    translation={translations.get(verse.verse)}
                    tafsir={tafsirText}
                    isSelected={selectedVerse === verse.verse}
                    onPress={() => selectVerse(verse)}
                    showToolbar
                    toolbarActions={
                      <>
                        <Pressable
                          style={styles.verseAction}
                          onPress={() => toggleBookmark(verse)}
                          accessibilityRole="button"
                          accessibilityLabel="إشارة مرجعية"
                        >
                          <Text style={[styles.verseActionGlyph, hasBookmark && styles.verseActionActive]}>
                            {hasBookmark ? '★' : '☆'}
                          </Text>
                          <Text style={[styles.verseActionLabel, hasBookmark && styles.verseActionActive]}>
                            إشارة
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.verseAction}
                          onPress={() => setNoteTarget(verse)}
                          accessibilityRole="button"
                          accessibilityLabel="تدوين خاطرة"
                        >
                          <Text style={[styles.verseActionGlyph, hasNote && styles.verseActionActive]}>✎</Text>
                          <Text style={[styles.verseActionLabel, hasNote && styles.verseActionActive]}>
                            خاطرة
                          </Text>
                        </Pressable>
                      </>
                    }
                  />
                </View>
                <Pressable
                  style={[
                    styles.playButton,
                    isCurrent && styles.playButtonActive,
                  ]}
                  onPress={() => togglePlayVerse(verse)}
                  accessibilityRole="button"
                  accessibilityLabel={`تشغيل الآية ${verse.verse}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.playGlyph, isCurrent && styles.playGlyphActive]}>
                    {isCurrent && player.isPlaying ? '⏸' : '▶'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Mini player */}
      {currentTrack && (
        <MiniPlayer
          reciterName={(getReciter(currentTrack.reciterId)?.name ?? currentTrack.reciterId).split(' ')[0]}
        />
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomButton} onPress={() => setJumpVisible(true)} accessibilityRole="button">
          <Text style={styles.bottomButtonText}>قائمة السور</Text>
        </Pressable>
        <Text style={[textStyles.caption, styles.bottomHint]}>
          آية {toArabicDigits(selectedVerse)} من {toArabicDigits(verses.length)}
        </Text>
        <Pressable style={styles.bottomButton} onPress={() => setToolsVisible(true)} accessibilityRole="button">
          <Text style={styles.bottomButtonText}>الأدوات</Text>
        </Pressable>
      </View>

      {/* Surah jump sheet */}
      <BottomSheet visible={jumpVisible} onClose={() => setJumpVisible(false)} title="انتقل إلى سورة" height={0.7}>
        <FlatList
          data={quranData.getAllSurahs()}
          keyExtractor={(item) => String(item.number)}
          initialNumToRender={14}
          renderItem={({ item }) => (
            <Pressable
              style={styles.jumpRow}
              onPress={() => {
                setJumpVisible(false);
                openSurah(item.number);
              }}
            >
              <View style={styles.jumpOrnament}>
                <Text style={styles.jumpOrnamentText}>{toArabicDigits(item.number)}</Text>
              </View>
              <Text style={[textStyles.body, styles.jumpRowTitle]}>{item.nameArabic}</Text>
              <Text style={[textStyles.caption, styles.jumpRowMeta]}>{item.nameTransliterated}</Text>
            </Pressable>
          )}
        />
      </BottomSheet>

      {/* Quick tools */}
      <QuickToolsSheet
        visible={toolsVisible}
        onClose={() => setToolsVisible(false)}
        showFontSize
        showTafsir
        showTranslation
        showReciter
        showPlaybackRate
      />

      {/* Tadabbur note editor */}
      {noteTarget ? (
        <NoteEditor
          key={`${noteTarget.surah}:${noteTarget.verse}`}
          visible={Boolean(noteTarget)}
          onClose={() => setNoteTarget(null)}
          surah={noteTarget.surah}
          verse={noteTarget.verse}
          verseText={noteTarget.text}
          existing={notesStorage.getForVerse(noteTarget.surah, noteTarget.verse)[0] ?? null}
          tafsir={tafsirContextFor(noteTarget)}
          onSaved={refreshMarks}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ============================================
// Mini player
// ============================================

function MiniPlayer({ reciterName }: { reciterName: string }) {
  const { isPlaying, position, duration, isBuffering, togglePlay, next, previous, currentTrack } = usePlayer();
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={styles.player}>
      <View style={styles.playerTrack}>
        <View style={[styles.playerFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.playerRow}>
        <Pressable style={styles.playerControl} onPress={() => previous()} accessibilityRole="button" accessibilityLabel="الآية السابقة">
          <Text style={styles.playerControlGlyph}>⏮</Text>
        </Pressable>
        <Pressable style={[styles.playerControl, styles.playerControlMain]} onPress={() => togglePlay()} accessibilityRole="button" accessibilityLabel="تشغيل/إيقاف">
          <Text style={styles.playerControlGlyphMain}>{isBuffering ? '⏳' : isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>
        <Pressable style={styles.playerControl} onPress={() => next()} accessibilityRole="button" accessibilityLabel="الآية التالية">
          <Text style={styles.playerControlGlyph}>⏭</Text>
        </Pressable>
      </View>
      <Text style={[textStyles.caption, styles.playerLabel]} numberOfLines={1}>
        {reciterName}
        {currentTrack?.verseStart ? ` • الآية ${toArabicDigits(currentTrack.verseStart)}` : ''}
      </Text>
    </View>
  );
}

// ============================================
// Styles
// ============================================

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
  content: {
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xs,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verseMain: {
    flex: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginRight: theme.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  playButtonActive: {
    backgroundColor: theme.colors.brownPrimary,
  },
  playGlyph: {
    fontSize: 15,
    color: theme.colors.brownPrimary,
  },
  playGlyphActive: {
    color: theme.colors.surfaceHighlight,
  },
  verseAction: {
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
  },
  verseActionGlyph: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  verseActionActive: {
    color: theme.colors.goldMuted,
  },
  verseActionLabel: {
    ...textStyles.caption,
    color: theme.colors.textMuted,
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
  },
  bottomButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  bottomButtonText: {
    ...textStyles.label,
    color: theme.colors.brownPrimary,
  },
  bottomHint: {
    color: theme.colors.textMuted,
  },
  player: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.sm,
  },
  playerTrack: {
    height: 3,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  playerFill: {
    height: '100%',
    backgroundColor: theme.colors.goldMuted,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  playerControl: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerControlMain: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.brownPrimary,
  },
  playerControlGlyph: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  playerControlGlyphMain: {
    fontSize: 20,
    color: theme.colors.surfaceHighlight,
  },
  playerLabel: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    paddingBottom: theme.spacing.sm,
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
});