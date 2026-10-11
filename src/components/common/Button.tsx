/**
 * Button Components — Minimal, warm design per reference
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { theme, textStyles } from '@/theme';

export interface ButtonProps extends React.ComponentPropsWithoutRef<typeof TouchableOpacity> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles = [
      styles.base,
      size === 'sm' && styles.sm,
      size === 'lg' && styles.lg,
      fullWidth && styles.fullWidth,
      isDisabled && styles.disabled,
      style,
    ];

    const textStyles_ = [
      textStyles.button,
      size === 'sm' && { fontSize: theme.fontSize.sm },
      size === 'lg' && { fontSize: theme.fontSize.lg },
      variant === 'primary' && styles.primaryText,
      variant === 'secondary' && styles.secondaryText,
      variant === 'ghost' && styles.ghostText,
      variant === 'outline' && styles.outlineText,
      isDisabled && styles.disabledText,
    ];

    const bgColor = variant === 'primary' ? theme.colors.brownPrimary
      : variant === 'secondary' ? theme.colors.surfaceSecondary
      : variant === 'ghost' ? 'transparent'
      : 'transparent';

    const borderColor = variant === 'outline' ? theme.colors.brownPrimary : 'transparent';

    return (
      <TouchableOpacity
        ref={ref}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.85}
        style={[
          { backgroundColor: bgColor, borderWidth: variant === 'outline' ? 1 : 0, borderColor },
          ...baseStyles,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? theme.colors.surfaceHighlight : theme.colors.brownPrimary}
          />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <Text style={textStyles_}>{children}</Text>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.radius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: theme.colors.surfaceHighlight,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },
  ghostText: {
    color: theme.colors.brownPrimary,
  },
  outlineText: {
    color: theme.colors.brownPrimary,
  },
  disabledText: {
    color: theme.colors.disabled,
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: 'transparent',
  },
  iconButtonActive: {
    backgroundColor: theme.colors.brownActive,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.surfaceHighlight,
    fontSize: 9,
    fontWeight: '600',
  },
});

// ============================================
// Icon Button (for toolbar, tabs, etc.)
// ============================================

export interface IconButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle';
  active?: boolean;
  badge?: string | number;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Override the base Pressable style union so wrappers can pass plain styles. */
  style?: StyleProp<ViewStyle>;
}

export const IconButton = React.forwardRef<View, IconButtonProps>(
  ({ icon, size = 'md', variant = 'default', active = false, badge, onPress, accessibilityLabel, style, ...props }, ref) => {
    const sizes = {
      sm: 36,
      md: 44,
      lg: 52,
    };

    const containerSize = sizes[size];
    const iconSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 22;

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[
          styles.iconButton,
          { width: containerSize, height: containerSize },
          active && variant === 'subtle' && styles.iconButtonActive,
          style,
        ]}
        {...props}
      >
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'center', alignItems: 'center' }}>
          {icon}
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
    );
  }
);

IconButton.displayName = 'IconButton';

export { styles as IconButtonStyles };