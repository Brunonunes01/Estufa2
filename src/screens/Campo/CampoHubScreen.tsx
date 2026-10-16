import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import EmptyState from '../../components/ui/EmptyState';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useAuth } from '../../hooks/useAuth';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { queryKeys } from '../../lib/queryClient';
import { listAllPlantios } from '../../services/plantioService';
import PermanentFieldCycleDeleteModal, {
  FieldCycleDeleteTarget,
} from './components/PermanentFieldCycleDeleteModal';

const ACTIVE_FIELD_CYCLE_STATUSES = new Set([
  'em_desenvolvimento',
  'em_crescimento',
  'em_colheita',
  'colheita_iniciada',
]);

const CampoHubScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const { canWrite, isOwner, user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    queryFn: () => listAllPlantios(targetId as string),
    enabled: !!targetId,
  });
  const plantios = plantiosQuery.data || [];
  const { data: talhoesData = [] } = useTalhoesListData(targetId);
  const talhoes = useMemo(
    () => talhoesData.filter((item) => item.status !== 'inativo'),
    [talhoesData]
  );
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] =
    useState<FieldCycleDeleteTarget | null>(null);

  const ciclosAtivos = useMemo(() => {
    const activeTalhaoIds = new Set(talhoes.map((item) => item.id));
    return plantios.filter(
      (item) =>
        !!item.talhaoId &&
        activeTalhaoIds.has(item.talhaoId) &&
        ACTIVE_FIELD_CYCLE_STATUSES.has(String(item.status || ''))
    );
  }, [plantios, talhoes]);
  const filtroTalhaoValido =
    selectedTalhaoId === 'all' ||
    talhoes.some((item) => item.id === selectedTalhaoId);
  const talhaoFiltroId = filtroTalhaoValido ? selectedTalhaoId : 'all';
  const ciclosContexto = useMemo(
    () =>
      talhaoFiltroId === 'all'
        ? ciclosAtivos
        : ciclosAtivos.filter((item) => item.talhaoId === talhaoFiltroId),
    [ciclosAtivos, talhaoFiltroId]
  );

  const talhaoNameById = useMemo(() => {
    const map: Record<string, string> = {};
    talhoes.forEach((item) => {
      map[item.id] = item.nome;
    });
    return map;
  }, [talhoes]);

  const abrirNovoPlantio = useCallback(() => {
    if (talhoes.length === 0) {
      Alert.alert(
        'Nenhum talhão cadastrado',
        'Para iniciar um novo ciclo (plantio), você precisa primeiro definir a área (talhão) onde ele ocorrerá.\n\nDeseja criar seu primeiro talhão agora?',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Criar Talhão',
            onPress: () => navigation.navigate('TalhaoForm'),
          },
        ]
      );
      return;
    }
    if (talhoes.length === 1) {
      navigation.navigate('PlantioForm', { talhaoId: talhoes[0].id });
      return;
    }
    navigation.navigate('TalhoesList');
  }, [talhoes, navigation]);

  const abrirAtividadePorCiclo = useCallback(
    (targetScreen: 'ManejoForm' | 'AplicacaoForm' | 'CampoVendaForm') => {
      if (ciclosContexto.length === 0) {
        Alert.alert(
          'Nenhum ciclo em andamento',
          'Você precisa de um ciclo ativo para registrar manejos, aplicações ou vendas.\n\nDeseja iniciar um novo plantio agora?',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Novo Plantio', onPress: abrirNovoPlantio },
          ]
        );
        return;
      }

      if (ciclosContexto.length === 1) {
        const plantio = ciclosContexto[0];
        navigation.navigate(targetScreen, { plantioId: plantio.id });
        return;
      }

      navigation.navigate('WizardSelectPlantio', { origem: 'campo' });
    },
    [abrirNovoPlantio, ciclosContexto, navigation]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.panelBackground}
      />

      <ScreenHeaderCard
        title="Campo"
        subtitle="Operacao de campo por talhao e ciclo."
        badgeLabel="Operação"
        actionLabel={canWrite ? 'Novo Talhao' : undefined}
        actionIcon="plus"
        onPressAction={
          canWrite ? () => navigation.navigate('TalhaoForm') : undefined
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{talhoes.length}</Text>
            <Text style={styles.statLabel}>Talhoes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ciclosAtivos.length}</Text>
            <Text style={styles.statLabel}>Ciclos Ativos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ciclosContexto.length}</Text>
            <Text style={styles.statLabel}>No filtro</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              (settings.uiV2Enabled ? 138 : SPACING.xxl) + insets.bottom,
          },
        ]}
      >
        {canWrite ? (
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={abrirNovoPlantio}
            >
              <MaterialCommunityIcons
                name="sprout"
                size={22}
                color={COLORS.primary}
              />
              <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>
                Novo Plantio
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                Iniciar novo ciclo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() =>
                navigation.navigate('WizardSelectPlantio', { origem: 'campo' })
              }
            >
              <MaterialCommunityIcons
                name="clipboard-pulse-outline"
                size={22}
                color={COLORS.info}
              />
              <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>
                Assistente
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                Manejo, aplicação, venda
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => abrirAtividadePorCiclo('CampoVendaForm')}
            >
              <MaterialCommunityIcons
                name="basket-outline"
                size={22}
                color={COLORS.success}
              />
              <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>
                Colher / Vender
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                Lançamento rápido
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('TalhoesList')}
            >
              <MaterialCommunityIcons
                name="map-marker-radius-outline"
                size={22}
                color={COLORS.warning}
              />
              <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>
                Talhoes
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                Gestao de areas de campo
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Ciclos ativos
        </Text>
        {talhoes.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                talhaoFiltroId === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedTalhaoId('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  talhaoFiltroId === 'all' && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {talhoes.map((talhao) => (
              <TouchableOpacity
                key={talhao.id}
                style={[
                  styles.filterChip,
                  talhaoFiltroId === talhao.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedTalhaoId(talhao.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    talhaoFiltroId === talhao.id && styles.filterChipTextActive,
                  ]}
                >
                  {talhao.nome}
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
            description="O talhão selecionado não possui ciclos ativos no momento."
            actionLabel="Ver todos"
            onAction={() => setSelectedTalhaoId('all')}
          />
        ) : (
          ciclosContexto.map((plantio) => {
            const talhaoNome =
              talhaoNameById[plantio.talhaoId || ''] || 'Talhao';
            return (
              <View
                key={plantio.id}
                style={[
                  styles.cycleCard,
                  {
                    backgroundColor: theme.surfaceBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.cycleTop}>
                  <View style={styles.cycleIcon}>
                    <MaterialCommunityIcons
                      name="leaf"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.cycleTitle, { color: theme.textPrimary }]}
                    >
                      {plantio.cultura}{' '}
                      {plantio.variedade ? `• ${plantio.variedade}` : ''}
                    </Text>
                    <Text
                      style={[styles.cycleSub, { color: theme.textSecondary }]}
                    >
                      {plantio.codigoLote || 'Sem lote'} • {talhaoNome}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.border }]}
                    onPress={() =>
                      navigation.navigate('PlantioDetail', {
                        plantioId: plantio.id,
                      })
                    }
                  >
                    <Text
                      style={[styles.actionText, { color: theme.textPrimary }]}
                    >
                      Sobre o ciclo
                    </Text>
                  </TouchableOpacity>

                  {canWrite ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: theme.border }]}
                      onPress={() =>
                        navigation.navigate('ManejoForm', {
                          plantioId: plantio.id,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.actionText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        Manejo
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {canWrite ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: theme.border }]}
                      onPress={() =>
                        navigation.navigate('AplicacaoForm', {
                          plantioId: plantio.id,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.actionText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        Aplicação
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {canWrite ? (
                    <TouchableOpacity
                      style={styles.actionPrimary}
                      onPress={() =>
                        navigation.navigate('CampoVendaForm', {
                          plantioId: plantio.id,
                        })
                      }
                    >
                      <MaterialCommunityIcons
                        name="cash-plus"
                        size={14}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.actionPrimaryText}>Vender</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {canWrite || isOwner ? (
                  <View style={styles.cycleAdminRow}>
                    {canWrite ? (
                      <TouchableOpacity
                        style={styles.cycleAdminBtn}
                        onPress={() =>
                          navigation.navigate('PlantioForm', {
                            plantioId: plantio.id,
                            talhaoId: plantio.talhaoId,
                          })
                        }
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={14}
                          color={COLORS.primary}
                        />
                        <Text style={styles.cycleAdminText}>Editar ciclo</Text>
                      </TouchableOpacity>
                    ) : null}
                    {isOwner ? (
                      <TouchableOpacity
                        style={[styles.cycleAdminBtn, styles.cycleAdminDanger]}
                        onPress={() =>
                          setDeleteTarget({
                            id: plantio.id,
                            cultura: plantio.cultura,
                          })
                        }
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={14}
                          color={COLORS.danger}
                        />
                        <Text style={styles.cycleAdminDangerText}>
                          Excluir ciclo
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <PermanentFieldCycleDeleteModal
        target={deleteTarget}
        tenantId={targetId}
        onClose={() => setDeleteTarget(null)}
      />
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
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
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
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.md,
  },
  cycleAdminRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 10,
    elevation: 10,
  },
  cycleAdminBtn: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cycleAdminText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  cycleAdminDanger: { borderColor: COLORS.dangerSoft },
  cycleAdminDangerText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '800',
  },
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
  actionPrimaryText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default CampoHubScreen;
