import React, { ReactNode, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { useAppSettings } from '../../hooks/useAppSettings';
import { buildPaperTheme } from '../../theme/paperTheme';
import { ThemeMode } from '../../theme/theme';

interface AppThemeProviderProps {
  children: ReactNode;
}

const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
  const { settings } = useAppSettings();
  const mode: ThemeMode = settings.darkMode ? 'dark' : 'light';

  const paperTheme = useMemo(() => buildPaperTheme(mode), [mode]);

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
};

export default AppThemeProvider;
