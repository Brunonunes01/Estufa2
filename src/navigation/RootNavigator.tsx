// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { 
  View, 
  ActivityIndicator, 
  Text, 
  StatusBar, 
  TouchableOpacity, 
  Platform, 
  SafeAreaView, 
  Dimensions, 
  StyleSheet 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';

import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../constants/theme';

// Importação dos ecrãs
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen';
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
import ManejoFormScreen from '../screens/Manejos/ManejoFormScreen';
import ManejosHistoryScreen from '../screens/Manejos/ManejosHistoryScreen';

const Stack = createNativeStackNavigator();

// --- BANNER OFFLINE ---
const OfflineBanner = () => {
  const netInfo = useNetInfo();
  if (netInfo.type !== 'unknown' && netInfo.isConnected === false) {
    return (
      <SafeAreaView style={{ backgroundColor: '#F59E0B' }}>
        <View style={styles.offlineBannerContainer}>
          <MaterialCommunityIcons name="wifi-off" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.offlineBannerText}>
            Modo Offline: Sincronização pendente
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  return null;
};

const HomeButton = () => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Dashboard')} 
      style={{ marginRight: 15, padding: 5 }}
    >
      <MaterialCommunityIcons name="home-outline" size={26} color="#FFF" />
    </TouchableOpacity>
  );
};

const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: COLORS.primary },
    headerTintColor: COLORS.textLight,
    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    headerTitleAlign: 'center', 
    headerShadowVisible: false, 
    headerBackTitle: '', 
    animation: 'slide_from_right', 
    headerRight: () => <HomeButton />, 
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
    <Stack.Screen name="ManejoForm" component={ManejoFormScreen} options={{ title: 'Registo de Manejo' }} />
    <Stack.Screen name="ManejosHistory" component={ManejosHistoryScreen} options={{ title: 'Diário de Manejo' }} />
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
  
  // Lógica para detetar se é Web e calcular largura
  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;
  const isWideScreen = isWeb && screenWidth > 500;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <MaterialCommunityIcons name="greenhouse" size={80} color={COLORS.primary} style={{ marginBottom: 20, opacity: 0.9 }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A CARREGAR SGE...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: isWideScreen ? '#f0f2f5' : COLORS.background }]}>
      <View style={[
        styles.innerContainer, 
        { width: isWideScreen ? 500 : '100%', elevation: isWideScreen ? 10 : 0 }
      ]}>
        <OfflineBanner />
        <NavigationContainer>
          {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    // Sombra para Web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 20,
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1
  },
  offlineBannerContainer: {
    backgroundColor: '#F59E0B', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 10 : 10
  },
  offlineBannerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center'
  }
});