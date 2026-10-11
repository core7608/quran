/**
 * Bottom tabs — Home / Mushaf / Search / More.
 *
 * The hamburger drawer of the original reference is replaced by the Quick
 * Tools bottom sheet (opened from within each screen), so only four tabs are
 * needed here.
 */

import React from 'react';
import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { theme } from '@/theme';

interface TabIconProps {
  glyph: string;
  color: ColorValue;
  size?: number;
}

function TabIcon({ glyph, color, size = 22 }: TabIconProps) {
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4 }} allowFontScaling={false}>
      {glyph}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brownPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.arabicUIMedium,
          fontSize: theme.fontSize.xs,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="⌂" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mushaf"
        options={{
          title: 'المصحف',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="۞" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'البحث',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="⌕" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'المزيد',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="☰" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}