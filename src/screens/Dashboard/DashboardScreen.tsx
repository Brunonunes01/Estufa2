import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAuth } from '../../hooks/useAuth';
import DashboardLoadingSkeleton from '../../components/dashboard/DashboardLoadingSkeleton';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import HeroStats from '../../components/dashboard/HeroStats';
import MoneyGrid from '../../components/dashboard/MoneyGrid';
import AlertsList from '../../components/dashboard/AlertsList';
import TodayTasks from '../../components/dashboard/TodayTasks';
import QuickActions from '../../components/dashboard/QuickActions';

const DashboardScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError } = useFeedback();
  const { isAdmin } = useAuth();

  const {
    user,
    selectedTenantId,
    changeTenant,
    availableTenants,
    estufas,
    todayTasks,
    totalReceber,
    totalPagar,
    tarefasHojePendentes,
    totalCiclosAtivos,
    summarySource,
    summaryUpdatedAt,
    loadingResumo,
    isError,
    activePlantioByEstufa,
    plantiosByEstufa,
    criticalAlerts,
  } = useDashboardMetrics();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os indicadores do painel.');
  }, [isError, showError]);

  const navigateTo = useCallback(
    (screen: string, params?: Record<string, any>) => navigation.navigate(screen, params),
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
    if (estufas.length === 1) {
      handleQuickSale(estufas[0].id);
      return;
    }
    navigateTo('EstufasList', { mode: 'colheita' });
  }, [estufas, handleQuickSale, navigateTo]);

  const openQuickManejoFlow = useCallback(() => {
    if (estufas.length === 1) {
      handleManejoFlow(estufas[0].id);
      return;
    }
    navigateTo('EstufasList', { mode: 'manejo' });
  }, [estufas, handleManejoFlow, navigateTo]);

  const quickActions = useMemo(
    () => [
      {
        label: 'Colher / Vender',
        icon: 'basket',
        color: COLORS.success,
        onPress: openQuickSaleFlow,
      },
      {
        label: 'Registrar Manejo',
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
        label: 'Estufas',
        icon: 'greenhouse',
        color: COLORS.secondary,
        onPress: () => navigateTo('EstufasList'),
      },
    ],
    [navigateTo, openQuickManejoFlow, openQuickSaleFlow]
  );

  const modules = useMemo(
    () => [
      { label: 'Relatórios', icon: 'chart-box-outline', route: 'VendasList', color: COLORS.primary },
      { label: 'Despesas', icon: 'cash-minus', route: 'DespesasList', color: COLORS.modDespesas },
      { label: 'Insumos', icon: 'flask-outline', route: 'InsumosList', color: COLORS.primaryDark },
      { label: 'Clientes', icon: 'account-group-outline', route: 'ClientesList', color: COLORS.info },
      { label: 'Fornecedores', icon: 'truck-delivery-outline', route: 'FornecedoresList', color: COLORS.orange },
      { label: 'Compartilhar Acesso', icon: 'account-multiple-plus', route: 'ShareAccount', color: COLORS.success },
      { label: 'Configurações', icon: 'cog-outline', route: 'Settings', color: COLORS.secondary },
    ],
    []
  );

  const renderHeader = () => (
    <View style={{ paddingBottom: SPACING.md }}>
      {availableTenants.length > 1 && (
        <View style={[styles.tenantBox, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
          <Text style={[styles.tenantTitle, { color: theme.textSecondary }]}>Conta Ativa</Text>
          <View style={styles.tenantList}>
            {availableTenants.map((tenant) => {
              const isActive = tenant.uid === selectedTenantId;
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
                  <Text
                    style={[
                      styles.tenantChipText,
                      { color: isActive ? COLORS.info : theme.textPrimary },
                    ]}
                  >
                    {tenant.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={[styles.infoBanner, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
        <MaterialCommunityIcons name="database-sync-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
          {summarySource === 'summary_doc'
            ? `Resumo centralizado: ${summaryUpdatedAt?.toDate().toLocaleDateString()}`
            : 'Resumo em agregação local (fallback).'}
        </Text>
      </View>

      <TodayTasks
        tasks={todayTasks}
        titleColor={theme.textPrimary}
        textColor={theme.textPrimary}
        onOpenPlantio={(plantioId) => navigateTo('PlantioDetail', { plantioId })}
      />

      <AlertsList
        alerts={criticalAlerts as any}
        titleColor={theme.textPrimary}
        textColor={theme.textPrimary}
        onOpenEstufa={(estufaId) => navigateTo('EstufaDetail', { estufaId })}
      />

      <QuickActions
        actions={quickActions}
        titleColor={theme.textPrimary}
        cardBg={theme.surfaceBackground}
        borderColor={theme.border}
        textColor={theme.textPrimary}
      />

      {isAdmin && (loadingResumo ? <DashboardLoadingSkeleton /> : <MoneyGrid totalReceber={totalReceber} totalPagar={totalPagar} textColor={theme.textSecondary} />)}

    </View>
  );

  const renderFooter = () => (
    <View style={{ marginTop: SPACING.xl, paddingBottom: insets.bottom + 40 }}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Módulos</Text>
      <View style={styles.modulesGrid}>
        {modules.map((module) => (
          <TouchableOpacity
            key={module.label}
            style={[styles.moduleChip, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
            onPress={() => navigateTo(module.route)}
          >
            <MaterialCommunityIcons name={module.icon as any} size={18} color={module.color} />
            <Text style={[styles.moduleChipText, { color: theme.textPrimary }]}>{module.label}</Text>
          </TouchableOpacity>
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
          subtitle={`Olá, ${user?.displayName?.split(' ')[0] || 'Gestor'}`}
          badgeLabel={isAdmin ? 'Administrador' : 'Operador'}
          actionLabel="Estufas"
          actionIcon="greenhouse"
          onPressAction={() => navigateTo('EstufasList')}
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
  tenantBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: SPACING.sm,
  },
  tenantTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
  tenantList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenantChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tenantChipText: { fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleChip: {
    width: '48%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  moduleChipText: { fontSize: 13, fontWeight: '700' },
});

export default DashboardScreen;
