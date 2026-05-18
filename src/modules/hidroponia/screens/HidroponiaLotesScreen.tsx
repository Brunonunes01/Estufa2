import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeaderCard from '../../../components/ui/ScreenHeaderCard';
import EmptyState from '../../../components/ui/EmptyState';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import HidroponiaStageChip from '../components/HidroponiaStageChip';
import { useHidroponiaLotes } from '../hooks/useHidroponiaLotes';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { HydroLoteStage, HydroLoteStatus } from '../types';
import { formatHydroDate } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaLotes'>;
type Filter = 'all' | HydroLoteStatus;

const STATUS_FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'concluido', label: 'Concluídos' },
  { value: 'cancelado', label: 'Cancelados' },
];

const stageFromStatus = (status: HydroLoteStatus): HydroLoteStage =>
  status === 'concluido' ? 'colhido' : status === 'cancelado' ? 'cancelado' : 'crescimento_final';

const HidroponiaLotesScreen = ({ navigation, route }: Props) => {
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const estufaId = route.params?.estufaId;
  const { lotes, loading, error, refetch } = useHidroponiaLotes(estufaId);
  const [filter, setFilter] = useState<Filter>('all');

  const filteredLotes = useMemo(
    () => (filter === 'all' ? lotes : lotes.filter((lote) => lote.status === filter)),
    [filter, lotes]
  );

  const activeCount = lotes.filter((lote) => lote.status === 'ativo').length;
  const doneCount = lotes.filter((lote) => lote.status === 'concluido').length;

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeaderCard
        title="Hidroponia"
        subtitle="Produções por setor e histórico operacional."
        badgeLabel={`${activeCount} ativos`}
        actionLabel="Iniciar"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('HidroponiaLoteForm', estufaId ? { estufaId } : undefined)}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{lotes.length}</Text>
            <Text style={styles.statLabel}>Produções</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{doneCount}</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
          <TouchableOpacity style={styles.catalogBtn} onPress={() => navigation.navigate('HidroponiaVerduras')}>
            <MaterialCommunityIcons name="sprout" size={18} color={COLORS.textLight} />
            <Text style={styles.catalogBtnText}>Verduras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.readingBtn} onPress={() => navigation.navigate('HidroponiaLeituraForm', estufaId ? { estufaId } : undefined)}>
            <MaterialCommunityIcons name="chart-bell-curve" size={18} color={COLORS.textLight} />
            <Text style={styles.readingBtnText}>pH/CE</Text>
          </TouchableOpacity>
          {estufaId ? (
            <TouchableOpacity style={styles.layoutBtn} onPress={() => navigation.navigate('HidroponiaEstufaLayout', { estufaId })}>
              <MaterialCommunityIcons name="table-row" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScreenHeaderCard>

      <View style={styles.moduleLinksRow}>
        <TouchableOpacity style={[styles.moduleLink, styles.moduleLinkActive]}>
          <Text style={[styles.moduleLinkText, { color: COLORS.info }]}>Hidroponia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('HidroponiaMotores', estufaId ? { estufaId } : undefined)}
        >
          <Text style={styles.moduleLinkText}>Motores</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <Text style={styles.moduleLinkText}>Financeiro</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
            onPress={() => setFilter(item.value)}
          >
            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Não foi possível carregar as produções.</Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filteredLotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xxl) + insets.bottom },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="sprout-outline"
            title="Nenhuma produção hidropônica"
            description="Inicie a primeira produção para acompanhar fases, leituras e colheita."
            actionLabel="Iniciar produção"
            onAction={() => navigation.navigate('HidroponiaLoteForm', estufaId ? { estufaId } : undefined)}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HidroponiaLoteDetail', { loteId: item.id })}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.nomeOperacional || 'Produção hidropônica'}</Text>
                <Text style={styles.cardSub}>{item.codigoLote}</Text>
              </View>
              <HidroponiaStageChip stage={stageFromStatus(item.status)} />
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Setor: {item.setorId || '-'}</Text>
              <Text style={styles.metaText}>Status: {item.status}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Estufa: {item.estufaId}</Text>
              <Text style={styles.metaText}>Saldo livre: {Number(item.saldoDisponivel || 0)} un</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Criado: {formatHydroDate(item.createdAt)}</Text>
              <Text style={styles.metaText}>Atualizado: {formatHydroDate(item.updatedAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  statBox: { flex: 1, backgroundColor: COLORS.rgba255255255018, borderRadius: RADIUS.md, padding: 10 },
  statValue: { color: COLORS.textLight, fontWeight: '900', fontSize: 20 },
  statLabel: { color: COLORS.whiteAlpha80, fontSize: 11, fontWeight: '700' },
  catalogBtn: { height: 48, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catalogBtnText: { color: COLORS.textLight, fontWeight: '800' },
  readingBtn: { height: 48, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  readingBtnText: { color: COLORS.textLight, fontWeight: '800' },
  layoutBtn: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  moduleLinksRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  moduleLink: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleLinkActive: {
    borderColor: COLORS.info,
    backgroundColor: COLORS.infoSoft,
  },
  moduleLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: SPACING.lg, paddingBottom: SPACING.sm },
  filterChip: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 7 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.textLight },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: 12, ...SHADOWS.card },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '900', color: COLORS.textPrimary },
  cardSub: { marginTop: 3, color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  varietyText: { marginTop: 8, color: COLORS.textMuted, fontSize: 12 },
  errorBox: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cFECACA, backgroundColor: COLORS.dangerBg, padding: SPACING.md },
  errorText: { color: COLORS.danger, fontWeight: '700' },
  retryText: { color: COLORS.info, marginTop: 6, fontWeight: '800' },
});

export default HidroponiaLotesScreen;
