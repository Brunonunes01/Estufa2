import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Despesa } from '../../types/domain';
import { COLORS, SPACING } from '../../constants/theme';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useFeedback } from '../../hooks/useFeedback';
import { useDespesasList } from '../../hooks/useDespesasList';
import { useAppSettings } from '../../hooks/useAppSettings';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import {
  CaixaPessoa,
  listCaixaPessoas,
} from '../../services/caixaPessoaService';

import DespesaItemCard from './components/DespesaItemCard';

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
  } = useDespesasList(settings.activeProductionMode);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [despesaParaBaixa, setDespesaParaBaixa] = useState<Despesa | null>(
    null
  );
  const [dataPagamento, setDataPagamento] = useState(new Date());
  const [showDataPagamentoPicker, setShowDataPagamentoPicker] = useState(false);
  const [searchText, setSearchText] = useState('');

  const caixaPessoasMap = useMemo(() => {
    const map: Record<string, string> = {};
    caixaPessoas.forEach((pessoa) => {
      map[pessoa.id] = pessoa.nome;
    });
    return map;
  }, [caixaPessoas]);

  useEffect(() => {
    const load = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return;
      try {
        const pessoas = await listCaixaPessoas(targetId);
        setCaixaPessoas(pessoas);
      } catch {
        setCaixaPessoas([]);
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
      const destino =
        caixaPessoasMap[item.pagamentoPara || ''] || 'não informado';
      return `${item.descricao} ${item.categoria} ${destino}`
        .toLowerCase()
        .includes(search);
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
      if (caixaPessoas.length === 0) {
        Alert.alert(
          'Cadastre um responsável',
          'Para dar baixa, primeiro cadastre de qual caixa o pagamento saiu.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir para Caixa',
              onPress: () => navigation.navigate('CaixaResumo'),
            },
          ]
        );
        return;
      }
      setDataPagamento(new Date());
      setShowDataPagamentoPicker(false);
      setDespesaParaBaixa(item);
    },
    [caixaPessoas.length, navigation]
  );

  const handleConfirmarBaixa = useCallback(
    async (pagamentoPara: string) => {
      if (!despesaParaBaixa) return;
      try {
        await markDespesaAsPaid({
          despesaId: despesaParaBaixa.id,
          pagamentoPara,
          dataPagamento,
        });
        setDespesaParaBaixa(null);
        showSuccess('Pagamento registrado no caixa selecionado.');
      } catch {
        showError('Não foi possível atualizar a despesa.');
      }
    },
    [dataPagamento, despesaParaBaixa, markDespesaAsPaid, showError, showSuccess]
  );

  const handleOpenComprovante = useCallback(async (url?: string | null) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          'Comprovante',
          'Não foi possível abrir o comprovante neste dispositivo.'
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Comprovante', 'Falha ao abrir o comprovante.');
    }
  }, []);

  const renderHeader = () => (
    <>
      <ScreenHeaderCard
        title="Financeiro"
        subtitle="Controle de saídas e vencimentos."
        badgeLabel="Despesas"
        actionLabel="Nova Despesa"
        actionIcon="plus"
        onPressAction={
          canWrite ? () => navigation.navigate('DespesaForm') : undefined
        }
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>
              R$ {totalGasto.toFixed(0)}
            </Text>
            <Text style={styles.headerStatLabel}>Total Saídas</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>
              R$ {totalPendente.toFixed(0)}
            </Text>
            <Text style={styles.headerStatLabel}>A Pagar</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.financeLinksRow}
      >
        {[
          { label: 'Vendas', icon: 'cash-multiple', screen: 'VendasList' },
          { label: 'Contas', icon: 'cash-clock', screen: 'ContasReceber' },
          {
            label: 'Despesas',
            icon: 'cash-minus',
            active: true,
            screen: 'DespesasList',
          },
        ].map((link) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.financeLink,
              link.active && {
                borderColor: COLORS.modDespesas,
                backgroundColor: `${COLORS.modDespesas}15`,
              },
            ]}
            onPress={() =>
              link.active
                ? null
                : link.label === 'Contas'
                  ? navigation.navigate('MainTabs', {
                      screen: 'FinanceiroTab',
                      params: { filter: 'receber' },
                    })
                  : navigation.navigate(link.screen)
            }
          >
            <MaterialCommunityIcons
              name={link.icon as any}
              size={16}
              color={link.active ? COLORS.modDespesas : theme.textSecondary}
            />
            <Text
              style={[
                styles.financeLinkText,
                {
                  color: link.active ? COLORS.modDespesas : theme.textSecondary,
                },
              ]}
            >
              {link.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.metricsWrapper}>
        <MetricCard
          label="Saídas Totais"
          value={`R$ ${totalGasto.toFixed(2)}`}
          icon="cash-minus"
          tone="danger"
        />
        <MetricCard
          label="Em Aberto"
          value={`R$ ${totalPendente.toFixed(2)}`}
          icon="cash-clock"
          tone="warning"
        />
      </View>

      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Buscar descrição, categoria ou destino..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && (
        <View style={styles.loadingWrapper}>
          <SkeletonBlock style={styles.skeleton} />
          <SkeletonBlock style={styles.skeleton} />
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredDespesas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing && !loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-text-outline"
              title="Nenhuma despesa"
              description="Registre saídas para acompanhar seu fluxo."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <DespesaItemCard
            item={item}
            theme={theme}
            isOwner={isOwner}
            canWrite={canWrite}
            deletingId={deletingId}
            payingId={payingId}
            onDelete={handleDelete}
            onPay={handleDarBaixa}
            onOpenComprovante={handleOpenComprovante}
            caixaPessoaNome={
              caixaPessoasMap[item.pagamentoPara || ''] || 'Não informado'
            }
          />
        )}
      />

      {canWrite && (
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: (settings.uiV2Enabled ? 130 : 20) + insets.bottom },
          ]}
          onPress={() => navigation.navigate('DespesaForm')}
        >
          <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={!!despesaParaBaixa}
        transparent
        animationType="fade"
        onRequestClose={() => setDespesaParaBaixa(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surfaceBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  De qual caixa saiu?
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: theme.textSecondary }]}
                >
                  {despesaParaBaixa?.descricao} · R${' '}
                  {Number(despesaParaBaixa?.valor || 0).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDespesaParaBaixa(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalHint, { color: theme.textSecondary }]}>
              Selecione o responsável para esta saída aparecer corretamente no
              extrato individual.
            </Text>

            <Text
              style={[styles.modalFieldLabel, { color: theme.textSecondary }]}
            >
              Data efetiva do pagamento
            </Text>
            <TouchableOpacity
              style={[
                styles.paymentDateButton,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowDataPagamentoPicker(true)}
              disabled={!!payingId}
            >
              <MaterialCommunityIcons
                name="calendar-check-outline"
                size={20}
                color={COLORS.modDespesas}
              />
              <Text
                style={[styles.paymentDateText, { color: theme.textPrimary }]}
              >
                {dataPagamento.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>

            {showDataPagamentoPicker ? (
              <DateTimePicker
                value={dataPagamento}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  setShowDataPagamentoPicker(false);
                  if (selectedDate) setDataPagamento(selectedDate);
                }}
              />
            ) : null}

            {caixaPessoas.map((pessoa) => (
              <TouchableOpacity
                key={pessoa.id}
                style={[
                  styles.personOption,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => void handleConfirmarBaixa(pessoa.id)}
                disabled={!!payingId}
              >
                <View style={styles.personOptionIcon}>
                  <MaterialCommunityIcons
                    name="account-cash-outline"
                    size={20}
                    color={COLORS.modDespesas}
                  />
                </View>
                <Text
                  style={[
                    styles.personOptionText,
                    { color: theme.textPrimary },
                  ]}
                >
                  {pessoa.nome}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg },
  headerStats: { flexDirection: 'row', gap: 8 },
  headerStatChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerStatValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  headerStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  financeLinksRow: { gap: 10, marginTop: 16, paddingRight: 20 },
  financeLink: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
    borderColor: '#E2E8F0',
  },
  financeLinkText: { fontSize: 13, fontWeight: '800' },
  metricsWrapper: { flexDirection: 'row', gap: 10, marginTop: 16 },
  searchWrapper: {
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' },
  loadingWrapper: { gap: 12, marginTop: 10 },
  skeleton: { height: 160, borderRadius: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.modDespesas,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.modDespesas,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  modalSubtitle: { marginTop: 4, fontSize: 13, fontWeight: '700' },
  modalHint: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  modalFieldLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentDateButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentDateText: { fontSize: 14, fontWeight: '800' },
  personOption: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${COLORS.modDespesas}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personOptionText: { flex: 1, fontSize: 14, fontWeight: '800' },
});

export default DespesasListScreen;
