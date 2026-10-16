import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import ModuleGridItem from '../../components/dashboard/ModuleGridItem';
import HeroStats from '../../components/dashboard/HeroStats';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import SectionHeading from '../../components/ui/SectionHeading';
import AlertsList from '../../components/dashboard/AlertsList';
import TodayTasks from '../../components/dashboard/TodayTasks';
import QuickActions from '../../components/dashboard/QuickActions';
import { updateTarefaStatus } from '../../services/tarefaAgricolaService';
import { RootStackParamList } from '../../navigation/types';
import { formatDateSafe } from '../../utils/date';

// Modular Components
import DashboardTenantSwitcher from './components/DashboardTenantSwitcher';
import DashboardWizardButton from './components/DashboardWizardButton';

type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Dashboard'
>;

const DashboardScreen = ({ navigation }: DashboardScreenProps) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError } = useFeedback();
  const { accessRoleLabel, canWrite } = useAuth();
  const { settings } = useAppSettings();
  const isCampoMode = settings.activeProductionMode === 'campo';

  const {
    user,
    selectedTenantId,
    changeTenant,
    availableTenants,
    estufas,
    todayTasks,
    tarefasHojePendentes,
    totalCiclosAtivos,
    summarySource,
    summaryUpdatedAt,
    isError,
    refetchResumo,
    criticalAlerts,
  } = useDashboardMetrics();
  const auditActor = useMemo(
    () =>
      user?.uid
        ? { uid: user.uid, name: user.displayName || user.name || null }
        : null,
    [user?.displayName, user?.name, user?.uid]
  );

  useEffect(() => {
    if (isError)
      showError('Não foi possível carregar os indicadores do painel.');
  }, [isError, showError]);

  const navigateTo = useCallback(
    (
      screen: keyof RootStackParamList,
      params?: RootStackParamList[keyof RootStackParamList]
    ) =>
      navigation.dispatch(
        CommonActions.navigate({
          name: screen as string,
          params: (params || undefined) as any,
        })
      ),
    [navigation]
  );

  const quickActions = useMemo(() => {
    const base = [
      {
        label: 'Colher/Vender',
        subtitle: 'Saída de estoque',
        icon: 'basket',
        color: COLORS.success,
        onPress: () => navigateTo('EstufasList', { mode: 'colheita' }),
      },
      {
        label: 'Novo Manejo',
        subtitle: 'Atividade agrícola',
        icon: 'notebook-plus-outline',
        color: COLORS.info,
        onPress: () => navigateTo('EstufasList', { mode: 'manejo' }),
      },
      {
        label: 'Nova Despesa',
        subtitle: 'Lançamento financeiro',
        icon: 'cash-minus',
        color: COLORS.danger,
        onPress: () => navigateTo('DespesaForm'),
      },
      {
        label: 'Recebimentos',
        subtitle: 'Baixa no financeiro',
        icon: 'hand-coin',
        color: COLORS.primary,
        onPress: () =>
          navigateTo('MainTabs', {
            screen: 'FinanceiroTab',
            params: { filter: 'receber' },
          }),
      },
    ];
    return base;
  }, [navigateTo]);

  const modules = useMemo(
    () => [
      {
        label: 'Financeiro',
        icon: 'cash-multiple',
        color: COLORS.modFinanceiro,
        onPress: () => navigateTo('MainTabs', { screen: 'FinanceiroTab' }),
      },
      {
        label: 'Operação',
        icon: 'greenhouse',
        color: COLORS.success,
        onPress: () => navigateTo('MainTabs', { screen: 'OperacaoTab' }),
        subtitle:  isCampoMode
            ? 'Campo'
            : 'Estufas',
      },
      {
        label: 'Estoque',
        icon: 'warehouse',
        color: COLORS.primaryDark,
        onPress: () => navigateTo('MainTabs', { screen: 'EstoqueTab' }),
      },
      {
        label: 'Relatórios',
        icon: 'chart-box-outline',
        color: COLORS.primary,
        onPress: () => navigateTo('Relatorios'),
      },
      {
        label: 'Clientes',
        icon: 'account-group-outline',
        color: COLORS.info,
        onPress: () => navigateTo('ClientesList'),
      },
      {
        label: 'Ajustes',
        icon: 'cog-outline',
        color: COLORS.secondary,
        onPress: () => navigateTo('Settings'),
      },
    ],
    [isCampoMode, navigateTo]
  );

  const handleCompleteTask = async (taskId: string) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    try {
      await updateTarefaStatus(taskId, 'concluida', targetId, {
        actor: auditActor,
      });
      await refetchResumo();
    } catch {
      showError('Não foi possível concluir a tarefa.');
    }
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: 20 }}>
      <DashboardTenantSwitcher
        tenants={availableTenants}
        selectedTenantId={selectedTenantId}
        onChangeTenant={changeTenant}
        theme={theme}
      />

      {canWrite && (
        <DashboardWizardButton
          label={
            isCampoMode
              ? 'Registrar atividade no talhão'
              : 'Registrar Atividade do Dia'
          }
          onPress={() => navigateTo('WizardSelectPlantio')}
        />
      )}

      <View style={[styles.infoStrip, { backgroundColor: theme.surfaceMuted }]}>
        <MaterialCommunityIcons
          name="database-sync-outline"
          size={14}
          color={theme.textSecondary}
        />
        <Text style={[styles.infoStripText, { color: theme.textSecondary }]}>
          {summarySource === 'summary_doc'
            ? `Sincronizado: ${formatDateSafe(summaryUpdatedAt)}`
            : 'Modo offline'}
        </Text>
      </View>

      <SectionHeading title="Agenda & Alertas" />
      <View
        style={[
          styles.block,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <TodayTasks
          tasks={todayTasks}
          onOpenPlantio={(id) => navigateTo('PlantioDetail', { plantioId: id })}
          onOpenTasks={() => navigateTo('Tarefas')}
          onCompleteTask={handleCompleteTask}
        />
      </View>

      <View
        style={[
          styles.block,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <AlertsList
          alerts={criticalAlerts as any}
          onOpenEstufa={(id) => navigateTo('EstufaDetail', { estufaId: id })}
        />
      </View>

      <SectionHeading title="Ações Rápidas" />
      <View
        style={[
          styles.block,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <QuickActions actions={quickActions} />
      </View>
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
            subtitle={m.subtitle || 'Acessar'}
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
          onPressAction={() =>
            navigateTo(isCampoMode ? 'TalhoesList' : 'EstufasList')
          }
        >
          <HeroStats
            estufas={estufas.length}
            plantios={totalCiclosAtivos}
            tarefasHoje={tarefasHojePendentes}
          />
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
