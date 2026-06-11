import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Despesa } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDespesasList } from '../../hooks/useDespesasList';
import { useAppSettings } from '../../hooks/useAppSettings';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import LoadingButton from '../../components/ui/LoadingButton';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import { formatDateSafe } from '../../utils/date';

const DespesasListScreen = ({ navigation }: any) => {
  const { isOwner, canWrite, user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useFeedback();
  const {
    despesas,
    totalGasto,
    totalPendente,
    loading,
    refreshing,
    isError,
    refetch,
    deleteDespesa,
    markDespesaAsPaid,
    deletingId,
    payingId,
  } = useDespesasList();
  const [caixaPessoasMap, setCaixaPessoasMap] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const load = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return;
      try {
        const pessoas = await listCaixaPessoas(targetId);
        const map: Record<string, string> = {};
        pessoas.forEach((p) => {
          map[p.id] = p.nome;
        });
        setCaixaPessoasMap(map);
      } catch (_error) {
        setCaixaPessoasMap({});
      }
    };
    void load();
  }, [selectedTenantId, user?.uid]);

  useEffect(() => {
    if (isError) showError('Não foi possível carregar as despesas.');
  }, [isError, showError]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredDespesas = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return despesas;

    return despesas.filter((item) => {
      const destino = caixaPessoasMap[item.pagamentoPara || ''] || 'não informado';
      return `${item.descricao} ${item.categoria} ${destino}`.toLowerCase().includes(search);
    });
  }, [despesas, caixaPessoasMap, searchText]);

  const handleDelete = useCallback(
    (item: Despesa) => {
      Alert.alert('Excluir', 'Remover esta despesa?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDespesa(item.id);
              showSuccess('Despesa excluida.');
            } catch {
              showError('Não foi possível excluir a despesa.');
            }
          },
        },
      ]);
    },
    [deleteDespesa, showError, showSuccess]
  );

  const handleDarBaixa = useCallback(
    (item: Despesa) => {
      Alert.alert('Dar Baixa', 'Confirmar pagamento desta conta?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await markDespesaAsPaid(item.id);
              showSuccess('Pagamento registrado.');
            } catch {
              showError('Não foi possível atualizar a despesa.');
            }
          },
        },
      ]);
    },
    [markDespesaAsPaid, showError, showSuccess]
  );

  const handleOpenComprovante = useCallback(async (url?: string | null) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Comprovante', 'Não foi possível abrir o comprovante neste dispositivo.');
        return;
      }
      await Linking.openURL(url);
    } catch (_error) {
      Alert.alert('Comprovante', 'Falha ao abrir o comprovante.');
    }
  }, []);

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'energia':
        return 'lightning-bolt';
      case 'agua':
        return 'water';
      case 'mao_de_obra':
        return 'account-hard-hat';
      case 'combustivel':
        return 'gas-station';
      case 'manutencao':
        return 'tools';
      default:
        return 'cash-minus';
    }
  };

  const renderListHeader = () => (
    <>
      <ScreenHeaderCard
        title="Financeiro de Saida"
        subtitle="Gerencie vencimentos e pagamentos com foco no que precisa de baixa."
        badgeLabel="Despesas"
        actionLabel="Nova Despesa"
        actionIcon="plus"
        onPressAction={canWrite ? () => navigation.navigate('DespesaForm') : undefined}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>R$ {totalGasto.toFixed(0)}</Text>
            <Text style={styles.headerStatLabel}>Total do periodo</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>R$ {totalPendente.toFixed(0)}</Text>
            <Text style={styles.headerStatLabel}>A pagar</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Vendas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('ContasReceber')}
        >
          <MaterialCommunityIcons name="cash-clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.financeLink, styles.financeLinkActive, { borderColor: COLORS.modDespesas }]}>
          <MaterialCommunityIcons name="cash-minus" size={16} color={COLORS.modDespesas} />
          <Text style={[styles.financeLinkText, { color: COLORS.modDespesas }]}>Despesas</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.overviewCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.overviewTopRow}>
          <View>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Saidas no periodo</Text>
            <Text style={[styles.overviewValue, { color: theme.textPrimary }]}>R$ {totalGasto.toFixed(2)}</Text>
            <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>
              {filteredDespesas.length} despesa(s) na visao atual
            </Text>
          </View>
          <View style={[styles.overviewBadge, { backgroundColor: theme.dangerBackground, borderColor: COLORS.danger }]}>
            <Text style={[styles.overviewBadgeText, { color: COLORS.danger }]}>Saida</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Total gasto" value={`R$ ${totalGasto.toFixed(2)}`} icon="cash-minus" tone="danger" />
          <MetricCard label="A pagar" value={`R$ ${totalPendente.toFixed(2)}`} icon="cash-clock" tone="warning" />
        </View>
      </View>

      <View style={[styles.toolbarCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Buscar por descrição, categoria ou destino"
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.skeletonWrapper}>
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredDespesas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: (settings.uiV2Enabled ? 138 : 96) + insets.bottom }]}
        ListHeaderComponent={renderListHeader}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-text-outline"
              title="Nenhuma despesa registrada"
              description="Registre sua primeira despesa para acompanhar contas pendentes."
              actionLabel="Adicionar despesa"
              onAction={canWrite ? () => navigation.navigate('DespesaForm') : undefined}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const isPendente = item.status === 'pendente';
          const isDeleting = deletingId === item.id;
          const isPaying = payingId === item.id;

          return (
            <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={styles.cardTopRow}>
                <View style={[styles.iconBox, { backgroundColor: `${COLORS.danger}1A` }]}>
                  <MaterialCommunityIcons name={getIcon(item.categoria) as any} size={20} color={COLORS.danger} />
                </View>
                <View style={styles.cardTitleArea}>
                  <Text style={[styles.title, { color: theme.textPrimary }]}>{item.descricao}</Text>
                  <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{item.categoria.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {formatDateSafe(item.dataDespesa)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: isPendente ? theme.warningBackground : theme.successBackground }]}>
                  <Text style={[styles.statusPillText, { color: isPendente ? COLORS.warning : COLORS.success }]}>
                    {isPendente ? 'PENDENTE' : 'PAGO'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Valor</Text>
                  <Text style={[styles.infoValueStrong, { color: COLORS.danger }]}>R$ {item.valor.toFixed(2)}</Text>
                </View>
                <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Destino</Text>
                  <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={1}>
                    {caixaPessoasMap[item.pagamentoPara || ''] || 'Não informado'}
                  </Text>
                </View>
              </View>

              <View style={[styles.metaPanel, { backgroundColor: theme.surfaceMuted }]}>
                {isPendente && item.dataVencimento ? (
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    Vencimento: {formatDateSafe(item.dataVencimento)}
                  </Text>
                ) : (
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>Pagamento ja registrado</Text>
                )}
                {item.comprovanteUrl ? (
                  <TouchableOpacity style={styles.comprovanteRow} onPress={() => void handleOpenComprovante(item.comprovanteUrl)}>
                    <MaterialCommunityIcons name="eye-outline" size={15} color={theme.info} />
                    <Text style={[styles.metaText, { color: theme.info }]}>Ver comprovante</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={[styles.actionsRow, { borderTopColor: theme.divider }]}>
                {isOwner && canWrite ? (
                  <LoadingButton
                    label="Excluir"
                    variant="neutral"
                    loading={isDeleting}
                    onPress={() => handleDelete(item)}
                    style={styles.deleteButton}
                    textStyle={styles.deleteText}
                  />
                ) : (
                  <View />
                )}

                {isPendente ? (
                  <LoadingButton
                    label="Dar baixa"
                    loading={isPaying}
                    onPress={() => handleDarBaixa(item)}
                    style={styles.payButton}
                  />
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: (settings.uiV2Enabled ? 132 : 20) + insets.bottom }]}
        onPress={canWrite ? () => navigation.navigate('DespesaForm') : undefined}
      >
        <MaterialCommunityIcons name="plus" size={30} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  headerStats: { flexDirection: 'row', gap: 8 },
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

  skeletonWrapper: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: 6, gap: 10 },
  skeletonCard: { width: '100%', height: 150, borderRadius: RADIUS.lg },

  financeLinksRow: {
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
    paddingTop: SPACING.md,
  },
  financeLink: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 96,
  },
  financeLinkActive: {
    backgroundColor: `${COLORS.modDespesas}1A`,
  },
  financeLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },

  overviewCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  overviewLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  overviewValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  overviewCaption: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  overviewBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overviewBadgeText: { fontSize: 11, fontWeight: '800' },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
  },

  toolbarCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 8,
  },

  card: {
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    padding: 14,
    ...SHADOWS.card,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleArea: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900' },
  categoryText: { marginTop: 2, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  date: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontWeight: '800' },

  infoGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  infoCard: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  infoValueStrong: { marginTop: 4, fontSize: 22, fontWeight: '900' },

  metaPanel: {
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaText: { fontSize: 11, fontWeight: '600' },
  comprovanteRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },

  actionsRow: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: { backgroundColor: 'transparent', minHeight: 34, borderWidth: 0, paddingHorizontal: 0 },
  deleteText: { color: COLORS.textGray, fontWeight: '600' },
  payButton: { minWidth: 120, minHeight: 34, backgroundColor: COLORS.success, borderWidth: 0 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.modDespesas,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});

export default DespesasListScreen;
