import { MainTabParamList, RootStackParamList } from './types';

export type ProductionMode = 'ciclo_longo' | 'campo' | 'hidroponia';

type NavigateFn = (screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) => void;

export type QuickActionConfig = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

export const getOperationTabTitle = (activeMode: ProductionMode) => {
  if (activeMode === 'hidroponia') return 'Hidroponia';
  if (activeMode === 'campo') return 'Campo';
  return 'Estufas';
};

export const getMainTabIconMap = (activeMode: ProductionMode): Record<keyof MainTabParamList, string> => ({
  InicioTab: 'view-dashboard-outline',
  OperacaoTab: activeMode === 'hidroponia' ? 'water-outline' : activeMode === 'campo' ? 'tractor-variant' : 'greenhouse',
  EstoqueTab: 'warehouse',
  FinanceiroTab: 'cash-multiple',
  PerfilTab: 'account-circle-outline',
});

export const buildQuickActions = (activeMode: ProductionMode, navigate: NavigateFn): QuickActionConfig[] => {
  if (activeMode === 'hidroponia') {
    return [
      { key: 'qa-hydro-read', label: 'Leitura pH/EC', icon: 'test-tube', onPress: () => navigate('HidroponiaLeituraForm') },
      { key: 'qa-hydro-lote', label: 'Novo lote', icon: 'sprout-outline', onPress: () => navigate('HidroponiaLoteForm') },
      { key: 'qa-stock-entry', label: 'Entrada de insumo', icon: 'warehouse', onPress: () => navigate('InsumoEntry') },
      { key: 'qa-sale', label: 'Registrar venda', icon: 'cash-plus', onPress: () => navigate('MainTabs', { screen: 'FinanceiroTab' }) },
      { key: 'qa-task', label: 'Nova tarefa', icon: 'clipboard-text-plus-outline', onPress: () => navigate('Tarefas') },
    ];
  }

  if (activeMode === 'campo') {
    return [
      { key: 'qa-talhao', label: 'Novo talhão', icon: 'map-marker-plus-outline', onPress: () => navigate('TalhoesList') },
      { key: 'qa-plantio', label: 'Novo plantio', icon: 'sprout', onPress: () => navigate('PlantioForm') },
      { key: 'qa-stock-entry', label: 'Entrada de insumo', icon: 'warehouse', onPress: () => navigate('InsumoEntry') },
      { key: 'qa-sale', label: 'Registrar venda', icon: 'cash-plus', onPress: () => navigate('MainTabs', { screen: 'FinanceiroTab' }) },
      { key: 'qa-task', label: 'Nova tarefa', icon: 'clipboard-text-plus-outline', onPress: () => navigate('Tarefas') },
    ];
  }

  return [
    { key: 'qa-plantio', label: 'Novo plantio', icon: 'sprout', onPress: () => navigate('PlantioForm') },
    { key: 'qa-manejo', label: 'Novo manejo', icon: 'clipboard-pulse-outline', onPress: () => navigate('WizardSelectPlantio') },
    { key: 'qa-stock-entry', label: 'Entrada de insumo', icon: 'warehouse', onPress: () => navigate('InsumoEntry') },
    { key: 'qa-sale', label: 'Registrar venda', icon: 'cash-plus', onPress: () => navigate('MainTabs', { screen: 'FinanceiroTab' }) },
    { key: 'qa-task', label: 'Nova tarefa', icon: 'clipboard-text-plus-outline', onPress: () => navigate('Tarefas') },
  ];
};
