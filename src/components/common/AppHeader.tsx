/**
 * AppHeader — Warm minimal header per reference design.
 * Leading button sits on the RTL start side, title is centred, trailing on the
 * other side. Both buttons are optional.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, textStyles } from '@/theme';
import { IconButton } from './Button';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  leadingIcon?: React.ReactNode;
  onLeadingPress?: () => void;
  leadingLabel?: string;
  trailingIcon?: React.ReactNode;
  onTrailingPress?: () => void;
  trailingLabel?: string;
  children?: React.ReactNode; // rendered instead of the trailing button
}

export const AppHeader = ({
  title,
  subtitle,
  leadingIcon,
  onLeadingPress,
  leadingLabel,
  trailingIcon,
  onTrailingPress,
  trailingLabel,
  children,
}: AppHeaderProps) => {
  const showLeading = leadingIcon && onLeadingPress;
  const showTrailing = children || (trailingIcon && onTrailingPress);

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showLeading && (
          <IconButton
            icon={leadingIcon}
            size="md"
            variant="subtle"
            onPress={onLeadingPress}
            accessibilityLabel={leadingLabel ?? 'القائمة'}
          />
        )}
      </View>

      <View style={styles.titleWrap}>
        <Text style={[textStyles.h3, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[textStyles.caption, styles.subtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideEnd]}>
        {showTrailing ? (
          children ?? (
            <IconButton
              icon={trailingIcon}
              size="md"
              variant="subtle"
              onPress={onTrailingPress}
              accessibilityLabel={trailingLabel ?? 'المزيد'}
            />
          )
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding - 4,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    minHeight: 56,
  },
  side: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});