import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import DashboardLoadingSkeleton from '../../components/dashboard/DashboardLoadingSkeleton';
import ModuleGridItem from '../../components/dashboard/ModuleGridItem';
import HeroStats from '../../components/dashboard/HeroStats';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import SectionHeading from '../../components/ui/SectionHeading';
import MoneyGrid from '../../components/dashboard/MoneyGrid';
import AlertsList from '../../components/dashboard/AlertsList';
import TodayTasks from '../../components/dashboard/TodayTasks';
import QuickActions from '../../components/dashboard/QuickActions';
import { updateTarefaStatus } from '../../services/tarefaAgricolaService';
import { RootStackParamList } from '../../navigation/types';
import { formatDateSafe } from '../../utils/date';

// Modular Components
import DashboardPriorityCallout from './components/DashboardPriorityCallout';
import DashboardFocusMetrics from './components/DashboardFocusMetrics';
import DashboardTenantSwitcher from './components/DashboardTenantSwitcher';
import DashboardWizardButton from './components/DashboardWizardButton';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen = ({ navigation }: DashboardScreenProps) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError } = useFeedback();
  const { accessRoleLabel, canViewFinancialDashboard, canWrite } = useAuth();
  const { settings } = useAppSettings();
  const isHydroMode = settings.activeProductionMode === 'hidroponia';
  const isCampoMode = settings.activeProductionMode === 'campo';

  const {
    user,
    selectedTenantId,
    changeTenant,
    availableTenants,
    estufas,
    todayTasks,
    totalReceber,
    totalRecebido,
    totalPagar,
    tarefasHojePendentes,
    totalCiclosAtivos,
    summarySource,
    summaryUpdatedAt,
    loadingResumo,
    isError,
    refetchResumo,
    criticalAlerts,
    lucroTotal,
    roiGeral,
  } = useDashboardMetrics();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os indicadores do painel.');
  }, [isError, showError]);

  const navigateTo = useCallback(
    (screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) =>
      navigation.dispatch(CommonActions.navigate({ name: screen as string, params: (params || undefined) as any })),
    [navigation]
  );

  const priorityData = useMemo(() => {
    if (criticalAlerts.length > 0) {
      return {
        tone: 'danger' as const,
        title: `${criticalAlerts.length} alerta(s) de risco`,
        subtitle: 'Abra as unidades com risco para evitar perdas na produção.',
        cta: 'Ver alertas',
        icon: 'alert-circle-outline',
        onPress: () => navigateTo('EstufasList'),
      };
    }
    if (tarefasHojePendentes > 0) {
      return {
        tone: 'warning' as const,
        title: `${tarefasHojePendentes} tarefa(s) hoje`,
        subtitle: 'Concluir a agenda do dia ajuda a manter o painel organizado.',
        cta: 'Ver agenda',
        icon: 'calendar-clock-outline',
        onPress: () => navigateTo('Tarefas'),
      };
    }
    return {
      tone: 'success' as const,
      title: 'Operação sob controle',
      subtitle: 'Sem urgências agora. Use o assistente para registrar novas atividades.',
      cta: 'Abrir assistente',
      icon: 'check-decagram-outline',
      onPress: () => navigateTo('WizardSelectPlantio'),
    };
  }, [criticalAlerts.length, tarefasHojePendentes, navigateTo]);

  const focusMetrics = useMemo(() => [
    { key: 'tasks', label: 'Pendências', value: String(tarefasHojePendentes), tone: tarefasHojePendentes > 0 ? 'warning' : 'neutral' as const },
    { key: 'alerts', label: 'Alertas', value: String(criticalAlerts.length), tone: criticalAlerts.length > 0 ? 'danger' : 'neutral' as const },
    { 
      key: 'cash', 
      label: canViewFinancialDashboard ? 'Previsão' : 'Ativos', 
      value: canViewFinancialDashboard ? currencyFormatter.format(totalRecebido + totalReceber - totalPagar) : String(totalCiclosAtivos),
      tone: (canViewFinancialDashboard && (totalRecebido + totalReceber - totalPagar < 0)) ? 'danger' : 'neutral' as const 
    },
  ], [tarefasHojePendentes, criticalAlerts.length, canViewFinancialDashboard, totalRecebido, totalReceber, totalPagar, totalCiclosAtivos]);

  const quickActions = useMemo(() => {
    const base = [
      { label: 'Colher/Vender', subtitle: 'Saída de estoque', icon: 'basket', color: COLORS.success, onPress: () => navigateTo('EstufasList', { mode: 'colheita' }) },
      { label: 'Novo Manejo', subtitle: 'Atividade agrícola', icon: 'notebook-plus-outline', color: COLORS.info, onPress: () => navigateTo('EstufasList', { mode: 'manejo' }) },
      { label: 'Nova Despesa', subtitle: 'Lançamento financeiro', icon: 'cash-minus', color: COLORS.danger, onPress: () => navigateTo('DespesaForm') },
      { label: 'Recebimentos', subtitle: 'Contas a receber', icon: 'hand-coin', color: COLORS.primary, onPress: () => navigateTo('ContasReceber') },
    ];
    if (isHydroMode) {
      base.unshift({ label: 'Iniciar Lote', subtitle: 'Novo ciclo hidro', icon: 'sprout', color: COLORS.primaryDark, onPress: () => navigateTo('HidroponiaLoteForm') });
    }
    return base;
  }, [isHydroMode, navigateTo]);

  const modules = useMemo(() => [
    { label: 'Financeiro', icon: 'cash-multiple', color: COLORS.modFinanceiro, onPress: () => navigateTo('MainTabs', { screen: 'FinanceiroTab' }) },
    { label: 'Operação', icon: isHydroMode ? 'water-outline' : 'greenhouse', color: COLORS.success, onPress: () => navigateTo('MainTabs', { screen: 'OperacaoTab' }), subtitle: isHydroMode ? 'Hidroponia' : isCampoMode ? 'Campo' : 'Estufas' },
    { label: 'Estoque', icon: 'warehouse', color: COLORS.primaryDark, onPress: () => navigateTo('MainTabs', { screen: 'EstoqueTab' }) },
    { label: 'Relatórios', icon: 'chart-box-outline', color: COLORS.primary, onPress: () => navigateTo('Relatorios') },
    { label: 'Clientes', icon: 'account-group-outline', color: COLORS.info, onPress: () => navigateTo('ClientesList') },
    { label: 'Ajustes', icon: 'cog-outline', color: COLORS.secondary, onPress: () => navigateTo('Settings') },
  ], [isHydroMode, isCampoMode, navigateTo]);

  const handleCompleteTask = async (taskId: string) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    try {
      await updateTarefaStatus(taskId, 'concluida', targetId);
      await refetchResumo();
    } catch {
      showError('Não foi possível concluir a tarefa.');
    }
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: 20 }}>
      <DashboardPriorityCallout priority={priorityData} />
      <DashboardFocusMetrics metrics={focusMetrics} theme={theme} />
      
      <DashboardTenantSwitcher 
        tenants={availableTenants} 
        selectedTenantId={selectedTenantId} 
        onChangeTenant={changeTenant} 
        theme={theme} 
      />

      {canWrite && (
        <DashboardWizardButton 
          label={isCampoMode ? 'Registrar atividade no talhão' : 'Registrar Atividade do Dia'} 
          onPress={() => navigateTo('WizardSelectPlantio')} 
        />
      )}

      <View style={[styles.infoStrip, { backgroundColor: theme.surfaceMuted }]}>
        <MaterialCommunityIcons name="database-sync-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.infoStripText, { color: theme.textSecondary }]}>
          {summarySource === 'summary_doc' ? `Sincronizado: ${formatDateSafe(summaryUpdatedAt)}` : 'Modo offline'}
        </Text>
      </View>

      <SectionHeading title="Agenda & Alertas" />
      <View style={[styles.block, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <TodayTasks 
          tasks={todayTasks} 
          onOpenPlantio={(id) => navigateTo('PlantioDetail', { plantioId: id })} 
          onOpenTasks={() => navigateTo('Tarefas')} 
          onCompleteTask={handleCompleteTask} 
        />
      </View>

      <View style={[styles.block, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <AlertsList alerts={criticalAlerts as any} onOpenEstufa={(id) => navigateTo('EstufaDetail', { estufaId: id })} />
      </View>

      <SectionHeading title="Ações Rápidas" />
      <View style={[styles.block, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <QuickActions actions={quickActions} />
      </View>

      {canViewFinancialDashboard && (
        loadingResumo ? <DashboardLoadingSkeleton /> : (
          <MoneyGrid 
            totalReceber={totalReceber} 
            totalRecebido={totalRecebido} 
            totalPagar={totalPagar} 
            lucroTotal={lucroTotal} 
            roiGeral={roiGeral} 
          />
        )
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={{ marginTop: 10, paddingBottom: insets.bottom + 60 }}>
      <SectionHeading title="Módulos de Gestão" />
      <View style={styles.modulesGrid}>
        {modules.map((m) => (
          <ModuleGridItem 
            key={m.label} 
            title={m.label} 
            subtitle={m.subtitle || "Acessar"} 
            icon={m.icon} 
            color={m.color} 
            onPress={m.onPress} 
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar barStyle="light-content" translucent />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeaderCard
          title="Painel de Controle"
          subtitle={`Olá, ${user?.displayName?.split(' ')[0] || 'Produtor'}`}
          badgeLabel={accessRoleLabel}
          actionLabel="Mapa"
          actionIcon="map-outline"
          onPressAction={() => navigateTo(isCampoMode ? 'TalhoesList' : 'EstufasList')}
        >
          <HeroStats estufas={estufas.length} plantios={totalCiclosAtivos} tarefasHoje={tarefasHojePendentes} />
        </ScreenHeaderCard>

        <FlatList
          data={[]}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={() => null}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: 16 },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoStripText: { fontSize: 11, fontWeight: '700' },
  block: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
  },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

export default DashboardScreen;
