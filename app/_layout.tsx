/**
 * Root Layout — Expo Router + providers + safe area + fonts.
 * Initialises the audio player store once at app start.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Providers } from '@/providers';
import { initPlayerStore } from '@/store/player';
import { theme } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'AmiriQuran-Regular': require('../assets/fonts/AmiriQuran.ttf'),
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    initPlayerStore();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <StatusBar style="dark" />
          {fontsReady ? (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="reader" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="reciters" />
              <Stack.Screen name="tafsir" />
              <Stack.Screen name="bookmarks" />
              <Stack.Screen name="khatmah" />
              <Stack.Screen name="notes" />
              <Stack.Screen name="renad-moment" />
              <Stack.Screen name="about" />
            </Stack>
          ) : null}
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}