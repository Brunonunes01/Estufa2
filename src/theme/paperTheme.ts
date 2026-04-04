import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { modePalette, type ThemeMode } from './theme';

export const buildPaperTheme = (mode: ThemeMode): MD3Theme => {
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const palette = modePalette[mode];

  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: palette.info,
      secondary: palette.warning,
      error: palette.danger,
      background: palette.pageBackground,
      surface: palette.surfaceBackground,
      surfaceVariant: palette.surfaceMuted,
      onSurface: palette.textPrimary,
      onPrimary: palette.textInverse,
      onBackground: palette.textPrimary,
      outline: palette.border,
    },
  };
};
