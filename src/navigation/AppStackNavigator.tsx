import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ShareAccountScreen from '../screens/Auth/ShareAccountScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen';
import SettingsScreen from '../screens/Configuracoes/SettingsScreen';
import EstufasListScreen from '../screens/Estufas/EstufasListScreen';
import EstufaFormScreen from '../screens/Estufas/EstufaFormScreen';
import EstufaDetailScreen from '../screens/Estufas/EstufaDetailScreen';
import EstufaHistoryScreen from '../screens/Estufas/EstufaHistoryScreen';
import VendasListScreen from '../screens/Vendas/VendasListScreen';
import ContasReceberScreen from '../screens/Financeiro/ContasReceberScreen';
import InsumosListScreen from '../screens/Insumos/InsumosListScreen';
import InsumoFormScreen from '../screens/Insumos/InsumoFormScreen';
import InsumoEntryScreen from '../screens/Insumos/InsumoEntryScreen';
import FornecedoresListScreen from '../screens/Fornecedores/FornecedoresListScreen';
import FornecedorFormScreen from '../screens/Fornecedores/FornecedorFormScreen';
import ClientesListScreen from '../screens/Clientes/ClientesListScreen';
import ClienteFormScreen from '../screens/Clientes/ClienteFormScreen';
import DespesasListScreen from '../screens/Despesas/DespesasListScreen';
import DespesaFormScreen from '../screens/Despesas/DespesaFormScreen';
import CaixaResumoScreen from '../screens/Caixa/CaixaResumoScreen';
import CaixaExtratoScreen from '../screens/Caixa/CaixaExtratoScreen';
import ManejoFormScreen from '../screens/Manejos/ManejoFormScreen';
import ManejosHistoryScreen from '../screens/Manejos/ManejosHistoryScreen';
import RelatoriosScreen from '../screens/Financeiro/RelatoriosScreen';
import RelatorioOperacionalScreen from '../screens/Financeiro/RelatorioOperacionalScreen';
import CaixasPesoCicloScreen from '../screens/Financeiro/CaixasPesoCicloScreen';
import TarefasScreen from '../screens/Tarefas/TarefasScreen';
import TalhoesListScreen from '../screens/Campo/TalhoesListScreen';
import PlantioFormScreen from '../screens/Plantios/PlantioFormScreen';
import PlantioDetailScreen from '../screens/Plantios/PlantioDetailScreen';
import PlantioHistoryScreen from '../screens/Plantios/PlantioHistoryScreen';
import ColheitaFormScreen from '../screens/Colheitas/ColheitaFormScreen';
import AplicacaoFormScreen from '../screens/Aplicacoes/AplicacaoFormScreen';
import AplicacoesHistoryScreen from '../screens/Aplicacoes/AplicacoesHistoryScreen';
import WizardSelectPlantioScreen from '../screens/Wizards/WizardSelectPlantioScreen';
import WizardSelectActivityScreen from '../screens/Wizards/WizardSelectActivityScreen';
import HidroponiaLotesScreen from '../modules/hidroponia/screens/HidroponiaLotesScreen';
import HidroponiaEstufaLayoutScreen from '../modules/hidroponia/screens/HidroponiaEstufaLayoutScreen';
import HidroponiaMotoresScreen from '../modules/hidroponia/screens/HidroponiaMotoresScreen';
import HidroponiaLoteFormScreen from '../modules/hidroponia/screens/HidroponiaLoteFormScreen';
import HidroponiaLoteDetailScreen from '../modules/hidroponia/screens/HidroponiaLoteDetailScreen';
import HidroponiaMovimentarLoteScreen from '../modules/hidroponia/screens/HidroponiaMovimentarLoteScreen';
import HidroponiaLeituraFormScreen from '../modules/hidroponia/screens/HidroponiaLeituraFormScreen';
import HidroponiaVendaFormScreen from '../modules/hidroponia/screens/HidroponiaVendaFormScreen';
import HidroponiaColheitaFormScreen from '../modules/hidroponia/screens/HidroponiaColheitaFormScreen';
import HidroponiaVerdurasScreen from '../modules/hidroponia/screens/HidroponiaVerdurasScreen';
import { COLORS } from '../constants/theme';
import { ProductionMode } from './rootNavigatorConfig';
import { RootStackParamList } from './types';
import { MainTabsNavigator } from './MainTabsNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'InicioTab' })} style={{ marginRight: 15, padding: 5 }}>
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

