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
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';
import EstufaDetailScreen from '../screens/Estufas/EstufaDetailScreen';
import PlantioFormScreen from '../screens/Plantios/PlantioFormScreen';
import PlantioDetailScreen from '../screens/Plantios/PlantioDetailScreen';
import ColheitaFormScreen from '../screens/Colheitas/ColheitaFormScreen';

// Novas importações
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import InsumoFormScreen from '../screens/Insumos/InsumoFormScreen';


const Stack = createNativeStackNavigator();

// Pilha de autenticação
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Pilha principal do app (MODIFICADA)
const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ title: 'Painel SGE' }}
    />
    
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
    <Stack.Screen 
      name="EstufaDetail" 
      component={EstufaDetailScreen} 
    />
    <Stack.Screen 
      name="PlantioForm" 
      component={PlantioFormScreen} 
      options={{ title: 'Novo Plantio' }}
    />
    <Stack.Screen 
      name="PlantioDetail" 
      component={PlantioDetailScreen} 
    />
    <Stack.Screen 
      name="ColheitaForm" 
      component={ColheitaFormScreen} 
      options={{ title: 'Registrar Colheita' }}
    />

    {/* Telas novas adicionadas */}
    <Stack.Screen 
      name="InsumosList" 
      component={InsumosListScreen} 
      options={{ title: 'Meus Insumos' }}
    />
    <Stack.Screen 
      name="InsumoForm" 
      component={InsumoFormScreen} 
      options={{ title: 'Novo Insumo' }}
    />
    
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