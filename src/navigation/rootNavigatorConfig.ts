import { MainTabParamList, RootStackParamList } from './types';

export type ProductionMode = 'ciclo_longo';

type NavigateFn = (screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) => void;

export type QuickActionConfig = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

export const getOperationTabTitle = (_activeMode: ProductionMode) => 'Estufas';

export const getMainTabIconMap = (_activeMode: ProductionMode): Record<keyof MainTabParamList, string> => ({
  InicioTab: 'view-dashboard-outline',
  OperacaoTab: 'greenhouse',
  EstoqueTab: 'warehouse',
  FinanceiroTab: 'cash-multiple',
  PerfilTab: 'account-circle-outline',
});

export const buildQuickActions = (_activeMode: ProductionMode, navigate: NavigateFn): QuickActionConfig[] => {
  return [
    { key: 'qa-plantio', label: 'Novo plantio', icon: 'sprout', onPress: () => navigate('PlantioForm') },
    { key: 'qa-manejo', label: 'Novo manejo', icon: 'clipboard-pulse-outline', onPress: () => navigate('WizardSelectPlantio') },
    { key: 'qa-stock-entry', label: 'Entrada de insumo', icon: 'warehouse', onPress: () => navigate('InsumoEntry') },
    { key: 'qa-sale', label: 'Registrar venda', icon: 'cash-plus', onPress: () => navigate('MainTabs', { screen: 'FinanceiroTab' }) },
    { key: 'qa-task', label: 'Nova tarefa', icon: 'clipboard-text-plus-outline', onPress: () => navigate('Tarefas') },
  ];
};
