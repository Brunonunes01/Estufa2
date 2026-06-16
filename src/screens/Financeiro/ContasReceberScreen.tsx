import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
import { SPACING } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingButton from '../../components/ui/LoadingButton';

import ContaItemCard from './components/ContaItemCard';

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [contas, setContas] = useState<Venda[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Venda | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('pix');
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [modalCaixaVisible, setModalCaixaVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [salvandoCaixaPessoa, setSalvandoCaixaPessoa] = useState(false);

  const carregarDados = useCallback(async (isRefresh = false) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [listaContas, listaClientes, listaCaixaPessoas] = await Promise.all([
        listContasAReceber(targetId),
        listClientes(targetId),
        listCaixaPessoas(targetId),
      ]);

      const map: Record<string, string> = {};
      listaClientes.forEach((c) => { map[c.id] = c.nome; });

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
      setRefreshing(false);
    }
  }, [selectedTenantId, user?.uid, pagamentoPara]);

  useEffect(() => {
    if (isFocused) void carregarDados(true);
  }, [isFocused, selectedTenantId, user?.uid, carregarDados]);

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

  const filteredContas = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return contas;

    return contas.filter((item) => {
      const clienteNome = item.clienteId ? clientesMap[item.clienteId] || 'cliente desconhecido' : 'não identificado';
      const metodo = String(item.metodoPagamento || item.formaPagamento || '');
      const descricao = String(item.itens?.[0]?.descricao || '');
      return `${clienteNome} ${metodo} ${descricao}`.toLowerCase().includes(search);
    });
  }, [contas, clientesMap, searchText]);

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
      case 'prazo': return 'Fiado / Prazo';
      case 'boleto': return 'Boleto';
      case 'cheque': return 'Cheque';
      default: return metodo.charAt(0).toUpperCase() + metodo.slice(1);
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
      void carregarDados();
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
      Alert.alert('Erro', 'Não foi possível cadastrar a pessoa do caixa.');
    } finally {
      setSalvandoCaixaPessoa(false);
    }
  };

  const renderHeader = () => (
    <>
      <ScreenHeaderCard
        title="Recebimentos"
        subtitle="Gestão de vendas a prazo e cobranças pendentes."
        badgeLabel="Contas"
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{contas.length}</Text>
            <Text style={styles.headerStatLabel}>Em aberto</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{formatCurrency(totalPendente).split(',')[0]}</Text>
            <Text style={styles.headerStatLabel}>Total Pendente</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        {[
          { label: 'Vendas', icon: 'cash-multiple', screen: 'VendasList' },
          { label: 'Contas', icon: 'cash-clock', active: true, screen: 'ContasReceber' },
          { label: 'Despesas', icon: 'cash-minus', screen: 'DespesasList' },
        ].map(link => (
          <TouchableOpacity
            key={link.label}
            style={[styles.financeLink, link.active && { borderColor: theme.info, backgroundColor: theme.infoSoft }]}
            onPress={() => link.active ? null : navigation.navigate(link.screen)}
          >
            <MaterialCommunityIcons name={link.icon as any} size={16} color={link.active ? theme.info : theme.textSecondary} />
            <Text style={[styles.financeLinkText, { color: link.active ? theme.info : theme.textSecondary }]}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.metricsWrapper}>
        <MetricCard label="Pendente Total" value={formatCurrency(totalPendente)} icon="cash-clock" tone="warning" />
        <MetricCard label="Ticket Médio" value={formatCurrency(ticketMedio)} icon="chart-line" tone="info" />
      </View>

      <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Buscar cliente, produto ou forma..."
          placeholderTextColor={theme.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.info} />
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredContas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={() => void carregarDados(true)}
        ListEmptyComponent={!loading ? (
          <EmptyState 
            icon="hand-coin-outline" 
            title="Tudo em dia!" 
            description="Não há recebimentos pendentes no momento." 
          />
        ) : null}
        renderItem={({ item }) => (
          <ContaItemCard
            item={item}
            theme={theme}
            clienteNome={item.clienteId ? clientesMap[item.clienteId] || 'Cliente desconhecido' : 'Não identificado'}
            formatDate={formatDate}
            formatMetodo={formatMetodo}
            formatCurrency={formatCurrency}
            getVendaTotal={getVendaTotal}
            onReceber={handleOpenReceber}
            onPress={() => {
              const isHydro = (item as any).originType === 'hydro_lote' || !!(item as any).hydroLoteId;
              isHydro
                ? navigation.navigate('HidroponiaVendaForm', { vendaId: item.id })
                : navigation.navigate('ColheitaForm', { vendaId: item.id, isEdit: true });
            }}
          />
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Receber Pagamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedConta ? (
              <View style={[styles.resumoConta, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                <View style={styles.resumoRow}>
                  <View>
                    <Text style={[styles.resumoLabel, { color: theme.textSecondary }]}>Cliente</Text>
                    <Text style={[styles.resumoValue, { color: theme.textPrimary }]}>
                      {selectedConta.clienteId ? clientesMap[selectedConta.clienteId] : 'Avulso'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.resumoLabel, { color: theme.textSecondary }]}>Valor total</Text>
                    <Text style={[styles.resumoValuePrice, { color: theme.info }]}>
                      {formatCurrency(getVendaTotal(selectedConta))}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <Text style={[styles.resumoLabel, { color: theme.textSecondary }]}>Método original</Text>
                <Text style={[styles.resumoValue, { color: theme.textPrimary }]}>
                  {formatMetodo(selectedConta.metodoPagamento || selectedConta.formaPagamento || undefined)}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.labelPicker, { color: theme.textSecondary }]}>Forma de recebimento</Text>
            <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Picker selectedValue={metodoRecebimento} onValueChange={setMetodoRecebimento} style={{ color: theme.textPrimary }} dropdownIconColor={theme.textPrimary}>
                <Picker.Item label="Pix" value="pix" />
                <Picker.Item label="Dinheiro" value="dinheiro" />
                <Picker.Item label="Cartão" value="cartao" />
                <Picker.Item label="Boleto" value="boleto" />
                <Picker.Item label="Cheque" value="cheque" />
                <Picker.Item label="Outro" value="outro" />
              </Picker>
            </View>

            <Text style={[styles.labelPicker, { color: theme.textSecondary }]}>Recebido por (Caixa)</Text>
            <View style={styles.pickerRow}>
              <View style={[styles.pickerWrapper, { flex: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginBottom: 0 }]}>
                <Picker selectedValue={pagamentoPara} onValueChange={setPagamentoPara} style={{ color: theme.textPrimary }} dropdownIconColor={theme.textPrimary}>
                  <Picker.Item label="Selecione uma pessoa..." value={null} />
                  {caixaPessoas.map((pessoa) => (
                    <Picker.Item key={pessoa.id} label={pessoa.nome} value={pessoa.id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[styles.addCaixaBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setModalCaixaVisible(true)}
              >
                <MaterialCommunityIcons name="account-plus" size={22} color={theme.info} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <LoadingButton label="Cancelar" variant="neutral" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <LoadingButton 
                label={loadingAction ? 'Salvando...' : 'Confirmar'} 
                variant="primary" 
                onPress={confirmRecebimento} 
                loading={loadingAction}
                style={{ flex: 1.5 }} 
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalCaixaVisible} transparent animationType="fade" onRequestClose={() => setModalCaixaVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Nova Pessoa do Caixa</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textPrimary }]}
              placeholder="Nome da pessoa"
              placeholderTextColor={theme.textMuted}
              value={novoCaixaNome}
              onChangeText={setNovoCaixaNome}
              autoFocus
            />

            <View style={styles.modalActions}>
              <LoadingButton label="Cancelar" variant="neutral" onPress={() => setModalCaixaVisible(false)} style={{ flex: 1 }} />
              <LoadingButton 
                label={salvandoCaixaPessoa ? 'Salvando...' : 'Salvar'} 
                variant="primary" 
                onPress={handleSalvarPessoaCaixa} 
                loading={salvandoCaixaPessoa}
                style={{ flex: 1 }} 
              />
            </View>
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
  headerStatLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
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
  loadingWrapper: { marginVertical: 20, alignItems: 'center' },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  resumoConta: { padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1.5 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resumoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  resumoValue: { marginTop: 4, fontSize: 16, fontWeight: '800' },
  resumoValuePrice: { marginTop: 4, fontSize: 24, fontWeight: '900' },
  divider: { height: 1, marginVertical: 12 },
  labelPicker: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerWrapper: { borderWidth: 1.5, borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  pickerRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 24 },
  addCaixaBtn: { width: 54, height: 54, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalActions: { flexDirection: 'row', gap: 12 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
});

export default ContasReceberScreen;
