/**
 * NoteEditor — bottom sheet for writing / editing a single Tadabbur note.
 *
 * The parent is expected to give this component a `key` that changes whenever
 * the target verse (or open state) changes, so its internal text/tag state
 * re-initialises without any setState-in-effect.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { theme, textStyles } from '@/theme';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { notesStorage } from '@/storage';
import { toArabicDigits } from '@/data/quran';
import type { TadabburNote } from '@/types';

export interface NoteEditorProps {
  visible: boolean;
  onClose: () => void;
  surah: number;
  verse: number;
  verseText?: string;
  existing?: TadabburNote | null;
  tafsir?: { text: string; source: string } | null;
  onSaved?: (note: TadabburNote) => void;
}

function makeId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function NoteEditor({
  visible,
  onClose,
  surah,
  verse,
  verseText,
  existing = null,
  tafsir = null,
  onSaved,
}: NoteEditorProps) {
  const [text, setText] = useState(existing?.text ?? '');
  const [tagsInput, setTagsInput] = useState((existing?.tags ?? []).join('، '));

  const isEditing = Boolean(existing);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const tags = tagsInput
      .split(/[،,]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const now = Date.now();
    const note: TadabburNote = {
      id: existing?.id ?? makeId(),
      surah,
      verse,
      text: trimmed,
      tags,
      tafsirText: currentTafsirText(existing, tafsir),
      tafsirSource: tafsir?.source ?? existing?.tafsirSource,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    notesStorage.upsert(note);
    onSaved?.(note);
    onClose();
  };

  const remove = () => {
    if (existing) {
      notesStorage.remove(existing.id);
      onSaved?.({ ...existing, text: '' });
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'تحرير الخاطرة' : 'خاطرة جديدة'}
      height={0.8}
    >
      <View style={styles.refRow}>
        <Text style={[textStyles.caption, styles.refText]}>
          سورة رقم {toArabicDigits(surah)} — الآية {toArabicDigits(verse)}
        </Text>
      </View>

      {verseText ? (
        <Text style={[styles.verseText]} numberOfLines={4}>
          {verseText}
        </Text>
      ) : null}

      <Text style={[textStyles.caption, styles.fieldLabel]}>خاطرتك / الفائدة</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={setText}
        placeholder="اكتب تدبّرك أو الفائدة التي استوقفتك…"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
      />

      <Text style={[textStyles.caption, styles.fieldLabel]}>وسوم (افصل بينها بفاصلة)</Text>
      <TextInput
        style={styles.input}
        value={tagsInput}
        onChangeText={setTagsInput}
        placeholder="مثال: صبر، رحمة، تدبر"
        placeholderTextColor={theme.colors.textMuted}
      />

      {tafsir?.text && !isEditing ? (
        <Text style={[textStyles.caption, styles.tafsirNote]} numberOfLines={2}>
          سيُحفظ مع الخاطرة التفسير المفتوح ({tafsir.source}).
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button onPress={save} disabled={!text.trim()} fullWidth>
          حفظ
        </Button>
        {isEditing ? (
          <Pressable style={styles.deleteLink} onPress={remove}>
            <Text style={[textStyles.caption, styles.deleteText]}>حذف الخاطرة</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function currentTafsirText(
  existing: TadabburNote | null,
  tafsir: { text: string; source: string } | null
): string | undefined {
  if (existing?.tafsirText) return existing.tafsirText;
  return tafsir?.text || undefined;
}

const styles = StyleSheet.create({
  refRow: { marginBottom: theme.spacing.sm },
  refText: { color: theme.colors.goldMuted },
  verseText: {
    fontFamily: theme.fontFamily.quran,
    fontSize: theme.fontSize.lg,
    lineHeight: 36,
    color: theme.colors.textPrimary,
    textAlign: 'right',
    marginBottom: theme.spacing.md,
  },
  fieldLabel: { color: theme.colors.textMuted, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  multiline: { minHeight: 132, lineHeight: 26 },
  tafsirNote: { color: theme.colors.textMuted, marginTop: theme.spacing.md },
  actions: { marginTop: theme.spacing.lg, gap: theme.spacing.md },
  deleteLink: { alignItems: 'center' },
  deleteText: { color: theme.colors.error },
});