export const AppStackNavigator = ({
  activeMode,
  uiV2Enabled,
}: {
  activeMode: ProductionMode;
  uiV2Enabled: boolean;
}) => (
  <Stack.Navigator id="app-stack" screenOptions={defaultScreenOptions}>
    <Stack.Screen name="MainTabs" options={{ headerShown: false, animation: 'fade' }}>
      {() => <MainTabsNavigator activeMode={activeMode} uiV2Enabled={uiV2Enabled} />}
    </Stack.Screen>

    <Stack.Screen name="ShareAccount" component={ShareAccountScreen} options={{ title: 'Compartilhar Acesso' }} />
    <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Minha Propriedade' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
    <Stack.Screen name="EstufasList" component={EstufasListScreen} options={{ title: 'Hubs de Estufa' }} />
    <Stack.Screen name="EstufaForm" component={EstufaFormScreen} options={{ title: 'Cadastro da Estufa' }} />
    <Stack.Screen name="EstufaDetail" component={EstufaDetailScreen} options={{ title: 'Detalhes da Estufa' }} />
    <Stack.Screen name="EstufaHistory" component={EstufaHistoryScreen} options={{ title: 'Histórico da Estufa' }} />
    <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Relatórios de Vendas' }} />
    <Stack.Screen name="ContasReceber" component={ContasReceberScreen} options={{ title: 'Contas a Receber' }} />
    <Stack.Screen name="HidroponiaVendaForm" component={HidroponiaVendaFormScreen} options={{ title: 'Venda Hidroponia' }} />
    <Stack.Screen name="InsumosList" component={InsumosListScreen} options={{ title: 'Estoque de Insumos' }} />
    <Stack.Screen name="InsumoForm" component={InsumoFormScreen} options={{ title: 'Cadastro de Insumo' }} />
    <Stack.Screen name="InsumoEntry" component={InsumoEntryScreen} options={{ title: 'Entrada de Estoque' }} />
    <Stack.Screen name="FornecedoresList" component={FornecedoresListScreen} options={{ title: 'Fornecedores' }} />
    <Stack.Screen name="FornecedorForm" component={FornecedorFormScreen} options={{ title: 'Cadastro de Fornecedor' }} />
    <Stack.Screen name="ClientesList" component={ClientesListScreen} options={{ title: 'Clientes' }} />
    <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cadastro de Cliente' }} />
    <Stack.Screen name="DespesasList" component={DespesasListScreen} options={{ title: 'Despesas' }} />
    <Stack.Screen name="DespesaForm" component={DespesaFormScreen} options={{ title: 'Lançar Despesa' }} />
    <Stack.Screen name="CaixaResumo" component={CaixaResumoScreen} options={{ title: 'Caixa - Resumo' }} />
    <Stack.Screen name="CaixaExtrato" component={CaixaExtratoScreen} options={{ title: 'Caixa - Extrato' }} />
    <Stack.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'BI & Relatórios' }} />
    <Stack.Screen name="RelatorioOperacional" component={RelatorioOperacionalScreen} options={{ title: 'Relatório Operacional' }} />
    <Stack.Screen name="CaixasPesoCiclo" component={CaixasPesoCicloScreen} options={{ title: 'Caixas e Peso por Ciclo' }} />
    <Stack.Screen name="Tarefas" component={TarefasScreen} options={{ title: 'Tarefas Agrícolas' }} />
    <Stack.Screen name="TalhoesList" component={TalhoesListScreen} options={{ title: 'Talhões de Campo' }} />

    {activeMode !== 'hidroponia' ? (
      <>
        <Stack.Screen name="PlantioForm" component={PlantioFormScreen} options={{ title: 'Novo Plantio' }} />
        <Stack.Screen name="PlantioDetail" component={PlantioDetailScreen} options={{ title: 'Painel do Ciclo' }} />
        <Stack.Screen name="PlantioHistory" component={PlantioHistoryScreen} options={{ title: 'Histórico do Ciclo' }} />
        <Stack.Screen name="ManejoForm" component={ManejoFormScreen} options={{ title: 'Registro de Manejo' }} />
        <Stack.Screen name="ManejosHistory" component={ManejosHistoryScreen} options={{ title: 'Diário de Manejo' }} />
        <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Registrar Venda' }} />
        <Stack.Screen name="AplicacaoForm" component={AplicacaoFormScreen} options={{ title: 'Aplicação' }} />
        <Stack.Screen name="AplicacoesHistory" component={AplicacoesHistoryScreen} options={{ title: 'Histórico de Aplicações' }} />
        <Stack.Screen name="WizardSelectPlantio" component={WizardSelectPlantioScreen} options={{ title: 'Passo 1: Selecionar Ciclo' }} />
        <Stack.Screen name="WizardSelectActivity" component={WizardSelectActivityScreen} options={{ title: 'Passo 2: Escolher Atividade' }} />
      </>
    ) : (
      <>
        <Stack.Screen name="HidroponiaEstufaLayout" component={HidroponiaEstufaLayoutScreen} options={{ title: 'Layout da Estufa' }} />
        <Stack.Screen name="HidroponiaMotores" component={HidroponiaMotoresScreen} options={{ title: 'Motores' }} />
        <Stack.Screen name="HidroponiaLotes" component={HidroponiaLotesScreen} options={{ title: 'Hidroponia' }} />
        <Stack.Screen name="HidroponiaVerduras" component={HidroponiaVerdurasScreen} options={{ title: 'Cadastro de Verduras' }} />
        <Stack.Screen name="HidroponiaLoteForm" component={HidroponiaLoteFormScreen} options={{ title: 'Iniciar Produção' }} />
        <Stack.Screen name="HidroponiaLoteDetail" component={HidroponiaLoteDetailScreen} options={{ title: 'Detalhe da Produção' }} />
        <Stack.Screen name="HidroponiaMovimentarLote" component={HidroponiaMovimentarLoteScreen} options={{ title: 'Movimentar Produção' }} />
        <Stack.Screen name="HidroponiaColheitaForm" component={HidroponiaColheitaFormScreen} options={{ title: 'Colheita Hidroponia' }} />
        <Stack.Screen name="HidroponiaLeituraForm" component={HidroponiaLeituraFormScreen} options={{ title: 'Leitura pH/CE' }} />
      </>
    )}
  </Stack.Navigator>
);
