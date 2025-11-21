// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
// NOVO IMPORT: Importar 'TextStyle' para resolver a tipagem de estilo
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

const Stack = createNativeStackNavigator();

// Opções de tela padrão para o Material Design (Cabeçalho Verde)
const defaultScreenOptions = {
    // headerStyle é do tipo ViewStyle (para o container do cabeçalho)
    headerStyle: {
        backgroundColor: '#4CAF50', 
    } as ViewStyle, 
    headerTintColor: '#fff', 
    // headerTitleStyle é do tipo TextStyle
    headerTitleStyle: {
        fontWeight: 'bold' as 'bold', 
    } as TextStyle,
} as const; // Asserção final para resolver o problema de aninhamento de tipos


// Pilha de autenticação
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Pilha principal do app
const AppStack = () => (
  // O TS agora aceita defaultScreenOptions porque ele é um tipo mais estrito (as const)
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