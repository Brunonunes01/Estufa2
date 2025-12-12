// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { TextStyle, ViewStyle } from 'react-native'; 

// Telas de Auth
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';

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
import InsumoEntryScreen from '../screens/Insumos/InsumoEntryScreen'; 
import FornecedoresListScreen from '../screens/Fornecedores/FornecedoresListScreen';
import FornecedorFormScreen from '../screens/Fornecedores/FornecedorFormScreen';
import AplicacaoFormScreen from '../screens/Aplicacoes/AplicacaoFormScreen';
import AplicacoesHistoryScreen from '../screens/Aplicacoes/AplicacoesHistoryScreen'; 
import VendasListScreen from '../screens/Vendas/VendasListScreen'; 

// Telas de Clientes
import ClientesListScreen from '../screens/Clientes/ClientesListScreen';
import ClienteFormScreen from '../screens/Clientes/ClienteFormScreen';

// Telas de Despesas
import DespesasListScreen from '../screens/Despesas/DespesasListScreen';
import DespesaFormScreen from '../screens/Despesas/DespesaFormScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
    headerStyle: {
        backgroundColor: '#166534', // Verde Floresta Sóbrio
    } as ViewStyle, 
    headerTintColor: '#fff', 
    headerTitleStyle: {
        fontWeight: 'bold' as 'bold', 
    } as TextStyle,
    headerBackTitleVisible: false,
} as const;

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions as NativeStackNavigationOptions}>
    {/* Dashboard sem header padrão para design imersivo */}
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ headerShown: false }} 
    />
    
    <Stack.Screen 
      name="ShareAccount" 
      component={ShareAccountScreen} 
      options={{ title: 'Compartilhar Acesso' }} 
    />

    <Stack.Screen name="EstufasList" component={EstufasListScreen} options={{ title: 'Minhas Estufas' }} />
    <Stack.Screen name="EstufaForm" component={EstufaFormScreen} />
    <Stack.Screen name="EstufaDetail" component={EstufaDetailScreen} options={{ title: 'Detalhes da Estufa' }} />

    <Stack.Screen name="PlantioForm" component={PlantioFormScreen} options={{ title: 'Novo Plantio' }} />
    <Stack.Screen name="PlantioDetail" component={PlantioDetailScreen} options={{ title: 'Painel do Ciclo' }} />

    <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Nova Venda' }} />
    <Stack.Screen name="AplicacaoForm" component={AplicacaoFormScreen} options={{ title: 'Aplicação' }} />
    <Stack.Screen name="AplicacoesHistory" component={AplicacoesHistoryScreen} />

    <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Histórico de Vendas' }} />
    
    <Stack.Screen name="InsumosList" component={InsumosListScreen} options={{ title: 'Estoque de Insumos' }} />
    <Stack.Screen name="InsumoForm" component={InsumoFormScreen} />
    <Stack.Screen name="InsumoEntry" component={InsumoEntryScreen} options={{ title: 'Entrada de Estoque' }} />

    <Stack.Screen name="FornecedoresList" component={FornecedoresListScreen} options={{ title: 'Fornecedores' }} />
    <Stack.Screen name="FornecedorForm" component={FornecedorFormScreen} />

    <Stack.Screen 
        name="ClientesList" 
        component={ClientesListScreen} 
        options={{ 
            title: 'Meus Clientes', 
            headerStyle: { backgroundColor: '#0369A1' } // Azul Profundo
        }} 
    />
    <Stack.Screen 
        name="ClienteForm" 
        component={ClienteFormScreen} 
        options={{ 
            headerStyle: { backgroundColor: '#0369A1' } 
        }} 
    />

    <Stack.Screen 
        name="DespesasList" 
        component={DespesasListScreen} 
        options={{ 
            title: 'Gestão de Despesas', 
            headerStyle: { backgroundColor: '#BE123C' } // Vermelho Vinho
        }} 
    />
    <Stack.Screen 
        name="DespesaForm" 
        component={DespesaFormScreen} 
        options={{ 
            title: 'Lançar Despesa',
            headerStyle: { backgroundColor: '#BE123C' } 
        }} 
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