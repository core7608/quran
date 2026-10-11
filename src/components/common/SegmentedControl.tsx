/**
 * Segmented Control — Used for navigation tabs (Surah/Page/Juz/Hizb/Ruku)
 * Matches reference design: muted brown bg, active tab = lighter beige fill
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { theme, textStyles } from '@/theme';

export interface SegmentedControlProps {
  segments: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  scrollable?: boolean;
  style?: any;
  contentContainerStyle?: any;
}

export const SegmentedControl = React.forwardRef<
  { scrollToSegment: (key: string) => void },
  SegmentedControlProps
>(
  ({ segments, value, onChange, scrollable = true, style, contentContainerStyle }, ref) => {
    const scrollRef = React.useRef<ScrollView>(null);

    const scrollToSegment = React.useCallback((key: string) => {
      if (!scrollable || !scrollRef.current) return;
      const index = segments.findIndex(s => s.key === key);
      if (index >= 0) {
        // Approximate scroll position
        scrollRef.current.scrollTo({
          x: index * 80,
          animated: true,
        });
      }
    }, [scrollable, segments]);

    React.useImperativeHandle(ref, () => ({ scrollToSegment }));

    return (
      <View style={[styles.container, style]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { gap: theme.spacing.xs },
            contentContainerStyle,
          ]}
        >
          {segments.map((segment) => {
            const isActive = value === segment.key;
            return (
              <Pressable
                key={segment.key}
                onPress={() => onChange(segment.key)}
                style={[
                  styles.segment,
                  isActive && styles.segmentActive,
                ]}
                android_ripple={{ color: theme.colors.brownActive }}
              >
                <Text
                  style={[
                    textStyles.label,
                    isActive ? styles.segmentTextActive : styles.segmentText,
                  ]}
                >
                  {segment.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

SegmentedControl.displayName = 'SegmentedControl';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.brownPrimary,
    borderRadius: theme.radius.chip,
    padding: theme.spacing.xs,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.chip,
    minWidth: 64,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.brownActive,
    shadowColor: theme.colors.brownPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    color: theme.colors.surfaceHighlight,
    opacity: 0.8,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
});