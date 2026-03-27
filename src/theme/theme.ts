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
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: 30,
  h2: 24,
  h3: 20,
  title: 17,
  body: 15,
  caption: 12,
};

export const shadows = {
  card: {
    shadowColor: colors.textDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: colors.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
};

export type AppTheme = typeof theme;
