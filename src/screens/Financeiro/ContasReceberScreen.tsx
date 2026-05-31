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
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { listContasAReceber, receberConta } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { CaixaPessoa, createCaixaPessoa, listCaixaPessoas } from '../../services/caixaPessoaService';
import { Venda } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [contas, setContas] = useState<Venda[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Venda | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('pix');
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [modalCaixaVisible, setModalCaixaVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [salvandoCaixaPessoa, setSalvandoCaixaPessoa] = useState(false);

  const carregarDados = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    setLoading(true);
    try {
      const [listaContas, listaClientes, listaCaixaPessoas] = await Promise.all([
        listContasAReceber(targetId),
        listClientes(targetId),
        listCaixaPessoas(targetId),
      ]);

      const map: Record<string, string> = {};
      listaClientes.forEach((c) => {
        map[c.id] = c.nome;
      });

      setClientesMap(map);
      setContas(listaContas);
      setCaixaPessoas(listaCaixaPessoas);
      if (!pagamentoPara && listaCaixaPessoas.length > 0) {
        setPagamentoPara(listaCaixaPessoas[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId, user?.uid]);

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
    setPagamentoPara((item as any).pagamentoPara || caixaPessoas[0]?.id || null);
    setModalVisible(true);
  };

  const confirmRecebimento = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!selectedConta || !targetId) return;
    if (caixaPessoas.length > 0 && !pagamentoPara) {
      Alert.alert('Atenção', 'Selecione quem recebeu no caixa.');
      return;
    }

    setLoadingAction(true);
    try {
      await receberConta(selectedConta.id, targetId, metodoRecebimento, pagamentoPara);
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

  const handleSalvarPessoaCaixa = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    if (!novoCaixaNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome da pessoa.');
      return;
    }
    setSalvandoCaixaPessoa(true);
    try {
      const id = await createCaixaPessoa({ nome: novoCaixaNome.trim() }, targetId);
      const novaPessoa = { id, nome: novoCaixaNome.trim(), ativo: true } as CaixaPessoa;
      setCaixaPessoas((prev) => [...prev, novaPessoa].sort((a, b) => a.nome.localeCompare(b.nome)));
      setPagamentoPara(id);
      setNovoCaixaNome('');
      setModalCaixaVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar pessoa do caixa.');
    } finally {
      setSalvandoCaixaPessoa(false);
    }
  };

  const renderItem = ({ item }: { item: Venda }) => {
    const total = getVendaTotal(item);
    const primeiraLinha = item.itens?.[0];
    const quantidade = Number((item as any).quantidade || primeiraLinha?.quantidade || 0);
    const unidade = String((item as any).unidade || (primeiraLinha as any)?.unidade || 'un');
    const precoUnitario = Number((item as any).precoUnitario || primeiraLinha?.valorUnitario || 0);
    const clienteNome = item.clienteId ? clientesMap[item.clienteId] || 'Cliente desconhecido' : 'Não identificado';
    const metodoLabel = formatMetodo(item.metodoPagamento || item.formaPagamento || undefined);
    const isHydroSale = (item as any).originType === 'hydro_lote' || !!(item as any).hydroLoteId;

    return (
      <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardTouch}
          onPress={() =>
            isHydroSale
              ? navigation.navigate('HidroponiaVendaForm', { vendaId: item.id })
              : navigation.navigate('ColheitaForm', { vendaId: item.id, isEdit: true })
          }
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

      <View style={styles.financeLinksRow}>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Vendas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.financeLink, styles.financeLinkActive, { borderColor: theme.info }]}>
          <Text style={[styles.financeLinkText, { color: theme.info }]}>Contas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('DespesasList')}
        >
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.info} style={{ marginTop: 56 }} />
      ) : (
        <FlatList
          data={contas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: (settings.uiV2Enabled ? 138 : 48) + insets.bottom }]}
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
                <Text style={[styles.resumoLabel, { color: theme.textSecondary, marginTop: 10 }]}>Metodo original</Text>
                <Text style={[styles.resumoValue, { color: theme.textPrimary }]}>
                  {formatMetodo(selectedConta.metodoPagamento || selectedConta.formaPagamento || undefined)}
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

            <Text style={[styles.labelPicker, { color: theme.textPrimary }]}>Recebido por (Caixa)</Text>
            <View style={styles.dateRow}>
              <View style={[styles.pickerWrapper, { flex: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <Picker selectedValue={pagamentoPara} onValueChange={setPagamentoPara} style={{ color: theme.textPrimary }}>
                  <Picker.Item label="Selecione uma pessoa..." value={null} />
                  {caixaPessoas.map((pessoa) => (
                    <Picker.Item key={pessoa.id} label={pessoa.nome} value={pessoa.id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[styles.dateBtn, { marginLeft: 8, flex: 0, width: 54, justifyContent: 'center', borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setModalCaixaVisible(true)}
              >
                <MaterialCommunityIcons name="account-plus" size={18} color={theme.info} />
              </TouchableOpacity>
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

      <Modal
        visible={modalCaixaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCaixaVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Nova Pessoa do Caixa</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textPrimary }]}
              placeholder="Nome da pessoa"
              placeholderTextColor={theme.textSecondary}
              value={novoCaixaNome}
              onChangeText={setNovoCaixaNome}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setModalCaixaVisible(false)}
                disabled={salvandoCaixaPessoa}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.info }]}
                onPress={handleSalvarPessoaCaixa}
                disabled={salvandoCaixaPessoa}
              >
                <Text style={styles.confirmText}>{salvandoCaixaPessoa ? 'Salvando...' : 'Salvar'}</Text>
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
  financeLinksRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  financeLink: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeLinkActive: {
    backgroundColor: COLORS.infoSoft,
  },
  financeLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },

  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm },
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
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pickerWrapper: { borderWidth: 1, borderRadius: RADIUS.sm, marginBottom: 20 },
  dateBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.body,
    marginBottom: 16,
  },
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
