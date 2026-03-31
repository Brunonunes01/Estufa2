import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { Estufa, Plantio } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import SectionHeading from '../../components/ui/SectionHeading';
import MetricCard from '../../components/ui/MetricCard';
import { evaluateEstufaHealth } from '../../utils/estufaHealth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useDashboardSummary } from '../../hooks/queries/useDashboardSummary';
import { useFeedback } from '../../hooks/useFeedback';

const DashboardScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const { showError, showWarning } = useFeedback();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const targetId = selectedTenantId || user?.uid;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDashboardSummary(targetId);

  const estufas: Estufa[] = data?.estufas || [];
  const plantios: Plantio[] = data?.activePlantios || [];
  const totalReceber = data?.totalReceber || 0;
  const totalPagar = data?.totalPagar || 0;
  const loadingResumo = isLoading || isFetching;

  const navigateTo = (screen: string, params?: Record<string, any>) => navigation.navigate(screen, params);

  const getFormattedLabel = (tenant: any) => {
    const isMe = tenant.uid === user?.uid;
    const nomesGenericos = ['Minha Estufa', 'Meu Grow', 'Estufa', 'Grow', 'Principal'];
    const nomeAtual = tenant.name ? tenant.name.trim() : 'Estufa';

    if (isMe) return `${nomeAtual} (Principal)`;
    if (nomesGenericos.includes(nomeAtual)) return 'Estufa Compartilhada';
    return `Estufa: ${nomeAtual}`;
  };

  useEffect(() => {
    if (isFocused && targetId) refetch();
  }, [isFocused, targetId, refetch]);

  useEffect(() => {
    if (isError) {
      showError('Não foi possível carregar os indicadores do painel.');
    }
  }, [isError, showError]);

  const activePlantioByEstufa = useMemo(() => {
    const map: Record<string, Plantio | null> = {};
    estufas.forEach((estufa) => {
      map[estufa.id] =
        plantios.find((plantio) => plantio.estufaId === estufa.id && plantio.status !== 'finalizado') || null;
    });
    return map;
  }, [estufas, plantios]);

  const totalCiclosAtivos = plantios.length;

  const healthByEstufa = useMemo(() => {
    return estufas.reduce<Record<string, ReturnType<typeof evaluateEstufaHealth>>>((acc, estufa) => {
      acc[estufa.id] = evaluateEstufaHealth(estufa, plantios);
      return acc;
    }, {});
  }, [estufas, plantios]);

  const criticalAlerts = useMemo(() => {
    if (!settings.notifyCritical) return [];

    return estufas
      .map((estufa) => ({
        estufa,
        health: healthByEstufa[estufa.id],
      }))
      .filter((item) => item.health && item.health.level !== 'ok')
      .slice(0, 4);
  }, [estufas, healthByEstufa, settings.notifyCritical]);

  const irParaVendaRapida = (estufaId: string) => {
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
  };

  const GridItem = ({ title, sub, icon, color, route }: any) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => navigateTo(route)} activeOpacity={0.85}>
      <View style={[styles.iconBox, { backgroundColor: color + '14' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.gridTexts}>
        <Text style={styles.gridTitle}>{title}</Text>
        <Text style={styles.gridSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.mainWrapper, settings.darkMode && styles.mainWrapperDark]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} translucent />

      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.welcomeSmall}>Olá, {user?.name?.split(' ')[0]}</Text>
              <Text style={styles.welcomeBig}>Centro de Comando</Text>
            </View>
            <TouchableOpacity onPress={() => auth.signOut()} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {availableTenants.length > 1 && (
            <View style={styles.tenantWrapper}>
              <MaterialCommunityIcons name="store-cog" size={20} color={COLORS.onPrimary} style={styles.tenantIcon} />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedTenantId}
                  onValueChange={changeTenant}
                  style={styles.picker}
                  dropdownIconColor={COLORS.textLight}
                  mode="dropdown"
                >
                  {availableTenants.map((tenant) => (
                    <Picker.Item
                      key={tenant.uid}
                      label={getFormattedLabel(tenant)}
                      value={tenant.uid}
                      style={{ fontSize: 14, color: COLORS.textDark }}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.body, settings.darkMode && styles.bodyDark]}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 44 }]}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeading title="Ações Rápidas" subtitle="Chegue no que importa em 1 toque" />
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnSell]} onPress={() => navigateTo('EstufasList')}>
                <MaterialCommunityIcons name="basket-plus" size={28} color={COLORS.success} />
                <Text style={[styles.quickBtnText, { color: COLORS.success }]}>Nova Venda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnPay]} onPress={() => navigateTo('DespesaForm')}>
                <MaterialCommunityIcons name="cash-minus" size={28} color={COLORS.danger} />
                <Text style={[styles.quickBtnText, { color: COLORS.danger }]}>Lançar Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnStock]} onPress={() => navigateTo('ContasReceber')}>
                <MaterialCommunityIcons name="hand-coin" size={28} color={COLORS.info} />
                <Text style={[styles.quickBtnText, { color: COLORS.info }]}>Recebimentos</Text>
              </TouchableOpacity>
            </View>

            <SectionHeading title="Visão Geral" subtitle="Indicadores principais do negócio" />
            {loadingResumo ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : (
              <>
                <View style={styles.metricsRow}>
                  <MetricCard label="Estufas" value={String(estufas.length)} hint="Operação cadastrada" />
                  <MetricCard label="Ciclos ativos" value={String(totalCiclosAtivos)} tone="success" hint="Em andamento" />
                </View>
                <View style={styles.metricsRow}>
                  <MetricCard label="A receber" value={`R$ ${totalReceber.toFixed(2)}`} tone="warning" />
                  <MetricCard label="A pagar" value={`R$ ${totalPagar.toFixed(2)}`} tone="danger" />
                </View>
              </>
            )}

            <SectionHeading title="Alertas do Sistema" subtitle="Condições que exigem atenção imediata" />
            {criticalAlerts.length === 0 ? (
              <View style={[styles.alertCard, settings.darkMode && styles.alertCardDark]}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color={COLORS.success} />
                <Text style={[styles.alertText, settings.darkMode && styles.alertTextDark]}>Nenhum alerta crítico no momento.</Text>
              </View>
            ) : (
              criticalAlerts.map(({ estufa, health }) => (
                <TouchableOpacity
                  key={estufa.id}
                  style={[styles.alertCard, styles[`alertCard${health.level === 'critical' ? 'Critical' : 'Warning'}` as const], settings.darkMode && styles.alertCardDark]}
                  onPress={() => navigateTo('EstufaDetail', { estufaId: estufa.id })}
                >
                  <MaterialCommunityIcons
                    name={health.level === 'critical' ? 'alert-circle' : 'alert-outline'}
                    size={18}
                    color={health.level === 'critical' ? COLORS.danger : COLORS.warning}
                  />
                  <Text style={[styles.alertText, settings.darkMode && styles.alertTextDark]}>
                    {estufa.nome}: {health.reasons[0] || 'Ação recomendada.'}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <SectionHeading
              title="Hubs de Estufa"
              subtitle="Acesse cada estufa com atalhos para ciclo e venda"
              right={
                <TouchableOpacity onPress={() => navigateTo('EstufasList')}>
                  <Text style={styles.linkText}>Ver todas</Text>
                </TouchableOpacity>
              }
            />

            {estufas.length === 0 ? (
              <View style={styles.emptyHub}>
                <MaterialCommunityIcons name="greenhouse" size={42} color={COLORS.textMuted} />
                <Text style={styles.emptyHubTitle}>Nenhuma estufa cadastrada</Text>
                <Text style={styles.emptyHubSub}>Comece cadastrando sua primeira estufa para ativar os atalhos.</Text>
                <TouchableOpacity style={styles.emptyHubBtn} onPress={() => navigateTo('EstufaForm')}>
                  <Text style={styles.emptyHubBtnText}>Cadastrar Estufa</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hubScrollContent}>
                {estufas.map((estufa) => {
                  const plantioAtivo = activePlantioByEstufa[estufa.id];
                  const health = healthByEstufa[estufa.id];
                  return (
                    <View key={estufa.id} style={styles.hubCard}>
                      <View style={styles.hubHeader}>
                        <Text style={styles.hubTitle} numberOfLines={1}>{estufa.nome}</Text>
                        <View
                          style={[
                            styles.hubBadge,
                            health?.level === 'critical'
                              ? styles.hubBadgeCritical
                              : health?.level === 'warning'
                                ? styles.hubBadgeWarning
                                : styles.hubBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.hubBadgeText,
                              health?.level === 'critical'
                                ? styles.hubBadgeTextCritical
                                : health?.level === 'warning'
                                  ? styles.hubBadgeTextWarning
                                  : styles.hubBadgeTextActive,
                            ]}
                          >
                            {health?.label || 'OK'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.hubInfo}>Área: {estufa.areaM2} m²</Text>
                      <Text style={styles.hubInfo} numberOfLines={1}>
                        {plantioAtivo ? `Ciclo ativo: ${plantioAtivo.cultura}` : 'Sem ciclo ativo'}
                      </Text>

                      <View style={styles.hubActionsRow}>
                        <TouchableOpacity style={styles.hubActionBtn} onPress={() => navigateTo('EstufaDetail', { estufaId: estufa.id })}>
                          <Text style={styles.hubActionBtnText}>Hub</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.hubActionBtn}
                          onPress={() =>
                            plantioAtivo
                              ? navigateTo('PlantioDetail', { plantioId: plantioAtivo.id })
                              : navigateTo('PlantioForm', { estufaId: estufa.id })
                          }
                        >
                          <Text style={styles.hubActionBtnText}>{plantioAtivo ? 'Ciclo' : 'Novo Ciclo'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.hubActionBtnPrimary} onPress={() => irParaVendaRapida(estufa.id)}>
                          <Text style={styles.hubActionBtnPrimaryText}>Vender</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <SectionHeading title="Módulos do Sistema" subtitle="Acesse áreas de gestão e operação" />
            <View style={styles.gridWrapper}>
              <GridItem title="Relatórios" sub="Vendas e resultados" icon="chart-box-outline" color={COLORS.info} route="VendasList" />
              <GridItem title="Despesas" sub="Contas e pagamentos" icon="wallet-outline" color={COLORS.modDespesas} route="DespesasList" />
              <GridItem title="Insumos" sub="Estoque e consumo" icon="flask-outline" color={COLORS.primaryDark} route="InsumosList" />
              <GridItem title="Clientes" sub="Carteira e histórico" icon="account-group" color={COLORS.modClientes} route="ClientesList" />
              <GridItem title="Fornecedores" sub="Compras e contatos" icon="truck-delivery-outline" color={COLORS.orange} route="FornecedoresList" />
              <GridItem title="Compartilhar" sub="Permissões" icon="share-variant" color={COLORS.textSecondary} route="ShareAccount" />
              <GridItem title="Configurações" sub="Conta e segurança" icon="cog-outline" color={COLORS.secondary} route="Settings" />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: COLORS.secondary },
  mainWrapperDark: { backgroundColor: COLORS.textDark },
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg, marginTop: SPACING.sm },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  welcomeSmall: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  welcomeBig: { color: COLORS.textLight, fontSize: TYPOGRAPHY.h2, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: COLORS.whiteAlpha12,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha15,
  },
  tenantWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whiteAlpha10,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha15,
    height: 52,
    paddingHorizontal: 12,
  },
  tenantIcon: { marginRight: 5 },
  pickerContainer: { flex: 1, justifyContent: 'center' },
  picker: { color: COLORS.textLight },
  body: { flex: 1, backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  bodyDark: { backgroundColor: COLORS.c1E293B },
  scrollContent: { padding: SPACING.xl, paddingTop: SPACING.xl },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
  quickBtn: {
    width: '31%',
    minHeight: 92,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  quickBtnSell: { backgroundColor: COLORS.successSoft },
  quickBtnPay: { backgroundColor: COLORS.dangerBg },
  quickBtnStock: { backgroundColor: COLORS.infoSoft },
  quickBtnText: { marginTop: 8, fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 6 },

  loaderContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  alertCardWarning: { borderColor: COLORS.cFED7AA, backgroundColor: COLORS.warningSoft },
  alertCardCritical: { borderColor: COLORS.cFECACA, backgroundColor: COLORS.dangerBg },
  alertCardDark: { backgroundColor: COLORS.c334155, borderColor: COLORS.c475569 },
  alertText: { flex: 1, color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  alertTextDark: { color: COLORS.textLight },

  linkText: { color: COLORS.info, fontSize: 13, fontWeight: '700' },
  hubScrollContent: { paddingBottom: SPACING.lg, gap: SPACING.md },
  hubCard: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  hubTitle: { flex: 1, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.title, fontWeight: '800' },
  hubBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  hubBadgeActive: { backgroundColor: COLORS.successSoft },
  hubBadgeWarning: { backgroundColor: COLORS.warningSoft },
  hubBadgeCritical: { backgroundColor: COLORS.dangerBg },
  hubBadgeOff: { backgroundColor: COLORS.surfaceMuted },
  hubBadgeText: { fontSize: 10, fontWeight: '800' },
  hubBadgeTextActive: { color: COLORS.success },
  hubBadgeTextWarning: { color: COLORS.warning },
  hubBadgeTextCritical: { color: COLORS.danger },
  hubBadgeTextOff: { color: COLORS.textMuted },
  hubInfo: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
  hubActionsRow: { marginTop: SPACING.md, flexDirection: 'row', gap: 8 },
  hubActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubActionBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  hubActionBtnPrimary: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubActionBtnPrimaryText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },

  emptyHub: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  emptyHubTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.title, fontWeight: '800', marginTop: SPACING.sm },
  emptyHubSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
  emptyHubBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  emptyHubBtnText: { color: COLORS.textLight, fontWeight: '700' },

  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTexts: { flex: 1 },
  gridTitle: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.textPrimary },
  gridSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default DashboardScreen;
