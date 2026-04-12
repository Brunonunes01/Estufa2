import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useDashboardActions } from '../../hooks/useDashboardActions';
import { useAuth } from '../../hooks/useAuth';
import DashboardLoadingSkeleton from '../../components/dashboard/DashboardLoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import HeroStats from '../../components/dashboard/HeroStats';
import MoneyGrid from '../../components/dashboard/MoneyGrid';
import AlertsList from '../../components/dashboard/AlertsList';
import TodayTasks from '../../components/dashboard/TodayTasks';
import QuickActions from '../../components/dashboard/QuickActions';
import EstufaHub from '../../components/dashboard/EstufaHub';

const DashboardScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError } = useFeedback();
  const { signOut } = useDashboardActions();
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

  const quickActions = useMemo(
    () =>
      [
        {
          label: 'Nova Tarefa',
          icon: 'calendar-plus',
          color: COLORS.info,
          onPress: () => navigateTo('EstufasList'),
          adminOnly: false,
        },
        {
          label: 'Nova Venda',
          icon: 'basket-plus',
          color: COLORS.success,
          onPress: () => navigateTo('EstufasList'),
          adminOnly: false,
        },
        {
          label: 'Nova Despesa',
          icon: 'cash-minus',
          color: COLORS.danger,
          onPress: () => navigateTo('DespesaForm'),
          adminOnly: true,
        },
        {
          label: 'Compartilhar Conta',
          icon: 'account-multiple-plus',
          color: COLORS.info,
          onPress: () => navigateTo('ShareAccount'),
          adminOnly: true,
        },
        {
          label: 'Contas a Receber',
          icon: 'hand-coin',
          color: COLORS.primary,
          onPress: () => navigateTo('ContasReceber'),
          adminOnly: true,
        },
      ].filter((a) => !a.adminOnly || isAdmin),
    [navigateTo, isAdmin]
  );

  const modules = useMemo(
    () => [
      { label: 'Operação', icon: 'sprout-outline', route: 'EstufasList', color: COLORS.success },
      { label: 'Financeiro', icon: 'wallet-outline', route: 'ContasReceber', color: COLORS.modDespesas },
      { label: 'Insumos', icon: 'flask-outline', route: 'InsumosList', color: COLORS.primaryDark },
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

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Hubs de Estufa</Text>
        <TouchableOpacity onPress={() => navigateTo('EstufasList')}>
          <Text style={styles.linkButton}>Ver todas</Text>
        </TouchableOpacity>
      </View>
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
          actionIcon="logout"
          onPressAction={signOut}
        >
          <HeroStats estufas={estufas.length} plantios={totalCiclosAtivos} tarefasHoje={tarefasHojePendentes} />
        </ScreenHeaderCard>

        <FlatList
          data={estufas}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <EstufaHub
              estufa={item}
              plantiosAtivos={plantiosByEstufa[item.id] || []}
              textPrimary={theme.textPrimary}
              textSecondary={theme.textSecondary}
              borderColor={theme.border}
              surfaceBackground={theme.surfaceBackground}
              onOpenHub={(id) => navigateTo('EstufaDetail', { estufaId: id })}
              onCycleAction={(id, pid) =>
                pid ? navigateTo('PlantioDetail', { plantioId: pid }) : navigateTo('PlantioForm', { estufaId: id })
              }
              onQuickSale={handleQuickSale}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="greenhouse"
              title="Sem estufas"
              description="Cadastre sua primeira estufa."
              onAction={() => navigateTo('EstufaForm')}
            />
          }
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
  sectionHeaderRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: { color: COLORS.info, fontSize: 13, fontWeight: '700' },

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
