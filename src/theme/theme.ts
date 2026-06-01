import { colors } from './colors';

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  h1: 32,
  h2: 26,
  h3: 22,
  title: 18,
  body: 16,
  caption: 13,
};

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
};

export const modePalette = {
  light: {
    pageBackground: colors.background,
    panelBackground: colors.secondary,
    surfaceBackground: colors.surface,
    surfaceMuted: colors.surfaceMuted,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textInverse: colors.textLight,
    border: colors.border,
    divider: colors.divider,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
    successSoft: colors.successSoft,
    warningSoft: colors.warningSoft,
    dangerSoft: colors.dangerBg,
    infoSoft: colors.infoSoft,
    skeleton: '#E2E8F0',
    overlay: colors.overlay,
  },
  dark: {
    pageBackground: colors.c1E293B,
    panelBackground: colors.textDark,
    surfaceBackground: colors.c334155,
    surfaceMuted: colors.c374151,
    textPrimary: colors.textLight,
    textSecondary: colors.cCBD5E1,
    textInverse: colors.textDark,
    border: colors.c475569,
    divider: colors.c475569,
    success: colors.c6EE7B7,
    warning: '#FBBF24',
    danger: colors.cFCA5A5,
    info: colors.cBFDBFE,
    successSoft: '#123226',
    warningSoft: '#4A2E12',
    dangerSoft: '#4C1D1D',
    infoSoft: '#1E3A8A',
    skeleton: colors.c475569,
    overlay: colors.overlaySoft,
  },
} as const;

export type ThemeMode = keyof typeof modePalette;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  modePalette,
};

export type AppTheme = typeof theme;
