/**
 * About Screen — transparency about sources & licenses.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, textStyles } from '@/theme';
import { AppHeader } from '@/components/common/AppHeader';
import { toArabicDigits } from '@/data/quran';

const LINKS: { label: string; url: string }[] = [
  { label: 'AlQuran Cloud (النص + الصوت)', url: 'https://alquran.cloud' },
  { label: 'Quran.com API (تفاسير إضافية)', url: 'https://quran.com' },
  { label: 'أمثلة المصحف: SakinaDevGroup/al_quran_madani', url: 'https://github.com/SakinaDevGroup/al_quran_madani' },
  { label: 'خط أميري القرآن — رخصة OFL', url: 'https://www.amirifont.org' },
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="حول التطبيق"
        leadingIcon={<Text style={styles.navGlyph}>→</Text>}
        onLeadingPress={() => router.back()}
        leadingLabel="رجوع"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroGlyph}>۞</Text>
          <Text style={[textStyles.h2, styles.heroTitle]}>القرآن الكريم</Text>
          <Text style={[textStyles.caption, styles.heroSubtitle]}>الإصدار 1.0.0</Text>
        </View>

        <View style={styles.card}>
          <Text style={[textStyles.h4, styles.cardTitle]}>المصادر والمحتوى</Text>
          <Text style={[textStyles.bodySmall, styles.paragraph]}>
            نص المصحف (رسم عثماني) والصفحات (QCF Madani 1405) مضمَّنان مع التطبيق
            ويعملان بالكامل بدون إنترنت وعدد آياته {toArabicDigits(6236)} آية في
            {toArabicDigits(604)} صفحة.
          </Text>
          <Text style={[textStyles.bodySmall, styles.paragraph]}>
            التفسير المضمَّن الوحيد هو «التفسير الميسّر». التلاوات والترجمات
            والتفاسير الإضافية تُجلب عبر الإنترنت عند الطلب ولا تُخزَّن مع
            التطبيق. تفاصيل كاملة في docs/PROVENANCE.md.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[textStyles.h4, styles.cardTitle]}>روابط</Text>
          {LINKS.map((link) => (
            <Pressable
              key={link.url}
              style={styles.linkRow}
              onPress={() => void Linking.openURL(link.url)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
              <Text style={styles.linkChevron}>↗</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[textStyles.caption, styles.footer]}>
          لا تُجمع أي بيانات شخصية. الألوان دافئة ومصممة للقراءة المريحة.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  heroGlyph: {
    fontSize: 30,
    color: theme.colors.goldMuted,
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
  },
  paragraph: {
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.relaxed,
    textAlign: 'right',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  linkText: {
    ...textStyles.bodySmall,
    color: theme.colors.brownPrimary,
    flex: 1,
  },
  linkChevron: {
    fontSize: theme.fontSize.md,
    color: theme.colors.goldMuted,
  },
  footer: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});