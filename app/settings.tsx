/**
 * Settings — theme, reading display, defaults for audio, tafsir & translation.
 */

import React from 'react';
import { View, Text, Pressable, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/providers';
import { getAudioPlayer } from '@/platform/audio';
import { getReciter } from '@/services/api/reciters';
import { TRANSLATION_EDITIONS } from '@/services/api/translations';
import type { QuranDisplaySettings, AppSettings } from '@/types';

const THEME_OPTIONS: { key: AppSettings['theme']; label: string }[] = [
  { key: 'light', label: 'فاتح' },
  { key: 'dark', label: 'داكن' },
  { key: 'system', label: 'نظام' },
];

const FONT_STEPS: { key: QuranDisplaySettings['fontSize']; label: string }[] = [
  { key: 'small', label: 'صغير' },
  { key: 'medium', label: 'وسط' },
  { key: 'large', label: 'كبير' },
  { key: 'xlarge', label: 'كبير جداً' },
];

const RATE_STEPS = [0.75, 1, 1.25, 1.5, 2];

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useAppTheme();
  const { quranDisplay, audio, theme: themeSetting } = settings;

  const setTheme = (t: AppSettings['theme']) => updateSettings({ theme: t });

  const setFontSize = (fontSize: QuranDisplaySettings['fontSize']) =>
    updateSettings({ quranDisplay: { ...quranDisplay, fontSize } });

  const setShowVerseNumbers = (showVerseNumbers: boolean) =>
    updateSettings({ quranDisplay: { ...quranDisplay, showVerseNumbers } });

  const setHighlight = (highlightActiveVerse: boolean) =>
    updateSettings({ quranDisplay: { ...quranDisplay, highlightActiveVerse } });

  const setPlaybackRate = (playbackRate: number) =>
    updateSettings({ audio: { ...audio, playbackRate } });

  const setBackgroundPlayback = (backgroundPlayback: boolean) => {
    updateSettings({ audio: { ...audio, backgroundPlayback } });
    getAudioPlayer().setBackgroundPlayback(backgroundPlayback);
  };

  const reciter = getReciter(audio.defaultReciterId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="الإعدادات"
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingGroup title="المظهر">
          <View style={styles.chipRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeSetting === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTheme(opt.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SettingGroup>

        <SettingGroup title="القراءة">
          <SettingLabel>حجم الخط</SettingLabel>
          <View style={styles.chipRow}>
            {FONT_STEPS.map((step) => {
              const active = quranDisplay.fontSize === step.key;
              return (
                <Pressable
                  key={step.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFontSize(step.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{step.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ToggleRow
            label="إظهار أرقام الآيات"
            value={quranDisplay.showVerseNumbers}
            onChange={setShowVerseNumbers}
          />
          <ToggleRow
            label="تظليل الآية الحالية"
            value={quranDisplay.highlightActiveVerse}
            onChange={setHighlight}
          />
        </SettingGroup>

        <SettingGroup title="التفسير والترجمة">
          <SettingRow
            label="التفسير"
            hint={quranDisplay.tafsirSource === 'ar.muyassar' ? 'التفسير الميسّر (مُضمَّن)' : quranDisplay.tafsirSource}
            onPress={() => router.push({ pathname: '/tafsir' })}
          />
          <SettingLabel>الترجمة (عبر الإنترنت)</SettingLabel>
          <View style={styles.chipRow}>
            {TRANSLATION_EDITIONS.slice(0, 5).map((edition) => {
              const active = quranDisplay.translationSource === edition.id;
              return (
                <Pressable
                  key={edition.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => updateSettings({ quranDisplay: { ...quranDisplay, translationSource: edition.id } })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {edition.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingGroup>

        <SettingGroup title="الصوت">
          <SettingRow
            label="القارئ الافتراضي"
            hint={reciter?.name ?? audio.defaultReciterId}
            onPress={() => router.push({ pathname: '/reciters' })}
          />
          <SettingLabel>سرعة الاستماع</SettingLabel>
          <View style={styles.chipRow}>
            {RATE_STEPS.map((rate) => {
              const active = audio.playbackRate === rate;
              return (
                <Pressable
                  key={rate}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setPlaybackRate(rate)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{rate}×</Text>
                </Pressable>
              );
            })}
          </View>
          <ToggleRow
            label="التشغيل في الخلفية (Android)"
            value={audio.backgroundPlayback}
            onChange={setBackgroundPlayback}
          />
        </SettingGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={[textStyles.h4, styles.groupTitle]}>{title}</Text>
      {children}
    </View>
  );
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  return <Text style={[textStyles.caption, styles.settingLabel]}>{children}</Text>;
}

function SettingRow({ label, hint, onPress }: { label: string; hint?: string; onPress?: () => void }) {
  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={[textStyles.body, styles.rowLabel]}>{label}</Text>
        {hint ? <Text style={[textStyles.caption, styles.rowHint]} numberOfLines={1}>{hint}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>‹</Text>
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={[textStyles.body, styles.rowLabel]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.disabled, true: theme.colors.brownPrimary }}
        thumbColor={theme.colors.surfaceHighlight}
      />
    </View>
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
  content: {
    paddingBottom: theme.spacing.xxxl,
  },
  group: {
    paddingHorizontal: theme.spacing.screenPadding,
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.card,
    marginHorizontal: theme.spacing.screenPadding,
    gap: theme.spacing.md,
  },
  groupTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  settingLabel: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.surfaceSecondary,
    minWidth: 48,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.brownPrimary,
  },
  chipText: {
    ...textStyles.label,
    color: theme.colors.textPrimary,
    maxWidth: 140,
  },
  chipTextActive: {
    color: theme.colors.surfaceHighlight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 44,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: theme.colors.textPrimary,
  },
  rowHint: {
    color: theme.colors.textMuted,
  },
  rowChevron: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.goldMuted,
  },
});