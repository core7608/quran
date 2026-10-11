/**
 * Tadabbur Notebook (دفتر التدبر) — the user's private reflections.
 *
 * Notes are created from the Reader (per verse) and managed here: search,
 * filter by tag, open the verse, edit or delete. Everything is stored locally.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { NoteEditor } from '@/components/quran/NoteEditor';
import { quranData, toArabicDigits, normalizeArabic } from '@/data/quran';
import { notesStorage } from '@/storage';
import type { TadabburNote } from '@/types';

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<TadabburNote[]>(() => notesStorage.getAll());
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<TadabburNote | null>(null);

  const refresh = useCallback(() => setNotes(notesStorage.getAll()), []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return [...tags].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [notes]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(query.trim());
    return notes.filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false;
      if (!q) return true;
      const haystack = normalizeArabic(`${n.text} ${n.tags.join(' ')}`);
      return haystack.includes(q);
    });
  }, [notes, query, activeTag]);

  const openVerse = useCallback(
    (note: TadabburNote) => {
      router.push({
        pathname: '/reader',
        params: { surah: String(note.surah), verse: String(note.verse), mode: 'surah' },
      });
    },
    [router]
  );

  const confirmDelete = useCallback(
    (note: TadabburNote) => {
      Alert.alert('حذف الخاطرة؟', 'لا يمكن التراجع عن هذا الإجراء.', [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            notesStorage.remove(note.id);
            refresh();
          },
        },
      ]);
    },
    [refresh]
  );

  const total = notes.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="دفتر التدبر"
        subtitle={total ? `${toArabicDigits(total)} خاطرة` : 'ملاحظاتك الخاصة'}
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في خواطرك ووسومك…"
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
        />
      </View>

      {allTags.length > 0 && (
        <FlatList
          horizontal
          data={allTags}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
          style={styles.tagList}
          ListHeaderComponent={
            activeTag ? (
              <Pressable style={styles.tagChip} onPress={() => setActiveTag(null)}>
                <Text style={styles.tagChipText}>الكل ×</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const active = activeTag === item;
            return (
              <Pressable
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => setActiveTag(active ? null : item)}
              >
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{item}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>✦</Text>
            <Text style={[textStyles.body, styles.emptyTitle]}>
              {total ? 'لا نتائج مطابقة' : 'لم تُدوّن خواطرك بعد'}
            </Text>
            <Text style={[textStyles.caption, styles.emptyHint]}>
              افتح أي آية في القارئ واضغط ✎ لتدوين تدبّرك.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const verse = quranData.getVerse(item.surah, item.verse);
          const surah = quranData.getSurah(item.surah);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[textStyles.label, styles.ref]}>
                  {surah?.nameArabic ?? ''} · آية {toArabicDigits(item.verse)}
                </Text>
                <Text style={[textStyles.caption, styles.date]}>
                  {format(item.updatedAt, 'd/M/yyyy')}
                </Text>
              </View>

              {verse ? (
                <Text style={styles.verseText} numberOfLines={2}>
                  {verse.text}
                </Text>
              ) : null}

              <Text style={[textStyles.body, styles.noteText]}>{item.text}</Text>

              {item.tags.length > 0 && (
                <View style={styles.cardTags}>
                  {item.tags.map((tag) => (
                    <Text key={tag} style={styles.cardTag}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.cardActions}>
                <Pressable style={styles.action} onPress={() => openVerse(item)}>
                  <Text style={styles.actionText}>فتح الآية</Text>
                </Pressable>
                <Pressable style={styles.action} onPress={() => setEditing(item)}>
                  <Text style={styles.actionText}>تحرير</Text>
                </Pressable>
                <Pressable style={styles.action} onPress={() => confirmDelete(item)}>
                  <Text style={[styles.actionText, styles.actionDanger]}>حذف</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {editing ? (
        <NoteEditor
          key={editing.id}
          visible={Boolean(editing)}
          onClose={() => setEditing(null)}
          surah={editing.surah}
          verse={editing.verse}
          verseText={quranData.getVerse(editing.surah, editing.verse)?.text}
          existing={editing}
          onSaved={refresh}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  navGlyph: { fontSize: 24, color: theme.colors.textPrimary, width: 44, textAlign: 'center' },
  searchWrap: { paddingHorizontal: theme.spacing.screenPadding, paddingBottom: theme.spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    textAlign: 'right',
  },
  tagList: { flexGrow: 0, maxHeight: 48 },
  tagRow: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screenPadding,
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  tagChipActive: { backgroundColor: theme.colors.brownPrimary },
  tagChipText: { ...textStyles.label, color: theme.colors.textSecondary },
  tagChipTextActive: { color: theme.colors.surfaceHighlight },
  listContent: {
    padding: theme.spacing.screenPadding,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ref: { color: theme.colors.brownPrimary },
  date: { color: theme.colors.textMuted },
  verseText: {
    fontFamily: theme.fontFamily.quran,
    fontSize: theme.fontSize.lg,
    lineHeight: 34,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  noteText: { color: theme.colors.textPrimary, lineHeight: 26 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  cardTag: { ...textStyles.caption, color: theme.colors.goldMuted },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.sm,
  },
  action: { paddingVertical: 2 },
  actionText: { ...textStyles.label, color: theme.colors.brownPrimary },
  actionDanger: { color: theme.colors.error },
  empty: { alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.huge },
  emptyGlyph: { fontSize: 34, color: theme.colors.goldMuted },
  emptyTitle: { color: theme.colors.textPrimary },
  emptyHint: { color: theme.colors.textMuted, textAlign: 'center' },
});
