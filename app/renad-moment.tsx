/**
 * Renad Moment — a quiet, personal keepsake screen.
 *
 * The sky-blue accent (#6BA3D6) is reserved exclusively for this screen in the
 * whole app. Shows a verse of the day, a personal note, and a gentle visit
 * counter. The Renad script font is not bundled yet, so the name falls back
 * to the system Arabic font.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, textStyles } from '@/theme';
import { quranData, toArabicDigits } from '@/data/quran';
import { renadStorage } from '@/storage';

// A fixed verse used as the "moment" — 2:152 (Al-Baqarah): "فاذكروني أذكركم".
const MOMENT_SURAH = 2;
const MOMENT_VERSE = 152;

export default function RenadMomentScreen() {
  const [notes, setNotes] = useState(renadStorage.get().personalNotes);
  // Count the visit optimistically; persist it in the effect below (no setState
  // in the effect body, so React does not cascade renders).
  const [count, setCount] = useState(() => renadStorage.get().playCount + 1);

  useEffect(() => {
    const state = renadStorage.get();
    renadStorage.set({ ...state, lastVisitedAt: Date.now(), playCount: count });
  }, [count]);

  const verse = useMemo(() => quranData.getVerse(MOMENT_SURAH, MOMENT_VERSE), []);

  const saveNotes = (text: string) => {
    setNotes(text);
    renadStorage.updateNotes(text);
  };

  return (
    <LinearGradient colors={[theme.colors.renadBlueLight, theme.colors.renadBlue]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.sun}>
            <Text style={styles.sunGlyph}>✿</Text>
          </View>
          <Text style={[textStyles.h3, styles.title]}>لحظة رناد</Text>
          <Text style={styles.subtitle}>مكان هادئ لك</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>آية اللحظة</Text>
            <Text style={styles.cardVerse}>{verse?.text}</Text>
            <Text style={styles.cardRef}>
              سورة البقرة • آية {toArabicDigits(MOMENT_VERSE)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>ملاحظاتك</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={saveNotes}
              placeholder="اكتب شيئاً جميلاً هنا..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.visits}>
            <Text style={styles.visitsText}>
              زرت لحظتك {toArabicDigits(Math.max(count, 1))} مرة
            </Text>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                const state = renadStorage.get();
                renadStorage.set({ ...state, playCount: 0 });
                setCount(0);
              }}
            >
              <Text style={styles.resetText}>تصفير</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    gap: 4,
  },
  sun: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sunGlyph: {
    fontSize: 26,
    color: '#FFFFFF',
  },
  title: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fontFamily.arabicUI,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardLabel: {
    ...textStyles.label,
    color: theme.colors.textSecondary,
  },
  cardVerse: {
    fontFamily: theme.fontFamily.quran,
    fontSize: theme.fontSize.quranLarge,
    lineHeight: theme.fontSize.quranLarge * 2,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  cardRef: {
    ...textStyles.caption,
    color: theme.colors.goldMuted,
    textAlign: 'center',
  },
  notesInput: {
    minHeight: 110,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontFamily: theme.fontFamily.arabicUI,
    fontSize: theme.fontSize.base,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  visits: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visitsText: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: theme.fontFamily.arabicUI,
    fontSize: theme.fontSize.sm,
  },
  resetButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.chip,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  resetText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily.arabicUIMedium,
    fontSize: theme.fontSize.sm,
  },
});