// ── ChurchConnect Modern Design System ──
// Light & Dark theme tokens. Every color token lives here.
// Never import this directly in components — use useTheme().

export const LightTheme = {
  // ── Brand ──
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A5F',
  primaryBg: '#EFF6FF',

  secondary: '#0D9488',
  secondaryLight: '#14B8A6',
  secondaryDark: '#0F766E',
  secondaryBg: '#F0FDFA',

  accent: '#D97706',
  accentLight: '#F59E0B',
  accentDark: '#B45309',
  accentBg: '#FFFBEB',

  // ── Surfaces ──
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // ── Text ──
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // ── Borders ──
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // ── Semantic ──
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',

  // ── Overlay ──
  overlay: 'rgba(15, 23, 42, 0.45)',

  // ── Gradients ──
  gradientStart: '#1E40AF',
  gradientMiddle: '#2563EB',
  gradientEnd: '#1E3A5F',

  cardGradient1: '#1E40AF',
  cardGradient2: '#3B82F6',

  // ── Tab Bar ──
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#1E40AF',

  // ── Legacy aliases (keep existing code working) ──
  tertiary: '#0D9488',
  tertiaryLight: '#14B8A6',
  highlight: '#3B82F6',
  highlightLight: '#60A5FA',
  coral: '#F97316',
  sky: '#38BDF8',
  mint: '#10B981',
  peach: '#FB923C',
  lavender: '#E2E8F0',
};

export const DarkTheme = {
  // ── Brand ──
  primary: '#60A5FA',
  primaryLight: '#93BBFD',
  primaryDark: '#2563EB',
  primaryBg: '#1E293B',

  secondary: '#2DD4BF',
  secondaryLight: '#5EEAD4',
  secondaryDark: '#0D9488',
  secondaryBg: '#134E4A',

  accent: '#FBBF24',
  accentLight: '#FCD34D',
  accentDark: '#F59E0B',
  accentBg: '#422006',

  // ── Surfaces ──
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  surfaceElevated: '#334155',

  // ── Text ──
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  // ── Borders ──
  border: '#334155',
  borderLight: '#1E293B',

  // ── Semantic ──
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#422006',
  error: '#F87171',
  errorLight: '#450A0A',
  info: '#60A5FA',
  infoLight: '#1E3A5F',

  // ── Overlay ──
  overlay: 'rgba(0, 0, 0, 0.6)',

  // ── Gradients ──
  gradientStart: '#1E293B',
  gradientMiddle: '#334155',
  gradientEnd: '#0F172A',

  cardGradient1: '#1E293B',
  cardGradient2: '#334155',

  // ── Tab Bar ──
  tabIconDefault: '#64748B',
  tabIconSelected: '#60A5FA',

  // ── Legacy aliases ──
  tertiary: '#2DD4BF',
  tertiaryLight: '#5EEAD4',
  highlight: '#60A5FA',
  highlightLight: '#93BBFD',
  coral: '#FB923C',
  sky: '#7DD3FC',
  mint: '#34D399',
  peach: '#FDBA74',
  lavender: '#334155',
};

export type ThemeColors = typeof LightTheme;

// Legacy default export — prefer useTheme() in components
const Colors = LightTheme;
export default Colors;
