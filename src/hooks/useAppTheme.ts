import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';
import { modePalette, theme, ThemeMode } from '../theme/theme';

export const useAppTheme = () => {
  const { settings } = useAppSettings();

  return useMemo(() => {
    const mode: ThemeMode = settings.darkMode ? 'dark' : 'light';
    const palette = modePalette[mode];

    return {
      mode,
      isDark: mode === 'dark',
      ...palette,
      spacing: theme.spacing,
      radius: theme.radius,
      typography: theme.typography,
      shadows: theme.shadows,
      rawColors: theme.colors,
      cardBackground: palette.surfaceBackground,
      inputBackground: palette.surfaceMuted,
      successBackground: palette.successSoft,
      warningBackground: palette.warningSoft,
      dangerBackground: palette.dangerSoft,
    };
  }, [settings.darkMode]);
};
