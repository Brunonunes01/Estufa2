import React, { useCallback, useEffect } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { Despesa } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDespesasList } from '../../hooks/useDespesasList';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import LoadingButton from '../../components/ui/LoadingButton';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';

const DespesasListScreen = ({ navigation }: any) => {
  const { isOwner } = useAuth();
  const theme = useThemeMode();
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

  useEffect(() => {
    if (isError) showError('Não foi possível carregar as despesas.');
  }, [isError, showError]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
              showSuccess('Despesa excluída.');
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

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <ScreenHeaderCard
        title="Financeiro de Saída"
        subtitle="Gerencie vencimentos, pagamentos e custos operacionais."
        badgeLabel="Despesas"
        actionLabel="Nova Despesa"
        actionIcon="plus"
        onPressAction={() => navigation.navigate('DespesaForm')}
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>R$ {totalGasto.toFixed(0)}</Text>
            <Text style={styles.headerStatLabel}>Total do período</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>R$ {totalPendente.toFixed(0)}</Text>
            <Text style={styles.headerStatLabel}>A pagar</Text>
          </View>
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
        data={despesas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-text-outline"
              title="Nenhuma despesa registrada"
              description="Registre sua primeira despesa para acompanhar contas pendentes."
              actionLabel="Adicionar despesa"
              onAction={() => navigation.navigate('DespesaForm')}
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
                  <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {item.dataDespesa.toDate().toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: isPendente ? theme.warningBackground : theme.successBackground }]}>
                  <Text style={[styles.statusPillText, { color: isPendente ? COLORS.warning : COLORS.success }]}>
                    {isPendente ? 'PENDENTE' : 'PAGO'}
                  </Text>
                </View>
              </View>

              <View style={[styles.moneyPanel, { backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.moneyLabel, { color: theme.textSecondary }]}>Valor</Text>
                <Text style={[styles.moneyValue, { color: COLORS.danger }]}>R$ {item.valor.toFixed(2)}</Text>
                {isPendente && item.dataVencimento ? (
                  <Text style={[styles.dueText, { color: theme.textSecondary }]}>
                    Vencimento: {item.dataVencimento.toDate().toLocaleDateString()}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.actionsRow, { borderTopColor: theme.divider }]}>
                {isOwner ? (
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

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DespesaForm')}>
        <MaterialCommunityIcons name="plus" size={30} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 90, paddingTop: SPACING.md },
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
  date: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontWeight: '800' },

  moneyPanel: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  moneyLabel: { fontSize: 11, fontWeight: '700' },
  moneyValue: { marginTop: 3, fontSize: 22, fontWeight: '900' },
  dueText: { marginTop: 4, fontSize: 11, fontWeight: '600' },

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
