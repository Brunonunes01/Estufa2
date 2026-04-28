// src/navigation/RootNavigator.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions, NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { useThemeMode } from '../hooks/useThemeMode';
import { COLORS, RADIUS } from '../constants/theme';

// Importação dos ecrãs
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen';
import SettingsScreen from '../screens/Configuracoes/SettingsScreen';
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';
import EstufaDetailScreen from '../screens/Estufas/EstufaDetailScreen';
import EstufaHistoryScreen from '../screens/Estufas/EstufaHistoryScreen';
import PlantioFormScreen from '../screens/Plantios/PlantioFormScreen';
import PlantioDetailScreen from '../screens/Plantios/PlantioDetailScreen';
import PlantioHistoryScreen from '../screens/Plantios/PlantioHistoryScreen';
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
import RelatoriosScreen from '../screens/Financeiro/RelatoriosScreen';
import RelatorioOperacionalScreen from '../screens/Financeiro/RelatorioOperacionalScreen';
import TarefasScreen from '../screens/Tarefas/TarefasScreen';
import WizardSelectPlantioScreen from '../screens/Wizards/WizardSelectPlantioScreen';
import WizardSelectActivityScreen from '../screens/Wizards/WizardSelectActivityScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// --- BANNER OFFLINE ---
const OfflineBanner = () => {
  const netInfo = useNetInfo();
  const [showReconnected, setShowReconnected] = useState(false);
  const prevConnection = useRef<boolean | null>(null);

  useEffect(() => {
    if (typeof netInfo.isConnected !== 'boolean') return;

    if (prevConnection.current === false && netInfo.isConnected === true) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2800);
      prevConnection.current = netInfo.isConnected;
      return () => clearTimeout(timer);
    }

    prevConnection.current = netInfo.isConnected;
  }, [netInfo.isConnected]);

  if (netInfo.type !== 'unknown' && netInfo.isConnected === false) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.warning }}>
        <View style={styles.offlineBannerContainer}>
          <MaterialCommunityIcons name="wifi-off" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <Text style={styles.offlineBannerText}>
            Sem conexão. Trabalhando offline. Os dados serão sincronizados quando a internet voltar.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showReconnected) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.success }}>
        <View style={[styles.offlineBannerContainer, styles.onlineBannerContainer]}>
          <MaterialCommunityIcons name="wifi-check" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <Text style={styles.offlineBannerText}>Conexão restabelecida. Sincronizando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

const HomeButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Dashboard')} 
      style={{ marginRight: 15, padding: 5 }}
    >
      <MaterialCommunityIcons name="home-outline" size={26} color={COLORS.textLight} />
    </TouchableOpacity>
  );
};

const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: COLORS.secondary },
    headerTintColor: COLORS.textLight,
    headerTitleStyle: { fontWeight: '800', fontSize: 17 },
    headerTitleAlign: 'center', 
    headerShadowVisible: false,
    headerBackTitle: '', 
    animation: 'slide_from_right', 
    headerRight: () => <HomeButton />, 
};

