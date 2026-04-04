import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { getColheitaById, listAllColheitas } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { listEstufas } from '../../services/estufaService';
import { getTotalDespesasPendentes } from '../../services/despesaService';
import { shareSalesReportPdf, shareVendaReceipt } from '../../services/receiptService';
import { Cliente, Colheita } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';

const VendasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, availableTenants } = useAuth();
  const theme = useThemeMode();
  const isFocused = useIsFocused();

  const [allVendas, setAllVendas] = useState<Colheita[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [totalPagar, setTotalPagar] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterObs, setFilterObs] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadData = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    if (allVendas.length === 0) setLoading(true);

    try {
      const [vendasData, clientesData, estufasData, despesasPendentes] = await Promise.all([
        listAllColheitas(targetId),
        listClientes(targetId),
        listEstufas(targetId),
        getTotalDespesasPendentes(targetId),
      ]);

      const cMap: Record<string, string> = {};
      clientesData.forEach((c) => {
        if (c.id) cMap[c.id] = c.nome;
      });
      setClientesMap(cMap);
      setClientesList(clientesData);

      const eMap: Record<string, string> = {};
      estufasData.forEach((e) => {
        if (e.id) eMap[e.id] = e.nome;
      });
      setEstufasMap(eMap);

      setAllVendas(vendasData);
      setTotalPagar(despesasPendentes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, selectedTenantId]);

  const getClienteNome = (id: string | null) => {
    if (!id) return 'Cliente Avulso';
    if (clientesMap[id]) return clientesMap[id];
    if (loading && Object.keys(clientesMap).length === 0) return 'Carregando...';
    return 'Cliente Desconhecido';
  };

  const isPendenteVenda = (venda: Colheita) =>
    venda.statusPagamento === 'pendente' || (!venda.statusPagamento && venda.metodoPagamento === 'prazo');

  const filteredVendas = useMemo(() => {
    return allVendas.filter((venda) => {
      let matchCliente = true;
      if (filterCliente === 'todos') matchCliente = true;
      else if (filterCliente === 'avulso') matchCliente = !venda.clienteId;
      else matchCliente = venda.clienteId === filterCliente;

      const matchObs =
        !filterObs ||
        (venda.observacoes && venda.observacoes.toLowerCase().includes(filterObs.toLowerCase()));

      const statusVenda = isPendenteVenda(venda) ? 'pendente' : 'pago';
      const matchStatus = filterStatus === 'todos' || statusVenda === filterStatus;

      let matchDate = true;
      if (venda.dataColheita) {
        const dataVenda = venda.dataColheita.toDate
          ? venda.dataColheita.toDate()
          : new Date(venda.dataColheita.seconds * 1000);
        const dVenda = new Date(dataVenda.setHours(0, 0, 0, 0));

        if (startDate) {
          const dStart = new Date(startDate);
          dStart.setHours(0, 0, 0, 0);
          if (dVenda < dStart) matchDate = false;
        }
        if (endDate) {
          const dEnd = new Date(endDate);
          dEnd.setHours(0, 0, 0, 0);
          if (dVenda > dEnd) matchDate = false;
        }
      }

      return matchCliente && matchObs && matchStatus && matchDate;
    });
  }, [allVendas, filterCliente, filterObs, filterStatus, startDate, endDate]);

  const stats = useMemo(() => {
    const data = {
      totalValor: 0,
      totalItens: 0,
      totalRecebido: 0,
      totalReceber: 0,
      ticketMedio: 0,
      porMetodo: {} as Record<string, number>,
    };

    filteredVendas.forEach((v) => {
      const val = v.quantidade * (v.precoUnitario || 0);
      const pendente = isPendenteVenda(v);

      data.totalValor += val;
      data.totalItens += 1;
      data.totalReceber += pendente ? val : 0;
      data.totalRecebido += pendente ? 0 : val;

      const metodo = v.metodoPagamento || 'não definido';
      const metodoKey = metodo.charAt(0).toUpperCase() + metodo.slice(1);
      data.porMetodo[metodoKey] = (data.porMetodo[metodoKey] || 0) + val;
    });

    data.ticketMedio = data.totalItens > 0 ? data.totalValor / data.totalItens : 0;
    return data;
  }, [filteredVendas]);

  const saldo = stats.totalReceber - totalPagar;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCliente !== 'todos') count += 1;
    if (filterObs.trim()) count += 1;
    if (filterStatus !== 'todos') count += 1;
    if (startDate) count += 1;
    if (endDate) count += 1;
    return count;
  }, [filterCliente, filterObs, filterStatus, startDate, endDate]);

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return 'Período completo';
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`;
    }
    if (startDate) return `A partir de ${startDate.toLocaleDateString('pt-BR')}`;
    return `Até ${endDate?.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  const clearFilters = () => {
    setFilterCliente('todos');
    setFilterObs('');
    setFilterStatus('todos');
    setStartDate(null);
    setEndDate(null);
    setShowFilterModal(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleShareReport = async () => {
    let msg = '📊 *Relatório de Vendas - SGE*\n';
    msg += '-----------------------------\n';
    msg += `🗓️ *Período:* ${periodLabel}\n`;
    msg += `💰 *Total vendido:* ${formatCurrency(stats.totalValor)}\n`;
    msg += `✅ *Recebido:* ${formatCurrency(stats.totalRecebido)}\n`;
    msg += `🕒 *A receber:* ${formatCurrency(stats.totalReceber)}\n`;
    msg += `🧾 *A pagar:* ${formatCurrency(totalPagar)}\n`;
    msg += `📈 *Saldo:* ${formatCurrency(saldo)}\n`;
    msg += `📦 *Vendas:* ${stats.totalItens}\n`;
    msg += '-----------------------------\n\n';

    msg += '*Métodos de pagamento:*\n';
    Object.keys(stats.porMetodo).forEach((metodo) => {
      msg += `• ${metodo}: ${formatCurrency(stats.porMetodo[metodo])}\n`;
    });

    msg += '\n*Principais vendas:*\n';
    filteredVendas.slice(0, 10).forEach((venda) => {
      const total = venda.quantidade * (venda.precoUnitario || 0);
      msg += `• ${getClienteNome(venda.clienteId)} - ${formatCurrency(total)}\n`;
    });

    if (filteredVendas.length > 10) {
      msg += `... e mais ${filteredVendas.length - 10} vendas.\n`;
    }

    msg += `\nGerado em: ${new Date().toLocaleString('pt-BR')}`;

    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportPdf = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar o relatório.');
      return;
    }

    // Busca o nome do produtor (dono do tenant) para o cabeçalho do PDF
    const currentTenant = availableTenants.find(t => t.uid === targetId);
    const nomeProdutor = currentTenant?.ownerName || user?.name || 'Produtor';

    try {
      const detalhes = filteredVendas.map((item) => {
        const total = item.quantidade * (item.precoUnitario || 0);
        return {
          data: formatDate(item.dataColheita),
          cliente: getClienteNome(item.clienteId),
          estufa: estufasMap[item.estufaId] || 'Estufa não identificada',
          metodoPagamento: item.metodoPagamento ? item.metodoPagamento.toUpperCase() : 'N/A',
          status: isPendenteVenda(item) ? ('PENDENTE' as const) : ('PAGO' as const),
          valor: total,
          observacoes: item.observacoes,
        };
      });

      await shareSalesReportPdf({
        nomeProdutor: nomeProdutor,
        nomeEstufa:
          Object.keys(estufasMap).length === 1 ? Object.values(estufasMap)[0] : 'Relatório Consolidado',
        tituloRelatorio: 'Relatório Gerencial de Vendas',
        periodo: periodLabel,
        observacoes:
          activeFiltersCount > 0
            ? `Relatório gerado com ${activeFiltersCount} filtro(s) ativo(s).`
            : 'Relatório sem filtros adicionais.',
        totais: {
          totalReceber: stats.totalReceber,
          totalPagar,
          saldo,
          totalVendido: stats.totalValor,
          totalRecebido: stats.totalRecebido,
          ticketMedio: stats.ticketMedio,
          totalRegistros: stats.totalItens,
        },
        itens: detalhes,
      });
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível exportar o PDF.');
    }
  };

  const handlePrintReceiptById = async (vendaId?: string) => {
    if (!vendaId) {
      Alert.alert('Erro', 'Venda inválida para geração do PDF individual.');
      return;
    }

    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar o relatório.');
      return;
    }

    try {
      const venda = await getColheitaById(vendaId, targetId);
      if (!venda) {
        Alert.alert('Erro', 'Registro da venda não encontrado.');
        return;
      }

      if (venda.userId !== targetId) {
        Alert.alert('Erro', 'A venda selecionada não pertence ao contexto atual.');
        return;
      }

      // Busca o nome do produtor (dono do tenant) para o recibo individual
      const currentTenant = availableTenants.find(t => t.uid === targetId);
      const nomeProdutor = currentTenant?.ownerName || user?.name || 'Produtor';

      await shareVendaReceipt({
        venda,
        nomeProdutor: nomeProdutor,
        nomeCliente: getClienteNome(venda.clienteId),
        nomeProduto: 'Produtos da Colheita',
        nomeEstufa: estufasMap[venda.estufaId] || 'Estufa Geral',
      });
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const renderItem = ({ item }: { item: Colheita }) => {
    const total = item.quantidade * (item.precoUnitario || 0);
    const clienteNome = getClienteNome(item.clienteId);
    const isPendente = isPendenteVenda(item);

    return (
      <View style={[styles.card, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.cardTouch}
          onPress={() => navigation.navigate('ColheitaForm', { colheitaId: item.id, isEdit: true })}
          activeOpacity={0.88}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderMain}>
              <Text style={[styles.clienteName, { color: theme.textPrimary }]} numberOfLines={1}>
                {clienteNome}
              </Text>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>Venda em {formatDate(item.dataColheita)}</Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isPendente ? theme.dangerBackground : theme.successBackground,
                  borderColor: isPendente ? COLORS.cFECACA : COLORS.c86EFAC,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: isPendente ? COLORS.danger : COLORS.success }]}>
                {isPendente ? 'PENDENTE' : 'PAGO'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.row}>
            <Text style={[styles.details, { color: theme.textSecondary }]}> 
              {item.quantidade} {item.unidade} x {formatCurrency(item.precoUnitario || 0)}
            </Text>
            <Text style={[styles.totalValue, { color: theme.textPrimary }]}>{formatCurrency(total)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.pdfIconBtn, { borderLeftColor: theme.divider }]} onPress={(event) => { event.stopPropagation?.(); void handlePrintReceiptById(item.id); }}>
          <MaterialCommunityIcons name="file-pdf-box" size={23} color={theme.info} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}> 
      <ScreenHeaderCard
        title="Relatórios de Vendas"
        subtitle="Painel gerencial com status de recebimento, saldo e exportação profissional em PDF."
        badgeLabel="Relatórios"
      >
        <View style={styles.headerStatsRow}>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipValue}>{stats.totalItens}</Text>
            <Text style={styles.headerChipLabel}>Vendas no período</Text>
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipValue}>{formatCurrency(stats.totalValor)}</Text>
            <Text style={styles.headerChipLabel}>Total vendido</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <View style={styles.metricsGrid}>
        <MetricCard label="A receber" value={formatCurrency(stats.totalReceber)} icon="cash-clock" tone="warning" />
        <MetricCard label="A pagar" value={formatCurrency(totalPagar)} icon="cash-minus" tone="danger" />
        <MetricCard
          label="Saldo"
          value={formatCurrency(saldo)}
          icon={saldo >= 0 ? 'trending-up' : 'trending-down'}
          tone={saldo >= 0 ? 'success' : 'danger'}
        />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={18} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Filtros</Text>
          {activeFiltersCount > 0 ? (
            <View style={[styles.filterCountBadge, { backgroundColor: theme.info }]}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
          onPress={() => setShowReportModal(true)}
        >
          <MaterialCommunityIcons name="chart-box-outline" size={18} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Resumo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
          onPress={handleExportPdf}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.info} />
          <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>PDF</Text>
        </TouchableOpacity>
      </View>

      {loading && allVendas.length === 0 ? (
        <ActivityIndicator size="large" color={theme.info} style={{ marginTop: 54 }} />
      ) : (
        <FlatList
          data={filteredVendas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="basket-off-outline"
              title="Nenhuma venda encontrada"
              description="Ajuste os filtros ou registre novas vendas para visualizar o relatório."
            />
          }
        />
      )}

      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}> 
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}> 
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtrar Relatório</Text>
            <ScrollView>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Cliente</Text>
              <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}> 
                <Picker selectedValue={filterCliente} onValueChange={setFilterCliente} style={{ color: theme.textPrimary }}>
                  <Picker.Item label="Todos os clientes" value="todos" />
                  <Picker.Item label="Vendas avulsas" value="avulso" />
                  {clientesList.map((c) => (
                    <Picker.Item key={c.id} label={c.nome} value={c.id} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Observação</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textPrimary }]}
                placeholder="Ex.: entrega na propriedade"
                placeholderTextColor={theme.textSecondary}
                value={filterObs}
                onChangeText={setFilterObs}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Status</Text>
              <View style={[styles.pickerWrapper, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}> 
                <Picker selectedValue={filterStatus} onValueChange={setFilterStatus} style={{ color: theme.textPrimary }}>
                  <Picker.Item label="Todos" value="todos" />
                  <Picker.Item label="Pagos" value="pago" />
                  <Picker.Item label="Pendentes" value="pendente" />
                </Picker>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Período</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                    {startDate ? startDate.toLocaleDateString('pt-BR') : 'Início'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
                </TouchableOpacity>
                <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>até</Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                    {endDate ? endDate.toLocaleDateString('pt-BR') : 'Fim'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
                </TouchableOpacity>
              </View>

              {showStartPicker ? (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, d) => {
                    setShowStartPicker(false);
                    if (d) setStartDate(d);
                  }}
                />
              ) : null}
              {showEndPicker ? (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, d) => {
                    setShowEndPicker(false);
                    if (d) setEndDate(d);
                  }}
                />
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={clearFilters}>
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.info }]} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} animationType="fade" transparent onRequestClose={() => setShowReportModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}> 
          <View style={[styles.reportCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}> 
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderTextWrap}>
                <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>Resumo Gerencial</Text>
                <Text style={[styles.reportPeriod, { color: theme.textSecondary }]}>{periodLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bigStat, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}> 
              <Text style={[styles.bigStatLabel, { color: theme.textSecondary }]}>Total Vendido</Text>
              <Text style={[styles.bigStatValue, { color: theme.textPrimary }]}>{formatCurrency(stats.totalValor)}</Text>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}> 
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Métodos de Pagamento</Text>
              {Object.keys(stats.porMetodo).length === 0 ? (
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sem dados no período.</Text>
              ) : (
                Object.keys(stats.porMetodo).map((metodo) => (
                  <View key={metodo} style={[styles.statRow, { borderBottomColor: theme.divider }]}> 
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{metodo}</Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{formatCurrency(stats.porMetodo[metodo])}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: theme.info }]} onPress={handleExportPdf}>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Exportar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: COLORS.whatsapp }]} onPress={handleShareReport}>
                <MaterialCommunityIcons name="whatsapp" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Compartilhar</Text>
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

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    ...SHADOWS.card,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: { color: COLORS.textLight, fontSize: 10, fontWeight: '800' },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.xs },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  cardTouch: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderMain: { flex: 1, paddingRight: 8 },
  clienteName: { fontSize: 16, fontWeight: '800' },
  dateText: { fontSize: 12, marginTop: 3, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '800' },
  pdfIconBtn: {
    marginLeft: 14,
    paddingLeft: 12,
    borderLeftWidth: 1,
  },

  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  pickerWrapper: { borderWidth: 1, borderRadius: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dateBtnText: { fontWeight: '600' },
  dateSeparator: { marginHorizontal: 8, fontWeight: '700', fontSize: 12 },
  modalActions: { flexDirection: 'row', marginTop: 24, gap: 10 },
  clearBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearBtnText: { fontWeight: '700' },
  applyBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { color: COLORS.textLight, fontWeight: '800' },

  reportCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeaderTextWrap: { flex: 1, paddingRight: 10 },
  reportTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800' },
  reportPeriod: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  bigStat: {
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bigStatLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  bigStatValue: { fontSize: 30, fontWeight: '900', marginTop: 4 },
  sectionBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  statLabel: { fontSize: 13, fontWeight: '600' },
  statValue: { fontSize: 13, fontWeight: '800' },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  reportActionText: { color: COLORS.textLight, fontWeight: '800', fontSize: 13 },
});

export default VendasListScreen;
