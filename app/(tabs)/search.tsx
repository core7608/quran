/**
 * Search Screen — fully offline.
 *
 * Scans the bundled Uthmani text (and optionally the bundled Muyassar tafsir)
 * using the normalised search index. No network used.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { quranData, toArabicDigits, normalizeArabic } from '@/data/quran';
import { getMuyassarStore } from '@/data/tafsir/muyassar';
import type { SearchResult } from '@/types';

type Scope = 'quran' | 'tafsir';

interface TafsirHit {
  surah: number;
  verse: number;
  text: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('quran');
  const [tafsirHits, setTafsirHits] = useState<TafsirHit[]>([]);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced execution. Results are derived at render; only the async work
  // sets state (inside the timer/promise callbacks, not the effect body).
  useEffect(() => {
    if (scope !== 'tafsir' || !query.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTafsirLoading(true);
      getMuyassarStore()
        .then((store) => {
          const q = normalizeArabic(query.trim());
          if (!q) return [];
          return store.search(q);
        })
        .then((hits) => setTafsirHits(hits))
        .catch(() => setTafsirHits([]))
        .finally(() => setTafsirLoading(false));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, scope]);

  const surahMatches = useMemo(() => quranData.searchSurahs(query), [query]);
  const verseResults = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    return quranData.search(query, 80);
  }, [query]);

  const results = scope === 'quran' ? verseResults : query.trim() ? tafsirHits : [];
  const loading = scope === 'tafsir' && tafsirLoading;

  const openResult = (surah: number, verse: number) => {
    router.push({ pathname: '/reader', params: { surah: String(surah), verse: String(verse), mode: 'surah' } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="البحث" />

      <View style={styles.searchArea}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث في القرآن الكريم..."
            placeholderTextColor={theme.colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable style={styles.clearButton} onPress={() => setQuery('')} accessibilityLabel="مسح">
              <Text style={styles.clearGlyph}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.scopeRow}>
          <ScopeChip label="نص القرآن" active={scope === 'quran'} onPress={() => setScope('quran')} />
          <ScopeChip label="التفسير الميسّر" active={scope === 'tafsir'} onPress={() => setScope('tafsir')} />
        </View>
      </View>

      {!query.trim() ? (
        <View style={styles.empty}>
          <Text style={[textStyles.body, styles.emptyText]}>
            اكتب كلمة للبحث في الآيات — يعمل بدون إنترنت.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.colors.brownPrimary} size="small" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.surah}-${item.verse}-${index}`}
          ListHeaderComponent={
            <View>
              {scope === 'quran' && surahMatches.length > 0 && (
                <View style={styles.group}>
                  <Text style={[textStyles.h4, styles.groupTitle]}>سور مطابقة</Text>
                  <View style={styles.surahChipRow}>
                    {surahMatches.map((s) => (
                      <Pressable
                        key={s.number}
                        style={styles.surahChip}
                        onPress={() => openResult(s.number, 1)}
                      >
                        <Text style={styles.surahChipText}>{s.nameArabic}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <Text style={[textStyles.h4, styles.groupTitle]}>
                {scope === 'quran' ? `نتائج في الآيات (${toArabicDigits(results.length)})` : `نتائج في التفسير (${toArabicDigits(results.length)})`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[textStyles.body, styles.emptyText]}>لا توجد نتائج</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const surah = quranData.getSurah(item.surah);
            return (
              <Pressable style={styles.resultRow} onPress={() => openResult(item.surah, item.verse)}>
                <Text style={styles.resultSurah}>
                  {surah?.nameArabic ?? ''} • آية {toArabicDigits(item.verse)}
                </Text>
                <Text style={styles.resultText} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ScopeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={onPress}>
      <Text style={[textStyles.label, active ? styles.scopeChipTextActive : styles.scopeChipText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchArea: {
    paddingHorizontal: theme.spacing.screenPadding,
    gap: theme.spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.arabicUI,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.md,
    textAlign: 'right',
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  clearGlyph: {
    fontSize: 22,
    color: theme.colors.textMuted,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  scopeChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  scopeChipActive: {
    backgroundColor: theme.colors.brownPrimary,
  },
  scopeChipText: {
    color: theme.colors.textPrimary,
  },
  scopeChipTextActive: {
    color: theme.colors.surfaceHighlight,
  },
  group: {
    marginBottom: theme.spacing.lg,
  },
  groupTitle: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  surahChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  surahChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  surahChipText: {
    ...textStyles.bodySmall,
    color: theme.colors.brownPrimary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  resultRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.xs,
  },
  resultSurah: {
    ...textStyles.caption,
    color: theme.colors.goldMuted,
    textAlign: 'right',
  },
  resultText: {
    ...textStyles.body,
    color: theme.colors.textPrimary,
    textAlign: 'right',
    lineHeight: theme.lineHeight.relaxed,
  },
  empty: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});