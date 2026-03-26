import { Platform } from 'react-native';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 26,
  display: 30,
  hero: 34,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 3px rgba(15, 30, 48, 0.04)',
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 2px 8px rgba(15, 30, 48, 0.06)',
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 4px 16px rgba(15, 30, 48, 0.08)',
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 10,
    },
    web: {
      boxShadow: '0 8px 24px rgba(15, 30, 48, 0.12)',
    },
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 10px rgba(15, 30, 48, 0.05)',
    },
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: '#0F1E30',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 32,
    },
    android: {
      elevation: 12,
    },
    web: {
      boxShadow: '0 12px 32px rgba(15, 30, 48, 0.15)',
    },
  }),
} as const;

export const ButtonStates = {
  default: {
    opacity: 1,
    scale: 1,
  },
  hover: {
    opacity: 0.92,
    scale: 1,
  },
  pressed: {
    opacity: 0.85,
    scale: 0.97,
  },
  disabled: {
    opacity: 0.45,
    scale: 1,
  },
} as const;

export const Duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  entrance: 500,
} as const;
