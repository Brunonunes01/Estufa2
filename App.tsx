// App.tsx
import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* O RootNavigator decide se mostra Login ou Dashboard */}
      <RootNavigator />
    </AuthProvider>
  );
}