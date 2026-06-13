import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
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
    activePlantioByEstufa,
    criticalAlerts,
    lucroTotal,
    roiGeral,
  } = useDashboardMetrics();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os indicadores do painel.');
  }, [isError, showError]);

  const navigateTo = useCallback(
    (screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) =>
      navigation.dispatch(
        CommonActions.navigate({
          name: screen as string,
          params: (params || undefined) as object | undefined,
        })
      ),
    [navigation]
  );

  const handleQuickSale = useCallback(
    (estufaId: string) => {
      const plantioAtivo = activePlantioByEstufa[estufaId];
      if (!plantioAtivo) {
        Alert.alert('Sem ciclo ativo', 'Crie um plantio nesta estufa para registrar vendas.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Plantio', onPress: () => navigateTo('PlantioForm', { estufaId }) },
        ]);
        return;
      }
      navigateTo('ColheitaForm', { plantioId: plantioAtivo.id, estufaId });
    },
    [activePlantioByEstufa, navigateTo]
  );

  const handleManejoFlow = useCallback(
    (estufaId: string) => {
      const plantioAtivo = activePlantioByEstufa[estufaId];
      if (!plantioAtivo) {
        Alert.alert('Sem ciclo ativo', 'Crie um plantio nesta estufa para registrar manejo.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Plantio', onPress: () => navigateTo('PlantioForm', { estufaId }) },
        ]);
        return;
      }
      navigateTo('ManejoForm', { plantioId: plantioAtivo.id, estufaId });
    },
    [activePlantioByEstufa, navigateTo]
  );

  const openQuickSaleFlow = useCallback(() => {
    if (isCampoMode) {
      navigateTo('WizardSelectPlantio');
      return;
    }
    if (estufas.length === 1) {
      handleQuickSale(estufas[0].id);
      return;
    }
    navigateTo('EstufasList', { mode: 'colheita' });
  }, [estufas, handleQuickSale, isCampoMode, navigateTo]);

  const openQuickManejoFlow = useCallback(() => {
    if (isCampoMode) {
      navigateTo('WizardSelectPlantio');
      return;
    }
    if (estufas.length === 1) {
      handleManejoFlow(estufas[0].id);
      return;
    }
    navigateTo('EstufasList', { mode: 'manejo' });
  }, [estufas, handleManejoFlow, isCampoMode, navigateTo]);

  const openHydroLayoutFlow = useCallback(() => {
    if (estufas.length === 1) {
      navigateTo('HidroponiaEstufaLayout', { estufaId: estufas[0].id });
      return;
    }
    navigateTo('EstufasList', { mode: 'hidro_layout' });
  }, [estufas, navigateTo]);

  const openHydroMotorFlow = useCallback(() => {
    if (estufas.length === 1) {
      navigateTo('HidroponiaMotores', { estufaId: estufas[0].id });
      return;
    }
    navigateTo('HidroponiaMotores');
  }, [estufas, navigateTo]);

  const quickActions = useMemo(() => {
    if (isHydroMode) {
      return [
        {
          label: 'Motores',
          icon: 'engine-outline',
          color: COLORS.info,
          onPress: openHydroMotorFlow,
        },
        {
          label: 'Mover bancadas',
          icon: 'swap-horizontal',
          color: COLORS.success,
          onPress: openHydroLayoutFlow,
        },
        {
          label: 'Iniciar produ\u00e7\u00e3o',
          icon: 'sprout',
          color: COLORS.primaryDark,
          onPress: () => navigateTo('HidroponiaLoteForm'),
        },
        {
          label: 'Venda hidro',
          icon: 'basket-plus-outline',
          color: COLORS.primary,
          onPress: () => navigateTo('HidroponiaLotes'),
        },
        {
          label: 'Nova Despesa',
          icon: 'cash-minus',
          color: COLORS.danger,
          onPress: () => navigateTo('DespesaForm'),
        },
        {
          label: 'Contas a Receber',
          icon: 'hand-coin',
          color: COLORS.primary,
          onPress: () => navigateTo('ContasReceber'),
        },
        {
          label: 'Tarefas',
          icon: 'calendar-check-outline',
          color: COLORS.orange,
          onPress: () => navigateTo('Tarefas'),
        },
      ];
    }

    return [
      {
        label: 'Colher / Vender',
        icon: 'basket',
        color: COLORS.success,
        onPress: openQuickSaleFlow,
      },
      {
        label: 'Novo manejo',
        icon: 'notebook-plus-outline',
        color: COLORS.info,
        onPress: openQuickManejoFlow,
      },
      {
        label: 'Nova Despesa',
        icon: 'cash-minus',
        color: COLORS.danger,
        onPress: () => navigateTo('DespesaForm'),
      },
      {
        label: 'Contas a Receber',
        icon: 'hand-coin',
        color: COLORS.primary,
        onPress: () => navigateTo('ContasReceber'),
      },
      {
        label: 'Tarefas',
        icon: 'calendar-check-outline',
        color: COLORS.orange,
        onPress: () => navigateTo('Tarefas'),
      },
      {
        label: isCampoMode ? 'Talh\u00f5es' : 'Estufas',
        icon: isCampoMode ? 'map-marker-radius-outline' : 'greenhouse',
        color: COLORS.secondary,
        onPress: () => (isCampoMode ? navigateTo('TalhoesList') : navigateTo('EstufasList')),
      },
    ];
  }, [isCampoMode, isHydroMode, navigateTo, openHydroLayoutFlow, openQuickManejoFlow, openQuickSaleFlow]);

  const modules = useMemo<Array<{ label: string; icon: string; color: string; onPress: () => void }>>(() => {
    if (settings.uiV2Enabled) {
      return [
        {
          label: 'Inicio',
          icon: 'view-dashboard-outline',
          color: COLORS.primary,
          onPress: () => navigateTo('MainTabs', { screen: 'InicioTab' }),
        },
        {
          label: isHydroMode ? 'Hidroponia' : 'Campo',
          icon: isHydroMode ? 'water-outline' : isCampoMode ? 'tractor-variant' : 'greenhouse',
          color: COLORS.success,
          onPress: () => navigateTo('MainTabs', { screen: 'OperacaoTab' }),
        },
        {
          label: 'Estoque',
          icon: 'warehouse',
          color: COLORS.primaryDark,
          onPress: () => navigateTo('MainTabs', { screen: 'EstoqueTab' }),
        },
        {
          label: 'Financeiro',
          icon: 'cash-multiple',
          color: COLORS.modFinanceiro,
          onPress: () => navigateTo('MainTabs', { screen: 'FinanceiroTab' }),
        },
        {
          label: 'Relat\u00f3rios',
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
          label: 'Perfil',
          icon: 'account-circle-outline',
          color: COLORS.info,
          onPress: () => navigateTo('MainTabs', { screen: 'PerfilTab' }),
        },
        {
          label: 'Ajustes',
          icon: 'cog-outline',
          color: COLORS.secondary,
          onPress: () => navigateTo('Settings'),
        },
      ];
    }

    const base: Array<{ label: string; icon: string; color: string; onPress: () => void }> = [
      { label: 'Relat\u00f3rios', icon: 'chart-box-outline', color: COLORS.primary, onPress: () => navigateTo('Relatorios') },
      { label: 'Vendas', icon: 'basket-outline', color: COLORS.success, onPress: () => navigateTo('VendasList') },
      { label: 'Despesas', icon: 'cash-minus', color: COLORS.modDespesas, onPress: () => navigateTo('DespesasList') },
      { label: 'Insumos', icon: 'flask-outline', color: COLORS.primaryDark, onPress: () => navigateTo('InsumosList') },
      { label: 'Clientes', icon: 'account-group-outline', color: COLORS.info, onPress: () => navigateTo('ClientesList') },
      { label: 'Fornecedores', icon: 'truck-delivery-outline', color: COLORS.orange, onPress: () => navigateTo('FornecedoresList') },
      { label: 'Tarefas', icon: 'calendar-check-outline', color: COLORS.orange, onPress: () => navigateTo('Tarefas') },
      { label: 'Ajustes', icon: 'cog-outline', color: COLORS.secondary, onPress: () => navigateTo('Settings') },
    ];

    if (isHydroMode) {
      base.splice(3, 0, {
        label: 'Hidroponia',
        icon: 'water',
        color: COLORS.info,
        onPress: () => navigateTo('HidroponiaLotes'),
      });
    }

    return base;
  }, [isCampoMode, isHydroMode, navigateTo, settings.uiV2Enabled]);

  const uniqueTenants = useMemo(() => {
    const byUid = new Map<string, (typeof availableTenants)[number]>();
    availableTenants.forEach((tenant) => {
      const existing = byUid.get(tenant.uid);
      if (!existing) {
        byUid.set(tenant.uid, tenant);
        return;
      }
      if (tenant.type === 'owner' && existing.type !== 'owner') {
        byUid.set(tenant.uid, tenant);
      }
    });
    return Array.from(byUid.values());
  }, [availableTenants]);

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return;
      try {
        await updateTarefaStatus(taskId, 'concluida', targetId);
        await refetchResumo();
      } catch {
        showError('Não foi possível concluir a tarefa.');
      }
    },
    [selectedTenantId, user?.uid, refetchResumo, showError]
  );

  const renderHeader = () => (
    <View style={{ paddingBottom: SPACING.md }}>
      <View style={styles.pulseStrip}>
        <MaterialCommunityIcons name="flash-outline" size={18} color={COLORS.textLight} />
        <Text style={styles.pulseStripText}>Painel operacional em tempo real</Text>
      </View>

      {uniqueTenants.length > 1 && (
        <View style={[styles.tenantBox, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
          <View style={styles.tenantHeaderRow}>
            <Text style={[styles.tenantTitle, { color: theme.textSecondary }]}>Conta ativa</Text>
            <Text style={[styles.tenantHint, { color: theme.textSecondary }]}>Toque para alternar</Text>
          </View>
          <View style={styles.tenantList}>
            {uniqueTenants.map((tenant) => {
              const isActive = tenant.uid === selectedTenantId;
              const scopeLabel = tenant.type === 'shared' ? 'Compartilhada' : 'Minha';
              return (
                <TouchableOpacity
                  key={tenant.uid}
                  style={[
                    styles.tenantChip,
                    {
                      borderColor: isActive ? COLORS.info : theme.border,
                      backgroundColor: isActive ? COLORS.infoSoft : theme.surfaceMuted,
                    },
                  ]}
                  onPress={() => changeTenant(tenant.uid)}
                >
                  <View
                    style={[
                      styles.tenantScopeBadge,
                      {
                        backgroundColor: isActive ? COLORS.info : theme.surfaceBackground,
                        borderColor: isActive ? COLORS.info : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tenantScopeBadgeText, { color: isActive ? COLORS.textLight : theme.textSecondary }]}> 
                      {scopeLabel}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tenantChipText,
                      { color: isActive ? COLORS.info : theme.textPrimary },
                    ]}
                  >
                    {tenant.name}
                  </Text>
                  {isActive ? <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.info} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {!isHydroMode && canWrite ? (
        <TouchableOpacity style={styles.wizardButton} onPress={() => navigateTo('WizardSelectPlantio')}>
          <MaterialCommunityIcons name="magic-staff" size={24} color={COLORS.textLight} />
          <Text style={styles.wizardButtonText}>{isCampoMode ? 'Registrar atividade do talhao' : 'Registrar Atividade do Dia'}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.infoBanner, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <MaterialCommunityIcons name="database-sync-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
          {summarySource === 'summary_doc'
            ? `Resumo centralizado: ${formatDateSafe(summaryUpdatedAt)}`
            : 'Resumo em agregacao local (fallback).'}
        </Text>
      </View>

      {isHydroMode ? (
        <View style={[styles.motorSection, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
          <View style={styles.motorSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.motorSectionTitle, { color: theme.textPrimary }]}>Motores por Setor</Text>
              <Text style={[styles.motorSectionSubtitle, { color: theme.textSecondary }]}>
                Cadastre e edite motores em uma tela dedicada.
              </Text>
            </View>
            <TouchableOpacity style={styles.motorSectionBtn} onPress={openHydroMotorFlow}>
              <Text style={styles.motorSectionBtnText}>Configurar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.blockCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
        <TodayTasks
          tasks={todayTasks}
          onOpenPlantio={(plantioId) => navigateTo('PlantioDetail', { plantioId })}
          onOpenTasks={() => navigateTo('Tarefas')}
          onCompleteTask={handleCompleteTask}
        />
      </View>

      <View style={[styles.blockCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
        <AlertsList
          alerts={criticalAlerts as any}
          onOpenEstufa={(estufaId) => navigateTo('EstufaDetail', { estufaId })}
        />
      </View>

      {canWrite ? (
        <View style={[styles.blockCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
          <QuickActions actions={quickActions} />
        </View>
      ) : null}

      {canViewFinancialDashboard && (
        loadingResumo ? (
          <DashboardLoadingSkeleton />
        ) : (
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
    <View style={{ marginTop: SPACING.md, paddingBottom: insets.bottom + 40 }}>
      <SectionHeading title="Modulos de Gestao" />
      <View style={styles.modulesGrid}>
        {modules.map((module) => (
          <ModuleGridItem
            key={module.label}
            title={module.label}
            subtitle="Acessar ferramentas"
            icon={module.icon}
            color={module.color}
            onPress={module.onPress}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar barStyle="light-content" translucent />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeaderCard
          title="Centro de Comando"
          subtitle={`Ola, ${user?.displayName?.split(' ')[0] || 'Gestor'}`}
          badgeLabel={accessRoleLabel}
          actionLabel={settings.uiV2Enabled ? (isHydroMode ? 'Hidroponia' : isCampoMode ? 'Campo' : 'Estufas') : isCampoMode ? 'Talhoes' : 'Estufas'}
          actionIcon={settings.uiV2Enabled ? (isHydroMode ? 'water-outline' : isCampoMode ? 'tractor-variant' : 'greenhouse') : isCampoMode ? 'map-marker-radius-outline' : 'greenhouse'}
          onPressAction={() =>
            settings.uiV2Enabled
              ? navigateTo('MainTabs', { screen: 'OperacaoTab' })
              : isCampoMode
              ? navigateTo('TalhoesList')
              : navigateTo('EstufasList')
          }
        >
          <HeroStats estufas={estufas.length} plantios={totalCiclosAtivos} tarefasHoje={tarefasHojePendentes} />
        </ScreenHeaderCard>

        <FlatList
          data={[]}
          keyExtractor={(_, index) => String(index)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={() => null}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  pulseStrip: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.card,
  },
  pulseStripText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  wizardButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    gap: 12,
    marginBottom: SPACING.lg,
  },
  wizardButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },

  infoBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoBannerText: { fontSize: 11 },
  motorSection: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: SPACING.md },
  motorSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  motorSectionTitle: { fontSize: 15, fontWeight: '900' },
  motorSectionSubtitle: { fontSize: 12, marginTop: 2 },
  motorSectionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  motorSectionBtnText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
  tenantBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  tenantTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
  tenantHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tenantHint: { fontSize: 11, fontWeight: '600' },
  tenantList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenantChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenantScopeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tenantScopeBadgeText: { fontSize: 10, fontWeight: '800' },
  tenantChipText: { fontSize: 12, fontWeight: '700' },

  blockCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },

  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleChip: {
    width: '48%',
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  moduleChipText: { fontSize: 14, fontWeight: '800' },
});

export default DashboardScreen;
