import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { listContasAReceber, receberConta } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { Venda } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const theme = useThemeMode();
  const isFocused = useIsFocused();

  const [contas, setContas] = useState<Venda[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Venda | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('pix');

  const carregarDados = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    setLoading(true);
    try {
      const [listaContas, listaClientes] = await Promise.all([
        listContasAReceber(targetId),
        listClientes(targetId),
      ]);

      const map: Record<string, string> = {};
      listaClientes.forEach((c) => {
        map[c.id] = c.nome;
      });

      setClientesMap(map);
      setContas(listaContas);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  const getVendaTotal = (venda: Venda) => {
    const item = venda.itens?.[0];
    const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
    return Number(venda.valorTotal || fallbackTotal || 0);
  };

  const totalPendente = useMemo(
    () => contas.reduce((acc, curr) => acc + getVendaTotal(curr), 0),
    [contas]
  );

  const ticketMedio = useMemo(() => {
    if (contas.length === 0) return 0;
    return totalPendente / contas.length;
  }, [contas.length, totalPendente]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const d = timestamp.toDate
      ? timestamp.toDate()
      : typeof timestamp.seconds === 'number'
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return d.toLocaleDateString('pt-BR');
  };

  const formatMetodo = (metodo?: string | null) => {
    if (!metodo) return 'Indefinido';
    switch (metodo) {
      case 'prazo':
        return 'Fiado / Prazo';
      case 'boleto':
        return 'Boleto';
      default:
        return metodo.charAt(0).toUpperCase() + metodo.slice(1);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleOpenReceber = (item: Venda) => {
    setSelectedConta(item);
    setMetodoRecebimento('pix');
    setModalVisible(true);
  };

  const confirmRecebimento = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!selectedConta || !targetId) return;

    setLoadingAction(true);
    try {
      await receberConta(selectedConta.id, targetId, metodoRecebimento);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(targetId) });
      queryClient.invalidateQueries({ queryKey: ['vendas-list', targetId] });
      setModalVisible(false);
      setSelectedConta(null);
      Alert.alert('Sucesso', 'Pagamento registrado e baixa efetuada.');
      carregarDados();
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o recebimento.');
    } finally {
      setLoadingAction(false);
    }
  };

  const renderItem = ({ item }: { item: Venda }) => {
    const total = getVendaTotal(item);
    const primeiraLinha = item.itens?.[0];
    const quantidade = Number((item as any).quantidade || primeiraLinha?.quantidade || 0);
    const unidade = String((item as any).unidade || (primeiraLinha as any)?.unidade || 'un');
    const precoUnitario = Number((item as any).precoUnitario || primeiraLinha?.valorUnitario || 0);
    const editTargetId = item.colheitaId || item.id;
    const clienteNome = item.clienteId ? clientesMap[item.clienteId] : 'Não identificado';
    const metodoLabel = formatMetodo(item.metodoPagamento || item.formaPagamento || undefined);

    return (
      <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardTouch}
          onPress={() => navigation.navigate('ColheitaForm', { vendaId: editTargetId, isEdit: true })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderMain}>
              <Text style={[styles.clienteName, { color: theme.textPrimary }]}>{clienteNome}</Text>
              <View style={styles.metodoRow}>
                <MaterialCommunityIcons name="credit-card-clock-outline" size={14} color={theme.info} />
                <Text style={[styles.metodoText, { color: theme.info }]}>{metodoLabel}</Text>
              </View>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>Venda em {formatDate(item.dataVenda)}</Text>
            </View>

            <View style={[styles.badge, { backgroundColor: theme.dangerBackground, borderColor: COLORS.cFECACA }]}>
              <Text style={[styles.badgeText, { color: COLORS.danger }]}>PENDENTE</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.row}>
            <Text style={[styles.details, { color: theme.textSecondary }]}>
              {quantidade} {unidade} x {formatCurrency(precoUnitario)}
            </Text>
            <Text style={[styles.totalValue, { color: theme.textPrimary }]}>{formatCurrency(total)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.receiveBtn, { backgroundColor: theme.info }]} onPress={() => handleOpenReceber(item)}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.btnText}>Receber</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <ScreenHeaderCard
        title="Contas a Receber"
        subtitle="Acompanhe pendências, priorize cobranças e registre baixa de pagamentos."
        badgeLabel="Financeiro"
      >
        <View style={styles.headerStatsRow}>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipValue}>{contas.length}</Text>
            <Text style={styles.headerChipLabel}>Contas abertas</Text>
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipValue}>{formatCurrency(totalPendente)}</Text>
            <Text style={styles.headerChipLabel}>Pendente total</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <View style={styles.metricsGrid}>
        <MetricCard label="Total pendente" value={formatCurrency(totalPendente)} icon="cash-clock" tone="warning" />
        <MetricCard label="Ticket médio" value={formatCurrency(ticketMedio)} icon="chart-line" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.info} style={{ marginTop: 56 }} />
      ) : (
        <FlatList
          data={contas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="hand-coin-outline"
              title="Nenhuma conta pendente"
              description="Todas as vendas foram recebidas no momento."
            />
          }
          renderItem={renderItem}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Receber Pagamento</Text>

            {selectedConta ? (
              <View style={[styles.resumoConta, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                <Text style={[styles.resumoLabel, { color: theme.textSecondary }]}>Cliente</Text>
                <Text style={[styles.resumoValue, { color: theme.textPrimary }]}>
                  {selectedConta.clienteId ? clientesMap[selectedConta.clienteId] : 'Avulso'}
                </Text>

                <Text style={[styles.resumoLabel, { color: theme.textSecondary, marginTop: 10 }]}>Valor total</Text>
                <Text style={[styles.resumoValuePrice, { color: theme.info }]}>
                  {formatCurrency(getVendaTotal(selectedConta))}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.labelPicker, { color: theme.textPrimary }]}>Forma de pagamento</Text>
            <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Picker
                selectedValue={metodoRecebimento}
                onValueChange={setMetodoRecebimento}
                style={{ color: theme.textPrimary }}
              >
                <Picker.Item label="Pix" value="pix" />
                <Picker.Item label="Dinheiro" value="dinheiro" />
                <Picker.Item label="Cartão" value="cartao" />
                <Picker.Item label="Boleto" value="boleto" />
                <Picker.Item label="Cheque" value="cheque" />
                <Picker.Item label="Outro" value="outro" />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setModalVisible(false)}
                disabled={loadingAction}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.info }]}
                onPress={confirmRecebimento}
                disabled={loadingAction}
              >
                <Text style={styles.confirmText}>{loadingAction ? 'Salvando...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerStatsRow: { flexDirection: 'row', gap: 8 },
  headerChip: {
    flex: 1,
    backgroundColor: COLORS.whiteAlpha12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha20,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerChipValue: { color: COLORS.textLight, fontSize: 15, fontWeight: '900' },
  headerChipLabel: { color: COLORS.whiteAlpha80, marginTop: 2, fontSize: 10, fontWeight: '700' },

  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },

  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  card: {
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  cardTouch: { width: '100%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderMain: { flex: 1, paddingRight: 8 },
  clienteName: { fontSize: TYPOGRAPHY.title, fontWeight: '800' },
  metodoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metodoText: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  dateText: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  details: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: TYPOGRAPHY.title, fontWeight: '800' },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  btnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 13 },

  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: RADIUS.lg, padding: SPACING.xl, ...SHADOWS.card },
  modalTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  resumoConta: { padding: 14, borderRadius: RADIUS.md, marginBottom: 16, borderWidth: 1 },
  resumoLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  resumoValue: { marginTop: 4, fontSize: 16, fontWeight: '800' },
  resumoValuePrice: { marginTop: 4, fontSize: 22, fontWeight: '900' },
  labelPicker: { fontSize: TYPOGRAPHY.body, fontWeight: '700', marginBottom: 8 },
  pickerWrapper: { borderWidth: 1, borderRadius: RADIUS.sm, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', fontSize: TYPOGRAPHY.body },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  confirmText: { color: COLORS.textLight, fontWeight: '700', fontSize: TYPOGRAPHY.body },
});

export default ContasReceberScreen;
