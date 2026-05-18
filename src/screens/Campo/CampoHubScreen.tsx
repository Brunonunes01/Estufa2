import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import EmptyState from '../../components/ui/EmptyState';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAppSettings } from '../../hooks/useAppSettings';

const isHydroEstufa = (estufa: any) =>
  !!estufa.productionModes?.includes('hydroponics') || estufa.tipo === 'hidroponia' || !!estufa.hydroponicSystemType;

const CampoHubScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const { estufas, plantios, activePlantioByEstufa } = useDashboardMetrics();
  const [selectedEstufaId, setSelectedEstufaId] = useState<string>('all');

  const estufasCampo = useMemo(() => estufas.filter((item) => !isHydroEstufa(item)), [estufas]);
  const estufasCampoIds = useMemo(() => new Set(estufasCampo.map((item) => item.id)), [estufasCampo]);

  const ciclosAtivos = useMemo(
    () => plantios.filter((item) => estufasCampoIds.has(item.estufaId)),
    [plantios, estufasCampoIds]
  );
  const filtroEstufaValido =
    selectedEstufaId === 'all' || estufasCampo.some((item) => item.id === selectedEstufaId);
  const estufaFiltroId = filtroEstufaValido ? selectedEstufaId : 'all';
  const ciclosContexto = useMemo(
    () =>
      estufaFiltroId === 'all'
        ? ciclosAtivos
        : ciclosAtivos.filter((item) => item.estufaId === estufaFiltroId),
    [ciclosAtivos, estufaFiltroId]
  );

  const estufaNameById = useMemo(() => {
    const map: Record<string, string> = {};
    estufasCampo.forEach((item) => {
      map[item.id] = item.nome;
    });
    return map;
  }, [estufasCampo]);

  const abrirNovoPlantio = useCallback(() => {
    if (estufasCampo.length === 0) {
      Alert.alert('Sem estufas', 'Cadastre sua primeira estufa para iniciar o plantio.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cadastrar Estufa', onPress: () => navigation.navigate('EstufaForm') },
      ]);
      return;
    }
    if (estufasCampo.length === 1) {
      navigation.navigate('PlantioForm', { estufaId: estufasCampo[0].id });
      return;
    }
    navigation.navigate('EstufasList', { mode: 'plantio' });
  }, [estufasCampo, navigation]);

  const abrirAtividadePorCiclo = useCallback(
    (targetScreen: 'ManejoForm' | 'AplicacaoForm' | 'ColheitaForm') => {
      if (ciclosContexto.length === 0) {
        Alert.alert('Sem ciclo ativo', 'Crie um ciclo para registrar atividades.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Novo Plantio', onPress: abrirNovoPlantio },
        ]);
        return;
      }

      if (ciclosContexto.length === 1) {
        const plantio = ciclosContexto[0];
        navigation.navigate(targetScreen, { plantioId: plantio.id, estufaId: plantio.estufaId });
        return;
      }

      navigation.navigate('WizardSelectPlantio');
    },
    [abrirNovoPlantio, ciclosContexto, navigation]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.panelBackground} />

      <ScreenHeaderCard
        title="Campo"
        subtitle="Operação direta por ciclo. Estufas ficam como gestão, não como bloqueio do fluxo."
        badgeLabel="Operação"
        actionLabel="Nova Estufa"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('EstufaForm')}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{estufasCampo.length}</Text>
            <Text style={styles.statLabel}>Estufas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ciclosAtivos.length}</Text>
            <Text style={styles.statLabel}>Ciclos Ativos</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xxl) + insets.bottom },
        ]}
      >
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={abrirNovoPlantio}>
            <MaterialCommunityIcons name="sprout" size={22} color={COLORS.primary} />
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Novo Plantio</Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Iniciar novo ciclo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('WizardSelectPlantio')}>
            <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color={COLORS.info} />
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Assistente</Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Manejo, aplicação, venda</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard} onPress={() => abrirAtividadePorCiclo('ColheitaForm')}>
            <MaterialCommunityIcons name="basket-outline" size={22} color={COLORS.success} />
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Colher / Vender</Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Lançamento rápido</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('EstufasList')}>
            <MaterialCommunityIcons name="greenhouse" size={22} color={COLORS.secondary} />
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Estufas</Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Gestão e infraestrutura</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ciclos ativos</Text>
        {estufasCampo.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, estufaFiltroId === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedEstufaId('all')}
            >
              <Text style={[styles.filterChipText, estufaFiltroId === 'all' && styles.filterChipTextActive]}>Todas</Text>
            </TouchableOpacity>
            {estufasCampo.map((estufa) => (
              <TouchableOpacity
                key={estufa.id}
                style={[styles.filterChip, estufaFiltroId === estufa.id && styles.filterChipActive]}
                onPress={() => setSelectedEstufaId(estufa.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    estufaFiltroId === estufa.id && styles.filterChipTextActive,
                  ]}
                >
                  {estufa.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {ciclosAtivos.length === 0 ? (
          <EmptyState
            icon="sprout-outline"
            title="Nenhum ciclo ativo"
            description="Crie um plantio para começar a registrar manejo, aplicação e vendas."
            actionLabel="Novo Plantio"
            onAction={abrirNovoPlantio}
          />
        ) : ciclosContexto.length === 0 ? (
          <EmptyState
            icon="filter-off-outline"
            title="Sem ciclos neste filtro"
            description="A estufa selecionada não possui ciclos ativos no momento."
            actionLabel="Ver todas"
            onAction={() => setSelectedEstufaId('all')}
          />
        ) : (
          ciclosContexto.map((plantio) => {
            const estufaNome = estufaNameById[plantio.estufaId] || 'Estufa';
            const plantioAtivoPrincipal = activePlantioByEstufa[plantio.estufaId];
            const isPrincipal = plantioAtivoPrincipal?.id === plantio.id;
            return (
              <View key={plantio.id} style={[styles.cycleCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
                <View style={styles.cycleTop}>
                  <View style={styles.cycleIcon}>
                    <MaterialCommunityIcons name="leaf" size={16} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cycleTitle, { color: theme.textPrimary }]}>
                      {plantio.cultura} {plantio.variedade ? `• ${plantio.variedade}` : ''}
                    </Text>
                    <Text style={[styles.cycleSub, { color: theme.textSecondary }]}>
                      {plantio.codigoLote || 'Sem lote'} • {estufaNome}
                    </Text>
                  </View>
                  {isPrincipal ? (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Principal</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.border }]}
                    onPress={() => navigation.navigate('PlantioDetail', { plantioId: plantio.id })}
                  >
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>Ciclo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.border }]}
                    onPress={() => navigation.navigate('ManejoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
                  >
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>Manejo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.border }]}
                    onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
                  >
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>Aplicação</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPrimary}
                    onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
                  >
                    <MaterialCommunityIcons name="cash-plus" size={14} color={COLORS.textLight} />
                    <Text style={styles.actionPrimaryText}>Vender</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  statValue: { color: COLORS.textLight, fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.whiteAlpha80, fontSize: 11, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 110,
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  quickTitle: { fontSize: 14, fontWeight: '800' },
  quickSub: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { marginTop: SPACING.sm, fontSize: 17, fontWeight: '900' },
  filterRow: { gap: 8, paddingBottom: SPACING.xs },
  filterChip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  filterChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.primary, fontWeight: '800' },
  cycleCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    ...SHADOWS.card,
  },
  cycleTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cycleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleTitle: { fontSize: 14, fontWeight: '800' },
  cycleSub: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  mainBadge: {
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.cBFDBFE,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mainBadgeText: { color: COLORS.info, fontSize: 10, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  actionBtn: {
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  actionPrimary: {
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionPrimaryText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
});

export default CampoHubScreen;
