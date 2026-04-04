import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppSettingsProvider } from './src/contexts/AppSettingsContext';
import { FeedbackProvider } from './src/contexts/FeedbackContext';
import { queryClient } from './src/lib/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import AppThemeProvider from './src/components/providers/AppThemeProvider';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSettingsProvider>
        <AppThemeProvider>
          <FeedbackProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </FeedbackProvider>
        </AppThemeProvider>
      </AppSettingsProvider>
    </QueryClientProvider>
  );
}
