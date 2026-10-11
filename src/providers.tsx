/**
 * App Providers — Theme context + React Query client.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors, colorsDark } from '@/theme';
import { settingsStorage } from '@/storage';
import type { AppSettings } from '@/types';

// ============================================
// Theme context
// ============================================

export type ThemeColors = { [K in keyof typeof colors]: string };

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setTheme: (theme: AppSettings['theme']) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useAppTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
};

// ============================================
// Query client
// ============================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================
// Theme provider
// ============================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  // Lazy-init from storage so persisted settings are available on first paint.
  const [settings, setSettings] = useState<AppSettings>(() => settingsStorage.getAll());

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      settingsStorage.setAll(next);
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: AppSettings['theme']) => {
      updateSettings({ theme });
      settingsStorage.setTheme(theme);
    },
    [updateSettings]
  );

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : settings.theme;

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: resolvedTheme,
      colors: resolvedTheme === 'dark' ? colorsDark : colors,
      settings,
      updateSettings,
      setTheme,
    }),
    [resolvedTheme, settings, updateSettings, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
