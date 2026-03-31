import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppSettingsProvider } from './src/contexts/AppSettingsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <RootNavigator />
      </AuthProvider>
    </AppSettingsProvider>
  );
}
