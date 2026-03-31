import { MD3LightTheme } from 'react-native-paper';
import { COLORS } from '../constants/theme';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    error: COLORS.danger,
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.textPrimary,
    onPrimary: COLORS.textLight,
  },
};
