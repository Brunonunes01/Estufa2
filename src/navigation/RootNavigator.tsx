// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen'; // <-- NOVO

import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';
import EstufaDetailScreen from '../screens/Estufas/EstufaDetailScreen';
import PlantioFormScreen from '../screens/Plantios/PlantioFormScreen';
import PlantioDetailScreen from '../screens/Plantios/PlantioDetailScreen';
import ColheitaFormScreen from '../screens/Colheitas/ColheitaFormScreen';
import VendasListScreen from '../screens/Vendas/VendasListScreen';
import ContasReceberScreen from '../screens/Financeiro/ContasReceberScreen';
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import InsumoFormScreen from '../screens/Insumos/InsumoFormScreen';
import InsumoEntryScreen from '../screens/Insumos/InsumoEntryScreen';
import FornecedoresListScreen from '../screens/Fornecedores/FornecedoresListScreen';
import FornecedorFormScreen from '../screens/Fornecedores/FornecedorFormScreen';
import AplicacaoFormScreen from '../screens/Aplicacoes/AplicacaoFormScreen';
import AplicacoesHistoryScreen from '../screens/Aplicacoes/AplicacoesHistoryScreen';
import ClientesListScreen from '../screens/Clientes/ClientesListScreen';
import ClienteFormScreen from '../screens/Clientes/ClienteFormScreen';
import DespesasListScreen from '../screens/Despesas/DespesasListScreen';
import DespesaFormScreen from '../screens/Despesas/DespesaFormScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: COLORS.primary },
    headerTintColor: COLORS.textLight,
    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    headerTitleAlign: 'center', 
    headerShadowVisible: false, 
    headerBackTitle: '', 
    animation: 'slide_from_right', 
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false, animation: 'fade' }} />
    <Stack.Screen name="ShareAccount" component={ShareAccountScreen} options={{ title: 'Partilhar Acesso' }} />
    <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Minha Propriedade' }} />

    <Stack.Screen name="EstufasList" component={EstufasListScreen} options={{ title: 'Minhas Estufas' }} />
    <Stack.Screen name="EstufaForm" component={EstufaFormScreen} options={{ title: 'Gerir Estufa' }} />
    <Stack.Screen name="EstufaDetail" component={EstufaDetailScreen} options={{ title: 'Detalhes da Estufa' }} />
    <Stack.Screen name="PlantioForm" component={PlantioFormScreen} options={{ title: 'Novo Plantio' }} />
    <Stack.Screen name="PlantioDetail" component={PlantioDetailScreen} options={{ title: 'Painel do Ciclo' }} />
    <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Nova Venda' }} />
    <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Histórico de Vendas' }} />
    <Stack.Screen name="ContasReceber" component={ContasReceberScreen} options={{ title: 'Contas a Receber', headerStyle: { backgroundColor: COLORS.modFinanceiro } }} />
    <Stack.Screen name="AplicacaoForm" component={AplicacaoFormScreen} options={{ title: 'Aplicação' }} />
    <Stack.Screen name="AplicacoesHistory" component={AplicacoesHistoryScreen} options={{ title: 'Histórico de Aplicações' }} />
    <Stack.Screen name="InsumosList" component={InsumosListScreen} options={{ title: 'Stock de Insumos' }} />
    <Stack.Screen name="InsumoForm" component={InsumoFormScreen} options={{ title: 'Registo de Insumo' }} />
    <Stack.Screen name="InsumoEntry" component={InsumoEntryScreen} options={{ title: 'Entrada de Stock' }} />
    <Stack.Screen name="FornecedoresList" component={FornecedoresListScreen} options={{ title: 'Fornecedores' }} />
    <Stack.Screen name="FornecedorForm" component={FornecedorFormScreen} options={{ title: 'Gerir Fornecedor' }} />
    <Stack.Screen name="ClientesList" component={ClientesListScreen} options={{ title: 'Meus Clientes', headerStyle: { backgroundColor: COLORS.modClientes } }} />
    <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Gerir Cliente', headerStyle: { backgroundColor: COLORS.modClientes } }} />
    <Stack.Screen name="DespesasList" component={DespesasListScreen} options={{ title: 'Gestão de Despesas', headerStyle: { backgroundColor: COLORS.modDespesas } }} />
    <Stack.Screen name="DespesaForm" component={DespesaFormScreen} options={{ title: 'Lançar Despesa', headerStyle: { backgroundColor: COLORS.modDespesas } }} />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <MaterialCommunityIcons name="greenhouse" size={80} color={COLORS.primary} style={{ marginBottom: 20, opacity: 0.9 }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 20, color: COLORS.textSecondary, fontWeight: '700', fontSize: 16, letterSpacing: 1 }}>
            A CARREGAR SGE...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};