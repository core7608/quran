/**
 * Khatmah Screen — smart reading plan (رحلة ختمة ذكية).
 *
 * The user picks a target (30 / 60 / 90 days, or a custom number). The daily
 * wird is derived automatically from the remaining pages, so a missed day is
 * redistributed instead of piling up. Progress is shown plainly — no pressure,
 * no competition.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/common/Button';
import { quranData, toArabicDigits } from '@/data/quran';
import {
  KHATMAH_DURATIONS,
  KHATMAH_TOTAL_PAGES,
  computeProgress,
  createPlan,
  markPageRead,
  nextUnreadPages,
  projectedFinish,
} from '@/data/khatmah';
import { khatmahStorage, quranStorage } from '@/storage';
import type { KhatmahPlan } from '@/types';

export default function KhatmahScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<KhatmahPlan | null>(() => khatmahStorage.getPlan());
  const [customDays, setCustomDays] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const persist = useCallback((next: KhatmahPlan | null) => {
    khatmahStorage.setPlan(next);
    setPlan(next);
  }, []);

  const startPlan = useCallback(
    (days: number) => {
      const safeDays = Math.max(1, Math.min(Math.round(days), KHATMAH_TOTAL_PAGES));
      const lastRead = quranStorage.getLastRead();
      persist(createPlan(safeDays, Date.now(), lastRead?.page ?? 1));
    },
    [persist]
  );

  const resetPlan = useCallback(() => {
    Alert.alert('إعادة تعيين الختمة؟', 'سيتم حذف تقدّم الختمة الحالية. لن تُحذف بقية بياناتك.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إعادة تعيين', style: 'destructive', onPress: () => persist(null) },
    ]);
  }, [persist]);

  const progress = useMemo(() => computeProgress(plan), [plan]);

  const todaysPages = useMemo(() => {
    if (!plan) return [];
    const count = Math.max(progress.pagesPerDay, 1);
    const unread = nextUnreadPages(plan, count);
    // If the plan is essentially done, fall back to the last page.
    return unread.length ? unread : [plan.lastPage];
  }, [plan, progress.pagesPerDay]);

  const completedSet = useMemo(() => new Set(plan?.completedPages ?? []), [plan]);

  const togglePage = useCallback(
    (page: number) => {
      if (!plan) return;
      if (completedSet.has(page)) {
        persist({
          ...plan,
          completedPages: plan.completedPages.filter((p) => p !== page),
        });
      } else {
        persist(markPageRead(plan, page));
      }
    },
    [plan, completedSet, persist]
  );

  const openPage = useCallback(
    (page: number) => {
      router.push({ pathname: '/mushaf', params: { page: String(page) } });
    },
    [router]
  );

  const continueReading = useCallback(() => {
    const target = todaysPages[0] ?? plan?.lastPage ?? 1;
    if (plan) persist({ ...plan, lastPage: target, lastActivityAt: Date.now() });
    openPage(target);
  }, [todaysPages, plan, persist, openPage]);

  // ---- No plan: goal picker ----
  if (!plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader
          title="رحلة ختمة"
          leadingIcon={<Text style={styles.navGlyph}>→</Text>}
          onLeadingPress={() => router.back()}
          leadingLabel="رجوع"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroGlyph}>۞</Text>
            <Text style={[textStyles.h2, styles.heroTitle]}>اختر مدة ختمتك</Text>
            <Text style={[textStyles.caption, styles.heroSubtitle]}>
              سنوزّع عليك {toArabicDigits(KHATMAH_TOTAL_PAGES)} صفحة على المدة التي تختارها.
            </Text>
          </View>

          <View style={styles.durationRow}>
            {KHATMAH_DURATIONS.map((days) => {
              const active = selectedDuration === days;
              return (
                <Pressable
                  key={days}
                  style={[styles.durationChip, active && styles.durationChipActive]}
                  onPress={() => {
                    setSelectedDuration(days);
                    setCustomDays('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.durationNumber, active && styles.durationNumberActive]}>
                    {toArabicDigits(days)}
                  </Text>
                  <Text style={[styles.durationLabel, active && styles.durationLabelActive]}>يومًا</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customRow}>
            <Text style={[textStyles.body, styles.customLabel]}>أو مدة مخصّصة</Text>
            <TextInput
              style={styles.customInput}
              keyboardType="number-pad"
              value={customDays}
              onChangeText={(t) => {
                setCustomDays(t.replace(/[^0-9٠-٩]/g, ''));
                setSelectedDuration(0);
              }}
              placeholder="مثال: ٤٥"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <Button
            fullWidth
            size="lg"
            onPress={() => {
              const custom = Number(
                customDays.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
              );
              startPlan(custom > 0 ? custom : selectedDuration || 30);
            }}
          >
            ابدأ الختمة
          </Button>

          <Text style={[textStyles.caption, styles.note]}>
            الورد اليومي يُحسب من الصفحات المتبقية. لو فاتك يوم، يعاد توزيعه تلقائيًا دون
            ضغط — والأهم هو الاستمرار.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Active plan ----
  const finishDate = projectedFinish(plan);
  const surahOfLast = quranData.getSurahByPage(plan.lastPage);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="رحلة ختمة"
        subtitle={`${toArabicDigits(plan.durationDays)} يومًا`}
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress card */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={[textStyles.h2, styles.percent]}>{toArabicDigits(progress.percent)}%</Text>
            <Text style={[textStyles.caption, styles.progressSub]}>
              {toArabicDigits(progress.completedCount)} من {toArabicDigits(progress.totalPages)} صفحة
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="وِرد اليوم" value={toArabicDigits(progress.todayTarget)} suffix="صفحة" />
            <Stat label="المتبقّي" value={toArabicDigits(progress.remainingCount)} suffix="صفحة" />
            <Stat
              label="التوقّع"
              value={toArabicDigits(new Date(finishDate).getDate()) + '/' + toArabicDigits(new Date(finishDate).getMonth() + 1)}
              suffix=""
            />
          </View>
        </View>

        {/* Pacing note */}
        <View style={[styles.paceCard, progress.onTrack ? styles.paceOk : styles.paceBehind]}>
          <Text style={[textStyles.bodySmall, styles.paceText]}>
            {progress.remainingCount === 0
              ? 'أتممت الختمة، تقبّل الله 🤍'
              : progress.onTrack
                ? 'أنت متقدّم على المسار — استمر على راحتك.'
                : 'لا بأس، أعدنا توزيع ما فاتك على الأيام المتبقية.'}
          </Text>
        </View>

        {/* Today's wird */}
        <View style={styles.sectionHeader}>
          <Text style={[textStyles.h4, styles.sectionTitle]}>وِرد اليوم</Text>
          <Text style={[textStyles.caption, styles.sectionMeta]}>
            {toArabicDigits(progress.todayDone)} / {toArabicDigits(progress.todayTarget)}
          </Text>
        </View>

        <View style={styles.pageGrid}>
          {todaysPages.map((page) => {
            const done = completedSet.has(page);
            const surah = quranData.getSurahByPage(page);
            return (
              <View key={page} style={[styles.pageCard, done && styles.pageCardDone]}>
                <Pressable style={styles.pageCardMain} onPress={() => openPage(page)}>
                  <Text style={[styles.pageNumber, done && styles.pageNumberDone]}>
                    {toArabicDigits(page)}
                  </Text>
                  <Text style={[textStyles.caption, styles.pageSurah]} numberOfLines={1}>
                    {surah?.nameArabic ?? ''}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.pageToggle, done && styles.pageToggleDone]}
                  onPress={() => togglePage(page)}
                  accessibilityRole="button"
                  accessibilityLabel={done ? 'إلغاء تحديد الصفحة' : 'تحديد الصفحة كمقروءة'}
                >
                  <Text style={[styles.pageToggleGlyph, done && styles.pageToggleGlyphDone]}>
                    {done ? '✓' : '○'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Button fullWidth size="lg" onPress={continueReading}>
          {`متابعة القراءة من صفحة ${toArabicDigits(plan.lastPage)}`}
        </Button>

        <Pressable style={styles.footerLink} onPress={() => openPage(plan.lastPage)}>
          <Text style={[textStyles.caption, styles.footerText]}>
            آخر موضع قراءة: صفحة {toArabicDigits(plan.lastPage)}
            {surahOfLast ? ` — ${surahOfLast.nameArabic}` : ''}
          </Text>
        </Pressable>

        <Pressable style={styles.resetLink} onPress={resetPlan}>
          <Text style={[textStyles.caption, styles.resetText]}>إعادة تعيين الختمة</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {suffix ? <Text style={styles.statSuffix}> {suffix}</Text> : null}
      </Text>
      <Text style={[textStyles.caption, styles.statLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  navGlyph: { fontSize: 24, color: theme.colors.textPrimary, width: 44, textAlign: 'center' },
  content: { padding: theme.spacing.screenPadding, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg },

  hero: { alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.lg },
  heroGlyph: { fontSize: 40, color: theme.colors.goldMuted },
  heroTitle: { color: theme.colors.textPrimary },
  heroSubtitle: { color: theme.colors.textMuted, textAlign: 'center' },

  durationRow: { flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'center' },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 4,
  },
  durationChipActive: { backgroundColor: theme.colors.brownPrimary, borderColor: theme.colors.brownPrimary },
  durationNumber: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.textPrimary },
  durationNumberActive: { color: theme.colors.surfaceHighlight },
  durationLabel: { ...textStyles.caption, color: theme.colors.textMuted },
  durationLabelActive: { color: theme.colors.surfaceHighlight },

  customRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  customLabel: { color: theme.colors.textSecondary, flex: 1 },
  customInput: {
    minWidth: 120,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  note: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  progressHeader: { alignItems: 'center' },
  percent: { color: theme.colors.brownPrimary },
  progressSub: { color: theme.colors.textMuted, marginTop: 2 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.divider,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.goldMuted },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary },
  statSuffix: { fontSize: theme.fontSize.sm, fontWeight: '400', color: theme.colors.textMuted },
  statLabel: { color: theme.colors.textMuted, marginTop: 2 },

  paceCard: {
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  paceOk: { backgroundColor: theme.colors.surfaceSecondary },
  paceBehind: { backgroundColor: theme.colors.surfaceHighlight },
  paceText: { color: theme.colors.textSecondary, textAlign: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: theme.colors.textPrimary },
  sectionMeta: { color: theme.colors.goldMuted },

  pageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  pageCard: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  pageCardDone: { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.goldMuted },
  pageCardMain: { flex: 1, gap: 2 },
  pageNumber: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary },
  pageNumberDone: { color: theme.colors.brownPrimary },
  pageSurah: { color: theme.colors.textMuted },
  pageToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageToggleDone: { backgroundColor: theme.colors.brownPrimary, borderColor: theme.colors.brownPrimary },
  pageToggleGlyph: { color: theme.colors.textMuted, fontSize: 14 },
  pageToggleGlyphDone: { color: theme.colors.surfaceHighlight },

  footerLink: { alignItems: 'center', marginTop: theme.spacing.sm },
  footerText: { color: theme.colors.textMuted },
  resetLink: { alignItems: 'center', marginTop: theme.spacing.md },
  resetText: { color: theme.colors.error },
});
