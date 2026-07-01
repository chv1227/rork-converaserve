import createContextHook from '@nkzw/create-context-hook';
import { LightTheme } from '@/constants/colors';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const colors = LightTheme;

  return { colors };
});

export type ThemeColors = typeof LightTheme;
