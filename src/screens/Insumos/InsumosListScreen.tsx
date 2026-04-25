import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Insumo } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useInsumosList } from '../../hooks/useInsumosList';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';

const InsumosListScreen = ({ navigation }: any) => {
  const theme = useThemeMode();
  const { showError } = useFeedback();
  const { insumos, lowStockCount, loading, refreshing, isError, refetch } = useInsumosList();

  useEffect(() => {
    if (isError) showError('Não foi possível carregar os insumos.');
  }, [isError, showError]);

  const renderItem = ({ item }: { item: Insumo }) => {
    const minimo = item.estoqueMinimo ?? 0;
    const hasMinimo = item.estoqueMinimo !== null && item.estoqueMinimo !== undefined;
    const isLowStock = hasMinimo && item.estoqueAtual <= minimo;
    const ratio = minimo > 0 ? Math.min(item.estoqueAtual / minimo, 1.6) : 1;
    const ratioPercent = `${Math.max(ratio * 100, 8)}%` as `${number}%`;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
        activeOpacity={0.95}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: `${COLORS.primary}1A` }]}>
            <MaterialCommunityIcons
              name={item.tipo === 'defensivo' ? 'bottle-tonic-skull' : 'sack'}
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.cardMain}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.nome}</Text>
            <Text style={[styles.cardType, { color: theme.textSecondary }]}>{item.tipo.toUpperCase()}</Text>
          </View>

          <View
            style={[
              styles.stockFlag,
              { backgroundColor: isLowStock ? theme.dangerBackground : theme.successBackground },
            ]}
          >
            <Text style={[styles.stockFlagText, { color: isLowStock ? COLORS.danger : COLORS.success }]}>
              {isLowStock ? 'BAIXO' : 'OK'}
            </Text>
          </View>
        </View>

        <View style={[styles.stockPanel, { backgroundColor: theme.surfaceMuted }]}>
          <View style={styles.stockTopLine}>
            <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>Estoque Atual</Text>
            <Text style={[styles.stockValue, { color: isLowStock ? COLORS.danger : theme.textPrimary }]}>
              {item.estoqueAtual} {item.unidadePadrao}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: ratioPercent,
                  backgroundColor: isLowStock ? COLORS.danger : COLORS.success,
                },
              ]}
            />
          </View>
          <Text style={[styles.minimumText, { color: theme.textSecondary }]}>
            Mínimo recomendado: {minimo} {item.unidadePadrao}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.cardActionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
            onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })}
          >
            <Text style={[styles.cardActionText, { color: theme.textPrimary }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardActionBtn, styles.cardActionPrimary]}
            onPress={() => navigation.navigate('InsumoEntry', { preselectedInsumoId: item.id })}
          >
            <Text style={[styles.cardActionText, { color: COLORS.textLight }]}>Entrada</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <ScreenHeaderCard
        title="Insumos e Estoque"
        subtitle="Acompanhe níveis críticos e faça reposição com agilidade."
        badgeLabel="Estoque"
        actionLabel="Novo Item"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('InsumoForm')}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{insumos.length}</Text>
            <Text style={styles.headerStatLabel}>Itens ativos</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{lowStockCount}</Text>
            <Text style={styles.headerStatLabel}>Estoque baixo</Text>
          </View>
          <TouchableOpacity style={styles.entryChip} onPress={() => navigation.navigate('InsumoEntry')}>
            <MaterialCommunityIcons name="arrow-down-bold-box" size={16} color={COLORS.textLight} />
            <Text style={styles.entryChipText}>Entrada</Text>
          </TouchableOpacity>
        </View>
      </ScreenHeaderCard>

      {loading ? (
        <View style={styles.skeletonWrapper}>
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
        </View>
      ) : null}

      <FlatList
        data={insumos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="flask-outline"
              title="Nenhum insumo cadastrado"
              description="Cadastre seus insumos para controlar estoque e custo médio."
              actionLabel="Adicionar insumo"
              onAction={() => navigation.navigate('InsumoForm')}
            />
          ) : null
        }
        renderItem={renderItem}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('InsumoForm')}>
        <MaterialCommunityIcons name="plus" size={32} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingBottom: 90, paddingTop: SPACING.md },
  headerStats: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerStatChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerStatValue: { color: COLORS.textLight, fontSize: 15, fontWeight: '900' },
  headerStatLabel: { color: COLORS.whiteAlpha80, marginTop: 2, fontSize: 10, fontWeight: '700' },
  entryChip: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryChipText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },

  skeletonWrapper: { paddingHorizontal: SPACING.lg, gap: 10, marginTop: SPACING.md, marginBottom: 8 },
  skeletonCard: { width: '100%', height: 144, borderRadius: RADIUS.lg },

  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMain: { flex: 1, paddingLeft: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  cardType: { marginTop: 2, fontSize: 11, fontWeight: '700' },
  stockFlag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  stockFlagText: { fontSize: 10, fontWeight: '800' },

  stockPanel: { marginTop: 12, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  stockTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLabel: { fontSize: 11, fontWeight: '700' },
  stockValue: { fontSize: 15, fontWeight: '900' },
  progressTrack: { marginTop: 8, height: 7, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  minimumText: { marginTop: 7, fontSize: 11, fontWeight: '600' },
  cardActions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  cardActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cardActionText: { fontSize: 12, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});

export default InsumosListScreen;
