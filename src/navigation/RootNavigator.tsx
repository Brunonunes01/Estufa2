// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';

// Telas de Auth
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Telas do App
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
// NOVAS IMPORTAÇÕES
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';


const Stack = createNativeStackNavigator();

// Pilha de autenticação (não muda)
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Pilha principal do app (AQUI FICA A MUDANÇA)
const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ title: 'Painel SGE' }}
    />
    
    {/* NOVAS TELAS ADICIONADAS */}
    <Stack.Screen 
      name="EstufasList" 
      component={EstufasListScreen} 
      options={{ title: 'Minhas Estufas' }}
    />
    <Stack.Screen 
      name="EstufaForm" 
      component={EstufaFormScreen} 
      options={{ title: 'Nova Estufa' }}
    />

    {/* Aqui entrarão as outras telas: Plantios, Colheitas... */}
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};