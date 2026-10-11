/**
 * 404 — friendly fallback for unknown routes.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { theme, textStyles } from '@/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.glyph}>۞</Text>
      <Text style={[textStyles.h3, styles.title]}>الصفحة غير موجودة</Text>
      <Text style={[textStyles.bodySmall, styles.hint]}>
        يبدو أن هذه الصفحة غير متوفرة.
      </Text>
      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>العودة إلى الرئيسية</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  glyph: {
    fontSize: 34,
    color: theme.colors.goldMuted,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  hint: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.brownPrimary,
  },
  buttonText: {
    ...textStyles.label,
    color: theme.colors.surfaceHighlight,
  },
});