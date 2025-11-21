// src/screens/App.tsx
import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      {/* Definimos o estilo da barra de status como 'light' para ter bom contraste com o cabeçalho verde escuro. */}
      <StatusBar style="light" /> 
    </AuthProvider>
  );
}