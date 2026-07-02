import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '@/constants/colors';

const THEME_STORAGE_KEY = 'churchconnect_theme_preference';

type ThemeMode = 'system' | 'light' | 'dark';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setMode(stored);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch { /* ignore storage errors */ }
  }, []);

  const resolvedScheme = mode === 'system' ? systemColorScheme : mode;
  const isDark = resolvedScheme === 'dark';
  const colors: ThemeColors = isDark ? DarkTheme : LightTheme;

  return {
    colors,
    isDark,
    themeMode: mode,
    setThemeMode,
    isLoaded,
  };
});

// ThemeColors is exported from @/constants/colors
import type { ThemeColors } from '@/constants/colors';
export type { ThemeColors };