const AuthStack = () => (
  <Stack.Navigator id="auth-stack" screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator id="app-stack" screenOptions={defaultScreenOptions}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false, animation: 'fade' }} />
    <Stack.Screen name="ShareAccount" component={ShareAccountScreen} options={{ title: 'Compartilhar Acesso' }} />
    <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Minha Propriedade' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
    <Stack.Screen name="EstufasList" component={EstufasListScreen} options={{ title: 'Hubs de Estufa' }} />
    <Stack.Screen name="EstufaForm" component={EstufaFormScreen} options={{ title: 'Cadastro da Estufa' }} />
    <Stack.Screen name="EstufaDetail" component={EstufaDetailScreen} options={{ title: 'Detalhes da Estufa' }} />
    <Stack.Screen name="EstufaHistory" component={EstufaHistoryScreen} options={{ title: 'Histórico da Estufa' }} />
    <Stack.Screen name="PlantioForm" component={PlantioFormScreen} options={{ title: 'Novo Plantio' }} />
    <Stack.Screen name="PlantioDetail" component={PlantioDetailScreen} options={{ title: 'Painel do Ciclo' }} />
    <Stack.Screen name="PlantioHistory" component={PlantioHistoryScreen} options={{ title: 'Histórico do Ciclo' }} />
    <Stack.Screen name="ManejoForm" component={ManejoFormScreen} options={{ title: 'Registro de Manejo' }} />
    <Stack.Screen name="ManejosHistory" component={ManejosHistoryScreen} options={{ title: 'Diário de Manejo' }} />
    <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Registrar Venda' }} />
    <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Relatórios de Vendas' }} />
    <Stack.Screen name="ContasReceber" component={ContasReceberScreen} options={{ title: 'Contas a Receber' }} />
    <Stack.Screen name="AplicacaoForm" component={AplicacaoFormScreen} options={{ title: 'Aplicação' }} />
    <Stack.Screen name="AplicacoesHistory" component={AplicacoesHistoryScreen} options={{ title: 'Histórico de Aplicações' }} />
    <Stack.Screen name="InsumosList" component={InsumosListScreen} options={{ title: 'Estoque de Insumos' }} />
    <Stack.Screen name="InsumoForm" component={InsumoFormScreen} options={{ title: 'Cadastro de Insumo' }} />
    <Stack.Screen name="InsumoEntry" component={InsumoEntryScreen} options={{ title: 'Entrada de Estoque' }} />
    <Stack.Screen name="FornecedoresList" component={FornecedoresListScreen} options={{ title: 'Fornecedores' }} />
    <Stack.Screen name="FornecedorForm" component={FornecedorFormScreen} options={{ title: 'Cadastro de Fornecedor' }} />
    <Stack.Screen name="ClientesList" component={ClientesListScreen} options={{ title: 'Clientes' }} />
    <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cadastro de Cliente' }} />
    <Stack.Screen name="DespesasList" component={DespesasListScreen} options={{ title: 'Despesas' }} />
    <Stack.Screen name="DespesaForm" component={DespesaFormScreen} options={{ title: 'Lançar Despesa' }} />
    <Stack.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'BI & Relatórios' }} />
    <Stack.Screen name="RelatorioOperacional" component={RelatorioOperacionalScreen} options={{ title: 'Relatório Operacional' }} />
    <Stack.Screen name="Tarefas" component={TarefasScreen} options={{ title: 'Tarefas Agrícolas' }} />
    {/* Wizard Screens */}
    <Stack.Screen name="WizardSelectPlantio" component={WizardSelectPlantioScreen} options={{ title: 'Passo 1: Selecionar Ciclo' }} />
    <Stack.Screen name="WizardSelectActivity" component={WizardSelectActivityScreen} options={{ title: 'Passo 2: Escolher Atividade' }} />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { user, loading } = useAuth();
  const mode = useThemeMode();
  
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
    <View style={[styles.outerContainer, { backgroundColor: isWideScreen ? COLORS.backgroundAlt : mode.pageBackground }]}>
      <View style={[
        styles.innerContainer, 
        {
          width: isWideScreen ? 500 : '100%',
          elevation: isWideScreen ? 10 : 0,
          borderRadius: isWideScreen ? RADIUS.xl : 0,
          borderWidth: isWideScreen ? 1 : 0,
          backgroundColor: mode.pageBackground,
        }
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
    borderColor: COLORS.border,
    // Sombra para Web
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
    fontSize: 13,
    letterSpacing: 1.5
  },
  offlineBannerContainer: {
    backgroundColor: COLORS.warning, 
    paddingVertical: 10,
    paddingHorizontal: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 10 : 10
  },
  onlineBannerContainer: {
    backgroundColor: COLORS.success,
  },
  offlineBannerText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center'
  }
});
