import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Estufa, Plantio } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { evaluateEstufaHealth } from '../../utils/estufaHealth';
import { useEstufasListData } from '../../hooks/queries/useEstufasListData';
import { useFeedback } from '../../hooks/useFeedback';
import { useThemeMode } from '../../hooks/useThemeMode';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';

const EstufasListScreen = ({ navigation, route }: any) => {
  const { user, selectedTenantId } = useAuth();
  const theme = useThemeMode();
  const { showError, showWarning } = useFeedback();
  const mode = route?.params?.mode as 'colheita' | 'plantio' | 'manejo' | undefined;
  const targetId = selectedTenantId || user?.uid;
  const { data, isLoading, isFetching, isError, refetch } = useEstufasListData(targetId);
  const estufas: Estufa[] = data?.estufas || [];
  const plantios: Plantio[] = data?.activePlantios || [];
  const loading = isLoading || isFetching;

  useEffect(() => {
    if (isError) showError('Não foi possível carregar a lista de estufas.');
  }, [isError, showError]);

  const activePlantioByEstufa = useMemo(() => {
    const map: Record<string, Plantio | null> = {};
    estufas.forEach((estufa) => {
      map[estufa.id] =
        plantios.find(
          (plantio) => plantio.estufaId === estufa.id && plantio.status !== 'finalizado' && plantio.status !== 'cancelado'
        ) || null;
    });
    return map;
  }, [estufas, plantios]);

  const criticalCount = useMemo(
    () => estufas.filter((estufa) => evaluateEstufaHealth(estufa, plantios).level === 'critical').length,
    [estufas, plantios]
  );

  const warningCount = useMemo(
    () => estufas.filter((estufa) => evaluateEstufaHealth(estufa, plantios).level === 'warning').length,
    [estufas, plantios]
  );

  const irParaVenda = useCallback(
    (estufaId: string) => {
      const plantioAtivo = activePlantioByEstufa[estufaId];
      if (!plantioAtivo) {
        Alert.alert('Sem ciclo ativo', 'Crie um novo ciclo nesta estufa para registrar venda.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Ciclo', onPress: () => navigation.navigate('PlantioForm', { estufaId }) },
        ]);
        showWarning('Sem ciclo ativo nesta estufa.');
        return;
      }

      navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId });
    },
    [activePlantioByEstufa, navigation, showWarning]
  );

  const compartilharLocalizacao = useCallback(async (estufa: Estufa) => {
    const hasGps = !!estufa.latitude && !!estufa.longitude;
    const hasAddress = !!estufa.propriedade || !!estufa.cidade;

    if (!hasGps && !hasAddress) {
      Alert.alert('Localização indisponível', 'Para compartilhar, primeiro edite a estufa e insira as coordenadas ou a cidade.');
      return;
    }

    const mapsUrl = hasGps ? `https://maps.google.com/?q=${estufa.latitude},${estufa.longitude}` : '';
    const addressParts = [
      estufa.propriedade ? `Propriedade ${estufa.propriedade}` : '',
      estufa.cidade ? `Cidade ${estufa.cidade}` : '',
    ].filter(Boolean);

    const message = hasGps
      ? `Localização da Estufa ${estufa.nome}: ${mapsUrl}`
      : `Localização da Estufa ${estufa.nome}: ${addressParts.join(', ')}`;

    await Share.share({ message });
  }, []);

  const irParaManejo = useCallback(
    (estufaId: string) => {
      const plantioAtivo = activePlantioByEstufa[estufaId];
      if (!plantioAtivo) {
        Alert.alert('Sem ciclo ativo', 'Crie um novo ciclo nesta estufa para registrar manejo.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Ciclo', onPress: () => navigation.navigate('PlantioForm', { estufaId }) },
        ]);
        showWarning('Sem ciclo ativo nesta estufa.');
        return;
      }

      navigation.navigate('ManejoForm', { plantioId: plantioAtivo.id, estufaId });
    },
    [activePlantioByEstufa, navigation, showWarning]
  );

  const handleCardPress = useCallback(
    (estufaId: string) => {
      if (mode === 'colheita') {
        irParaVenda(estufaId);
        return;
      }
      if (mode === 'plantio') {
        navigation.navigate('PlantioForm', { estufaId });
        return;
      }
      if (mode === 'manejo') {
        irParaManejo(estufaId);
        return;
      }
      navigation.navigate('EstufaDetail', { estufaId });
    },
    [mode, irParaVenda, irParaManejo, navigation]
  );

  const headerTitle =
    mode === 'colheita'
      ? 'Onde será a colheita?'
      : mode === 'plantio'
        ? 'Escolha a estufa para o plantio'
        : mode === 'manejo'
          ? 'Onde registrar o manejo?'
          : 'Hubs de Estufa';

  const headerSubtitle =
    mode === 'colheita'
      ? 'Selecione a estufa para registrar a venda.'
      : mode === 'plantio'
        ? 'Selecione a estufa para iniciar um novo lote.'
        : mode === 'manejo'
          ? 'Selecione a estufa para abrir o diário de manejo.'
          : 'Monitore status, ciclo e venda por unidade com um toque.';

  const renderItem = ({ item }: { item: Estufa }) => {
    const isAtiva = item.status === 'ativa';
    const plantioAtivo = activePlantioByEstufa[item.id];
    const health = evaluateEstufaHealth(item, plantios);

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleCardPress(item.id)}
        style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}20` }]}>
            <MaterialCommunityIcons name="greenhouse" size={24} color={isAtiva ? COLORS.primary : COLORS.c9CA3AF} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.nome}</Text>
            <Text style={[styles.cardSubTitle, { color: theme.textSecondary }]}>Área {item.areaM2} m²</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isAtiva ? theme.successBackground : theme.warningBackground },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: isAtiva ? COLORS.success : COLORS.warning }]}>
              {item.status === 'ativa' ? 'ATIVA' : 'PARADA'}
            </Text>
          </View>
        </View>

        <View style={[styles.healthRow, { borderColor: theme.border }]}>
          <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>Saúde operacional</Text>
          <View
            style={[
              styles.healthBadge,
              {
                backgroundColor:
                  health.level === 'critical'
                    ? theme.dangerBackground
                    : health.level === 'warning'
                      ? theme.warningBackground
                      : theme.successBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.healthBadgeText,
                {
                  color:
                    health.level === 'critical'
                      ? COLORS.danger
                      : health.level === 'warning'
                        ? COLORS.warning
                        : COLORS.success,
                },
              ]}
            >
              {health.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.cycleInfo, { color: theme.textPrimary }]} numberOfLines={1}>
          {plantioAtivo ? `Ciclo ativo: ${plantioAtivo.cultura}` : 'Sem ciclo ativo'}
        </Text>

        {!mode && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionIconBtn, { borderColor: theme.border }]}
              onPress={() => compartilharLocalizacao(item)}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={16} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={() => navigation.navigate('EstufaDetail', { estufaId: item.id })}
            >
              <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={() =>
                plantioAtivo
                  ? navigation.navigate('PlantioDetail', { plantioId: plantioAtivo.id })
                  : navigation.navigate('PlantioForm', { estufaId: item.id })
              }
            >
              <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>
                {plantioAtivo ? 'Ciclo' : 'Novo Ciclo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => irParaVenda(item.id)}>
              <MaterialCommunityIcons name="basket-plus" size={14} color={COLORS.textLight} />
              <Text style={styles.actionBtnPrimaryText}>Vender</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.panelBackground} />

      <ScreenHeaderCard
        title={headerTitle}
        subtitle={headerSubtitle}
        badgeLabel={mode ? 'Seleção' : 'Operação'}
        actionLabel={mode ? undefined : 'Nova Estufa'}
        actionIcon="plus"
        onPressAction={mode ? undefined : () => navigation.navigate('EstufaForm')}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{estufas.length}</Text>
            <Text style={styles.headerStatLabel}>Total</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{criticalCount}</Text>
            <Text style={styles.headerStatLabel}>Críticas</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{warningCount}</Text>
            <Text style={styles.headerStatLabel}>Atenção</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.textLight} />}
        ListHeaderComponent={
          loading ? (
            <View style={styles.skeletonWrapper}>
              <SkeletonBlock style={styles.skeletonCard} />
              <SkeletonBlock style={styles.skeletonCard} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="greenhouse"
              title="Nenhuma estufa cadastrada"
              description="Cadastre sua primeira estufa para iniciar o monitoramento."
              actionLabel="Adicionar estufa"
              onAction={() => navigation.navigate('EstufaForm')}
            />
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingBottom: 60 },
  headerStats: { flexDirection: 'row', gap: 8 },
  headerStatChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  headerStatValue: { color: COLORS.textLight, fontSize: 14, fontWeight: '900' },
  headerStatLabel: { color: COLORS.whiteAlpha80, marginTop: 2, fontSize: 10, fontWeight: '700' },
  skeletonWrapper: { marginBottom: 12, gap: 10 },
  skeletonCard: { width: '100%', height: 170, borderRadius: RADIUS.lg },

  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  cardSubTitle: { fontSize: 12, marginTop: 3, fontWeight: '600' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  healthRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: { fontSize: 11, fontWeight: '600' },
  healthBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  healthBadgeText: { fontSize: 10, fontWeight: '800' },
  cycleInfo: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  actionsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  actionBtnPrimary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
});

export default EstufasListScreen;
