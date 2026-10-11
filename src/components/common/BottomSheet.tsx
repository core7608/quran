/**
 * Bottom Sheet — Reusable, animated, accessible
 * Used for Quick Tools, reciter selection, etc.
 * Matches reference: warm ivory surface, large rounded top corners, close icon, subtle entrance
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Keyboard,
  ScrollView,
  BackHandler,
  Platform,
  Easing,
} from 'react-native';
import { theme, textStyles } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | 'auto';
  maxHeight?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  snapPoints?: number[]; // For multi-snap (e.g., half, full)
  onSnapChange?: (index: number) => void;
}

const { height: screenHeight } = Dimensions.get('window');
const DEFAULT_MAX_HEIGHT = screenHeight * 0.85;

export const BottomSheet = React.forwardRef<
  { snapTo: (index: number) => void; close: () => void },
  BottomSheetProps
>(
  (
    {
      visible,
      onClose,
      title,
      children,
      height = 'auto',
      maxHeight = DEFAULT_MAX_HEIGHT,
      showHandle = true,
      showCloseButton = true,
      snapPoints,
      onSnapChange,
    },
    ref
  ) => {
    void snapPoints; // reserved for multi-snap expansion
    const translateY = useRef(new Animated.Value(screenHeight)).current;

    // Expose imperative controls (e.g. caller snaps to a target height)
    React.useImperativeHandle(ref, () => ({
      snapTo: (index: number) => {
        onSnapChange?.(index);
      },
      close: () => onClose(),
    }));

    // Handle back button on Android
    useEffect(() => {
      if (Platform.OS === 'android' && visible) {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
          onClose();
          return true;
        });
        return () => subscription.remove();
      }
    }, [visible, onClose]);

    const animateIn = useCallback(() => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, [translateY]);

    const animateOut = useCallback(() => {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => onClose());
    }, [translateY, onClose]);

    useEffect(() => {
      if (visible) {
        animateIn();
      } else {
        animateOut();
      }
    }, [visible, animateIn, animateOut]);

    // Keyboard handling
    useEffect(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
        Animated.timing(translateY, {
          toValue: -e.endCoordinates.height + 20,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [translateY]);

    const sheetHeight = height === 'auto' ? maxHeight : Math.min(height, maxHeight);

    return (
      <>
        {visible && (
          <Animated.View
            style={[
              styles.overlay,
              { opacity: translateY.interpolate({ inputRange: [0, screenHeight], outputRange: [1, 0] }) },
            ]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onClose}
            accessible={false}
          />
        )}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              maxHeight: sheetHeight,
            },
          ]}
        >
          {/* Handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && <Text style={[textStyles.h4, styles.headerTitle]}>{title}</Text>}
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="إغلاق"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.closeIcon}>{"\u00D7"}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    zIndex: 99,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  handleContainer: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  closeIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    fontWeight: '300',
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingBottom: theme.spacing.xxxl,
    paddingTop: theme.spacing.md,
  },
});