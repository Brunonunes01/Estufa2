import React from 'react';
import { StatusBar } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppSettingsProvider } from './src/contexts/AppSettingsContext';
import { FeedbackProvider } from './src/contexts/FeedbackContext';
import { queryClient } from './src/lib/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { paperTheme } from './src/theme/paperTheme';
import { COLORS } from './src/constants/theme';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <FeedbackProvider>
          <AppSettingsProvider>
            <AuthProvider>
              <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} translucent />
              <RootNavigator />
            </AuthProvider>
          </AppSettingsProvider>
        </FeedbackProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
