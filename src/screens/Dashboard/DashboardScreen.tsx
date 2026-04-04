import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useDashboardActions } from '../../hooks/useDashboardActions';
import DashboardLoadingSkeleton from '../../components/dashboard/DashboardLoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';

const DashboardScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError, showWarning } = useFeedback();
  const { signOut } = useDashboardActions();

  const {
    user,
    selectedTenantId,
    changeTenant,
    availableTenants,
    estufas,
    totalReceber,
    totalPagar,
    totalCiclosAtivos,
    summarySource,
    summaryUpdatedAt,
    loadingResumo,
    isError,
    activePlantioByEstufa,
    criticalAlerts,
    healthByEstufa,
  } = useDashboardMetrics();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os indicadores do painel.');
  }, [isError, showError]);

  const navigateTo = useCallback(
    (screen: string, params?: Record<string, any>) => navigation.navigate(screen, params),
    [navigation]
  );

  const summaryHint = useMemo(() => {
    if (summarySource === 'summary_doc') {
      const updatedAt = summaryUpdatedAt
        ? `Atualizado em ${summaryUpdatedAt.toDate().toLocaleString('pt-BR')}`
        : 'Atualização sem data registrada';
      return `Resumo financeiro centralizado. ${updatedAt}.`;
    }
    return 'Resumo em modo compatível por agregação direta.';
  }, [summarySource, summaryUpdatedAt]);

  const quickActions = useMemo(
    () => [
      {
        label: 'Nova Venda',
        subtitle: 'Registrar colheita e recebimento',
        icon: 'basket-plus',
        color: COLORS.success,
        onPress: () => navigateTo('EstufasList'),
      },
      {
        label: 'Nova Despesa',
        subtitle: 'Lançar custo operacional',
        icon: 'cash-minus',
        color: COLORS.danger,
        onPress: () => navigateTo('DespesaForm'),
      },
      {
        label: 'Contas a Receber',
        subtitle: 'Acompanhar pagamentos pendentes',
        icon: 'hand-coin',
        color: COLORS.info,
        onPress: () => navigateTo('ContasReceber'),
      },
      {
        label: 'Cadastrar Estufa',
        subtitle: 'Expandir operação',
        icon: 'greenhouse',
        color: COLORS.primary,
        onPress: () => navigateTo('EstufaForm'),
      },
    ],
    [navigateTo]
  );

  const modules = useMemo(
    () => [
      { label: 'Relatórios', icon: 'chart-box-outline', route: 'VendasList', color: COLORS.info },
      { label: 'Despesas', icon: 'wallet-outline', route: 'DespesasList', color: COLORS.modDespesas },
      { label: 'Insumos', icon: 'flask-outline', route: 'InsumosList', color: COLORS.primaryDark },
      { label: 'Clientes', icon: 'account-group', route: 'ClientesList', color: COLORS.modClientes },
      { label: 'Fornecedores', icon: 'truck-delivery-outline', route: 'FornecedoresList', color: COLORS.orange },
      { label: 'Compartilhar', icon: 'share-variant', route: 'ShareAccount', color: COLORS.textSecondary },
      { label: 'Configurações', icon: 'cog-outline', route: 'Settings', color: COLORS.secondary },
    ],
    []
  );

  const handleQuickSale = useCallback(
    (estufaId: string) => {
      const plantioAtivo = activePlantioByEstufa[estufaId];
      if (!plantioAtivo) {
        Alert.alert('Sem ciclo ativo', 'Crie um plantio nesta estufa para registrar vendas.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Plantio', onPress: () => navigateTo('PlantioForm', { estufaId }) },
        ]);
        showWarning('Sem ciclo ativo nesta estufa.');
        return;
      }

      navigateTo('ColheitaForm', { plantioId: plantioAtivo.id, estufaId });
    },
    [activePlantioByEstufa, navigateTo, showWarning]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.panelBackground} translucent />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeaderCard
          title="Centro de Comando"
          subtitle={`Olá, ${user?.name?.split(' ')[0] || 'gestor'}. Veja operação, caixa e alertas em tempo real.`}
          badgeLabel="Dashboard"
          actionLabel="Sair"
          actionIcon="logout"
          onPressAction={signOut}
        >
          {availableTenants.length > 1 ? (
            <View style={styles.tenantSelector}>
              <MaterialCommunityIcons name="store-cog" size={18} color={COLORS.textLight} />
              <Picker
                selectedValue={selectedTenantId}
                onValueChange={changeTenant}
                style={styles.tenantPicker}
                dropdownIconColor={COLORS.textLight}
                mode="dropdown"
              >
                {availableTenants.map((tenant) => (
                  <Picker.Item key={tenant.uid} label={tenant.name || 'Estufa'} value={tenant.uid} />
                ))}
              </Picker>
            </View>
          ) : null}

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>{estufas.length}</Text>
              <Text style={styles.heroStatLabel}>Estufas</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>{totalCiclosAtivos}</Text>
              <Text style={styles.heroStatLabel}>Ciclos Ativos</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>R$ {totalReceber.toFixed(0)}</Text>
              <Text style={styles.heroStatLabel}>A Receber</Text>
            </View>
          </View>
        </ScreenHeaderCard>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 50 }]}
        >
          <View style={[styles.infoBanner, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="database-sync-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>{summaryHint}</Text>
          </View>

          {loadingResumo ? (
            <DashboardLoadingSkeleton />
          ) : (
            <View style={styles.moneyGrid}>
              <View style={[styles.moneyCard, { backgroundColor: theme.successBackground }]}>
                <Text style={styles.moneyTitle}>Entradas Previstas</Text>
                <Text style={[styles.moneyValue, { color: COLORS.success }]}>R$ {totalReceber.toFixed(2)}</Text>
                <Text style={styles.moneyHint}>Valores pendentes de recebimento</Text>
              </View>
              <View style={[styles.moneyCard, { backgroundColor: theme.dangerBackground }]}>
                <Text style={styles.moneyTitle}>Saídas Previstas</Text>
                <Text style={[styles.moneyValue, { color: COLORS.danger }]}>R$ {totalPagar.toFixed(2)}</Text>
                <Text style={styles.moneyHint}>Despesas a liquidar</Text>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Prioridades Agora</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Ações de maior impacto</Text>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
                activeOpacity={0.88}
                onPress={action.onPress}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${action.color}20` }]}>
                  <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={[styles.quickLabel, { color: theme.textPrimary }]}>{action.label}</Text>
                <Text style={[styles.quickSubtitle, { color: theme.textSecondary }]}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Alertas Críticos</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Riscos que exigem atenção</Text>
          </View>

          {criticalAlerts.length === 0 ? (
            <View style={[styles.alertBoxOk, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color={COLORS.success} />
              <Text style={[styles.alertText, { color: theme.textPrimary }]}>Nenhum alerta crítico no momento.</Text>
            </View>
          ) : (
            criticalAlerts.map(({ estufa, health }) => (
              <TouchableOpacity
                key={estufa.id}
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: health.level === 'critical' ? theme.dangerBackground : theme.warningBackground,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => navigateTo('EstufaDetail', { estufaId: estufa.id })}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons
                  name={health.level === 'critical' ? 'alert-circle' : 'alert-outline'}
                  size={18}
                  color={health.level === 'critical' ? COLORS.danger : COLORS.warning}
                />
                <Text style={[styles.alertText, { color: theme.textPrimary }]}>
                  {estufa.nome}: {health.reasons[0] || 'Ação recomendada.'}
                </Text>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Hubs de Estufa</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Atalhos por unidade</Text>
            </View>
            <TouchableOpacity onPress={() => navigateTo('EstufasList')}>
              <Text style={styles.linkButton}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {estufas.length === 0 ? (
            <EmptyState
              icon="greenhouse"
              title="Nenhuma estufa cadastrada"
              description="Cadastre sua primeira estufa para habilitar atalhos operacionais."
              actionLabel="Cadastrar estufa"
              onAction={() => navigateTo('EstufaForm')}
            />
          ) : (
            estufas.map((estufa) => {
              const plantioAtivo = activePlantioByEstufa[estufa.id];
              const health = healthByEstufa[estufa.id];

              return (
                <View
                  key={estufa.id}
                  style={[styles.hubCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
                >
                  <View style={styles.hubTop}>
                    <View>
                      <Text style={[styles.hubName, { color: theme.textPrimary }]}>{estufa.nome}</Text>
                      <Text style={[styles.hubMeta, { color: theme.textSecondary }]}>
                        Área {estufa.areaM2} m²
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.hubHealth,
                        {
                          backgroundColor:
                            health?.level === 'critical'
                              ? theme.dangerBackground
                              : health?.level === 'warning'
                                ? theme.warningBackground
                                : theme.successBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.hubHealthText,
                          {
                            color:
                              health?.level === 'critical'
                                ? COLORS.danger
                                : health?.level === 'warning'
                                  ? COLORS.warning
                                  : COLORS.success,
                          },
                        ]}
                      >
                        {health?.label || 'OK'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.hubCycle, { color: theme.textPrimary }]}>
                    {plantioAtivo ? `Ciclo ativo: ${plantioAtivo.cultura}` : 'Sem ciclo ativo'}
                  </Text>

                  <View style={styles.hubActions}>
                    <TouchableOpacity
                      style={[styles.hubButtonNeutral, { borderColor: theme.border }]}
                      onPress={() => navigateTo('EstufaDetail', { estufaId: estufa.id })}
                    >
                      <Text style={[styles.hubButtonNeutralText, { color: theme.textPrimary }]}>Abrir Hub</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.hubButtonNeutral, { borderColor: theme.border }]}
                      onPress={() =>
                        plantioAtivo
                          ? navigateTo('PlantioDetail', { plantioId: plantioAtivo.id })
                          : navigateTo('PlantioForm', { estufaId: estufa.id })
                      }
                    >
                      <Text style={[styles.hubButtonNeutralText, { color: theme.textPrimary }]}>
                        {plantioAtivo ? 'Ciclo' : 'Novo Ciclo'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.hubButtonPrimary} onPress={() => handleQuickSale(estufa.id)}>
                      <Text style={styles.hubButtonPrimaryText}>Vender</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Módulos</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Acesso rápido por área</Text>
          </View>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <TouchableOpacity
                key={module.label}
                style={[styles.moduleChip, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
                onPress={() => navigateTo(module.route)}
                activeOpacity={0.86}
              >
                <MaterialCommunityIcons name={module.icon as any} size={18} color={module.color} />
                <Text style={[styles.moduleChipText, { color: theme.textPrimary }]}>{module.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  tenantSelector: {
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    backgroundColor: COLORS.whiteAlpha12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
  },
  tenantPicker: { color: COLORS.textLight, flex: 1 },
  heroStatsRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  heroStatChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  heroStatValue: { color: COLORS.textLight, fontSize: 14, fontWeight: '800' },
  heroStatLabel: { color: COLORS.whiteAlpha80, fontSize: 10, marginTop: 2, fontWeight: '600' },

  infoBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  moneyGrid: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  moneyCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha15,
  },
  moneyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  moneyValue: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  moneyHint: { marginTop: 4, fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },

  sectionHeader: { marginBottom: 10 },
  sectionHeaderRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  sectionSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  linkButton: { color: COLORS.info, fontSize: 13, fontWeight: '700' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.xl },
  quickCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
    ...SHADOWS.card,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { marginTop: 10, fontSize: 14, fontWeight: '800' },
  quickSubtitle: { marginTop: 4, fontSize: 11, lineHeight: 15 },

  alertBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  alertBoxOk: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  alertText: { flex: 1, fontSize: 12, fontWeight: '600' },

  hubCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  hubTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hubName: { fontSize: 16, fontWeight: '900' },
  hubMeta: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  hubHealth: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  hubHealthText: { fontSize: 10, fontWeight: '800' },
  hubCycle: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  hubActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  hubButtonNeutral: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.whiteAlpha10,
  },
  hubButtonNeutralText: { fontSize: 12, fontWeight: '700' },
  hubButtonPrimary: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubButtonPrimaryText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },

  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
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
