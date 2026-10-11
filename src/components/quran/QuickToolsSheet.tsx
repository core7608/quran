/**
 * QuickToolsSheet — the "Quick Tools" bottom sheet.
 *
 * One reusable sheet used by Home, Reader and Mushaf screens with selectable
 * sections. Writes directly to persisted settings (via ThemeProvider) and the
 * player store, so changes apply app-wide instantly.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useAppTheme } from '@/providers';
import { usePlayer } from '@/store/player';
import { TRANSLATION_EDITIONS } from '@/services/api/translations';
import { getReciter } from '@/services/api/reciters';
import type { QuranDisplaySettings } from '@/types';

const FONT_STEPS: { key: QuranDisplaySettings['fontSize']; label: string }[] = [
  { key: 'small', label: 'صغير' },
  { key: 'medium', label: 'وسط' },
  { key: 'large', label: 'كبير' },
  { key: 'xlarge', label: 'كبير جداً' },
];

const RATE_STEPS = [0.75, 1, 1.25, 1.5, 2];

export interface QuickToolsZoom {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (value: number) => void;
}

interface QuickToolsSheetProps {
  visible: boolean;
  onClose: () => void;
  showFontSize?: boolean;
  showTafsir?: boolean;
  showTranslation?: boolean;
  showReciter?: boolean;
  showPlaybackRate?: boolean;
  zoom?: QuickToolsZoom | null;
}

export const QuickToolsSheet = ({
  visible,
  onClose,
  showFontSize = true,
  showTafsir = true,
  showTranslation = true,
  showReciter = true,
  showPlaybackRate = false,
  zoom = null,
}: QuickToolsSheetProps) => {
  const router = useRouter();
  const { settings, updateSettings } = useAppTheme();
  const { setRate } = usePlayer();

  const quranDisplay = settings.quranDisplay;
  const audio = settings.audio;

  const setFontSize = (fontSize: QuranDisplaySettings['fontSize']) => {
    updateSettings({ quranDisplay: { ...quranDisplay, fontSize } });
  };

  const setTafsirEnabled = (tafsirEnabled: boolean) => {
    updateSettings({ quranDisplay: { ...quranDisplay, tafsirEnabled } });
  };

  const setTranslationEnabled = (translationEnabled: boolean) => {
    updateSettings({ quranDisplay: { ...quranDisplay, translationEnabled } });
  };

  const setPlaybackRate = (playbackRate: number) => {
    updateSettings({ audio: { ...audio, playbackRate } });
    void setRate(playbackRate);
  };

  const reciter = getReciter(audio?.defaultReciterId);
  const translationName =
    TRANSLATION_EDITIONS.find((e) => e.id === quranDisplay.translationSource)?.name ??
    quranDisplay.translationSource;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="الأدوات السريعة">
      {/* Zoom (Mushaf only) */}
      {zoom && (
        <View style={styles.group}>
          <Text style={[textStyles.label, styles.groupTitle]}>{zoom.label}</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, zoom.value <= zoom.min && styles.chipDisabled]}
              onPress={() => zoom.onChange(Math.max(zoom.min, +(zoom.value - zoom.step).toFixed(2)))}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>تقليل</Text>
            </Pressable>
            <Text style={styles.valueBetween}>{zoom.value.toFixed(2)}×</Text>
            <Pressable
              style={[styles.chip, zoom.value >= zoom.max && styles.chipDisabled]}
              onPress={() => zoom.onChange(Math.min(zoom.max, +(zoom.value + zoom.step).toFixed(2)))}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>تكبير</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Font size */}
      {showFontSize && (
        <View style={styles.group}>
          <Text style={[textStyles.label, styles.groupTitle]}>حجم الخط</Text>
          <View style={styles.chipRow}>
            {FONT_STEPS.map((step) => {
              const active = quranDisplay.fontSize === step.key;
              return (
                <Pressable
                  key={step.key}
                  onPress={() => setFontSize(step.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{step.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Tafsir */}
      {showTafsir && (
        <View style={styles.group}>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[textStyles.body, styles.rowTitle]}>التفسير</Text>
              <Text style={[textStyles.caption, styles.rowHint]} numberOfLines={1}>
                {quranDisplay.tafsirSource === 'ar.muyassar'
                  ? 'التفسير الميسّر (مُضمَّن — يعمل بدون إنترنت)'
                  : quranDisplay.tafsirSource}
              </Text>
            </View>
            <Switch
              value={quranDisplay.tafsirEnabled}
              onValueChange={setTafsirEnabled}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.brownPrimary }}
              thumbColor={theme.colors.surfaceHighlight}
            />
          </View>
        </View>
      )}

      {/* Translation */}
      {showTranslation && (
        <View style={styles.group}>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[textStyles.body, styles.rowTitle]}>الترجمة</Text>
              <Text style={[textStyles.caption, styles.rowHint]} numberOfLines={1}>
                {translationName} (عبر الإنترنت)
              </Text>
            </View>
            <Switch
              value={quranDisplay.translationEnabled}
              onValueChange={setTranslationEnabled}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.brownPrimary }}
              thumbColor={theme.colors.surfaceHighlight}
            />
          </View>
        </View>
      )}

      {/* Reciter */}
      {showReciter && (
        <View style={styles.group}>
          <Pressable
            style={styles.rowBetween}
            onPress={() => {
              onClose();
              router.push({ pathname: '/reciters' });
            }}
            accessibilityRole="button"
          >
            <View style={styles.rowText}>
              <Text style={[textStyles.body, styles.rowTitle]}>القارئ</Text>
              <Text style={[textStyles.caption, styles.rowHint]} numberOfLines={1}>
                {reciter?.name ?? audio?.defaultReciterId ?? '—'}
              </Text>
            </View>
            <Text style={[textStyles.label, styles.rowChevron]}>‹</Text>
          </Pressable>
        </View>
      )}

      {/* Playback rate */}
      {showPlaybackRate && (
        <View style={styles.group}>
          <Text style={[textStyles.label, styles.groupTitle]}>سرعة الاستماع</Text>
          <View style={styles.chipRow}>
            {RATE_STEPS.map((rate) => {
              const active = audio.playbackRate === rate;
              return (
                <Pressable
                  key={rate}
                  onPress={() => setPlaybackRate(rate)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{rate}×</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: theme.spacing.lg,
  },
  groupTitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
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
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    ...textStyles.label,
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: theme.colors.surfaceHighlight,
  },
  valueBetween: {
    ...textStyles.label,
    color: theme.colors.goldMuted,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 48,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
  },
  rowHint: {
    color: theme.colors.textMuted,
  },
  rowChevron: {
    color: theme.colors.goldMuted,
    fontSize: theme.fontSize.xl,
  },
});