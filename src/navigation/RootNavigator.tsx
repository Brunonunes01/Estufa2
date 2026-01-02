// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

// --- Telas de Autenticação ---
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';

// --- Telas do Sistema ---
import DashboardScreen from '../screens/Dashboard/DashboardScreen';

// Estufas
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';
import EstufaDetailScreen from '../screens/Estufas/EstufaDetailScreen';

// Plantios
import PlantioFormScreen from '../screens/Plantios/PlantioFormScreen';
import PlantioDetailScreen from '../screens/Plantios/PlantioDetailScreen';

// Colheitas e Vendas
import ColheitaFormScreen from '../screens/Colheitas/ColheitaFormScreen';
import VendasListScreen from '../screens/Vendas/VendasListScreen';

// Financeiro
import ContasReceberScreen from '../screens/Financeiro/ContasReceberScreen'; // <--- IMPORTADO AQUI

// Insumos
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import InsumoFormScreen from '../screens/Insumos/InsumoFormScreen';
import InsumoEntryScreen from '../screens/Insumos/InsumoEntryScreen';

// Fornecedores
import FornecedoresListScreen from '../screens/Fornecedores/FornecedoresListScreen';
import FornecedorFormScreen from '../screens/Fornecedores/FornecedorFormScreen';

// Aplicações
import AplicacaoFormScreen from '../screens/Aplicacoes/AplicacaoFormScreen';
import AplicacoesHistoryScreen from '../screens/Aplicacoes/AplicacoesHistoryScreen';

// Clientes
import ClientesListScreen from '../screens/Clientes/ClientesListScreen';
import ClienteFormScreen from '../screens/Clientes/ClienteFormScreen';

// Despesas
import DespesasListScreen from '../screens/Despesas/DespesasListScreen';
import DespesaFormScreen from '../screens/Despesas/DespesaFormScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: '#166534' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
    headerBackTitle: '', 
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions}>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ headerShown: false }} 
    />
    
    <Stack.Screen name="ShareAccount" component={ShareAccountScreen} options={{ title: 'Compartilhar Acesso' }} />

    {/* Estufas */}
    <Stack.Screen name="EstufasList" component={EstufasListScreen} options={{ title: 'Minhas Estufas' }} />
    <Stack.Screen name="EstufaForm" component={EstufaFormScreen} options={{ title: 'Gerenciar Estufa' }} />
    <Stack.Screen name="EstufaDetail" component={EstufaDetailScreen} options={{ title: 'Detalhes da Estufa' }} />

    {/* Plantios */}
    <Stack.Screen name="PlantioForm" component={PlantioFormScreen} options={{ title: 'Novo Plantio' }} />
    <Stack.Screen name="PlantioDetail" component={PlantioDetailScreen} options={{ title: 'Painel do Ciclo' }} />

    {/* Operações */}
    <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Nova Venda' }} />
    <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Histórico de Vendas' }} />
    
    {/* --- FINANCEIRO (ADICIONADO) --- */}
    <Stack.Screen 
        name="ContasReceber" 
        component={ContasReceberScreen} 
        options={{ 
            title: 'Contas a Receber',
            headerStyle: { backgroundColor: '#B45309' } // Laranja Terra para diferenciar
        }} 
    />

    <Stack.Screen name="AplicacaoForm" component={AplicacaoFormScreen} options={{ title: 'Aplicação' }} />
    <Stack.Screen name="AplicacoesHistory" component={AplicacoesHistoryScreen} options={{ title: 'Histórico de Aplicações' }} />

    {/* Estoque e Insumos */}
    <Stack.Screen name="InsumosList" component={InsumosListScreen} options={{ title: 'Estoque de Insumos' }} />
    <Stack.Screen name="InsumoForm" component={InsumoFormScreen} options={{ title: 'Cadastro de Insumo' }} />
    <Stack.Screen name="InsumoEntry" component={InsumoEntryScreen} options={{ title: 'Entrada de Estoque' }} />

    {/* Cadastros Gerais */}
    <Stack.Screen name="FornecedoresList" component={FornecedoresListScreen} options={{ title: 'Fornecedores' }} />
    <Stack.Screen name="FornecedorForm" component={FornecedorFormScreen} options={{ title: 'Gerenciar Fornecedor' }} />

    <Stack.Screen name="ClientesList" component={ClientesListScreen} options={{ title: 'Meus Clientes', headerStyle: { backgroundColor: '#0369A1' } }} />
    <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Gerenciar Cliente', headerStyle: { backgroundColor: '#0369A1' } }} />

    <Stack.Screen name="DespesasList" component={DespesasListScreen} options={{ title: 'Gestão de Despesas', headerStyle: { backgroundColor: '#BE123C' } }} />
    <Stack.Screen name="DespesaForm" component={DespesaFormScreen} options={{ title: 'Lançar Despesa', headerStyle: { backgroundColor: '#BE123C' } }} />
    
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};