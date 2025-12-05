// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { TextStyle, ViewStyle } from 'react-native'; 

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
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import InsumoFormScreen from '../screens/Insumos/InsumoFormScreen';
import FornecedoresListScreen from '../screens/Fornecedores/FornecedoresListScreen';
import FornecedorFormScreen from '../screens/Fornecedores/FornecedorFormScreen';
import AplicacaoFormScreen from '../screens/Aplicacoes/AplicacaoFormScreen';
import AplicacoesHistoryScreen from '../screens/Aplicacoes/AplicacoesHistoryScreen'; 
import InsumoEntryScreen from '../screens/Insumos/InsumoEntryScreen'; 
// NOVO IMPORT
import VendasListScreen from '../screens/Vendas/VendasListScreen'; 

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
    headerStyle: {
        backgroundColor: '#4CAF50', 
    } as ViewStyle, 
    headerTintColor: '#fff', 
    headerTitleStyle: {
        fontWeight: 'bold' as 'bold', 
    } as TextStyle,
} as const;

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions as NativeStackNavigationOptions}>
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
    <Stack.Screen 
      name="InsumosList" 
      component={InsumosListScreen} 
      options={{ title: 'Meus Insumos' }}
    />
    
    <Stack.Screen 
      name="InsumoForm" 
      component={InsumoFormScreen} 
    />
    
    <Stack.Screen 
      name="FornecedoresList" 
      component={FornecedoresListScreen} 
      options={{ title: 'Meus Fornecedores' }}
    />
    <Stack.Screen 
      name="FornecedorForm" 
      component={FornecedorFormScreen} 
    />
    <Stack.Screen 
      name="AplicacaoForm" 
      component={AplicacaoFormScreen} 
      options={{ title: 'Registrar Aplicação' }}
    />
    
    <Stack.Screen 
      name="AplicacoesHistory" 
      component={AplicacoesHistoryScreen} 
    />

    <Stack.Screen 
      name="InsumoEntry" 
      component={InsumoEntryScreen} 
      options={{ title: 'Entrada de Estoque' }}
    />

    {/* NOVA ROTA */}
    <Stack.Screen 
      name="VendasList" 
      component={VendasListScreen} 
      options={{ title: 'Gestão de Vendas' }} 
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