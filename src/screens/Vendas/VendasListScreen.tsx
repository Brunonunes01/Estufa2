import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useClientesListData } from '../../hooks/queries/useClientesListData';
import { useEstufasListData } from '../../hooks/queries/useEstufasListData';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { queryKeys } from '../../lib/queryClient';
import { getVendaById, listAllVendas } from '../../services/vendaService';
import { listAllPlantios } from '../../services/plantioService';
import { getTotalDespesasPendentes } from '../../services/despesaService';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import {
  exportSalesAccountingExcel,
  shareCustomerSalesStatement,
  shareSalesAccountingPdf,
  shareSalesReportPdf,
} from '../../services/receiptService';
import { compartilharPDF } from '../../services/pdfService';
import { SPACING } from '../../constants/theme';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import EmptyState from '../../components/ui/EmptyState';

// Components
import VendaItemCard from './components/VendaItemCard';
import VendasSummary from './components/VendasSummary';
import VendasToolbar from './components/VendasToolbar';
import VendasHeaderStats from './components/VendasHeaderStats';
import VendasFilterModal from './components/VendasFilterModal';
import VendasReportModal from './components/VendasReportModal';

import {
  buildVendasStats,
  FinancialStatus,
  formatCurrencyBRL,
  getFinancialStatus,
  getVendaData,
  getVendaPrecoUnitario,
  getVendaQuantidade,
  getVendaTotal,
  getVendaUnidade,
  normalizeSearchText,
  toDateSafe,
} from './vendasListUtils';
import { resolveServiceErrorMessage } from '../../services/securityUiHelpers';

const VendasListScreen = ({ navigation }: any) => {
  const { canWrite, user, selectedTenantId, availableTenants, canViewCash } = useAuth();
  useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | FinancialStatus>('todos');
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null);
  const [showReportStartPicker, setShowReportStartPicker] = useState(false);
  const [showReportEndPicker, setShowReportEndPicker] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');

  const targetId = selectedTenantId || user?.uid;

  // Queries
  const vendasQuery = useQuery({
    queryKey: queryKeys.vendasList(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => listAllVendas(targetId as string),
  });
  const clientesQuery = useClientesListData(targetId);
  const caixaPessoasQuery = useQuery({
    queryKey: queryKeys.caixaPessoas(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => listCaixaPessoas(targetId as string),
  });
  const estufasQuery = useEstufasListData(targetId);
  const talhoesQuery = useTalhoesListData(targetId);
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => listAllPlantios(targetId as string),
  });
  const despesasPendentesQuery = useQuery({
    queryKey: queryKeys.despesasPendingTotal(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => getTotalDespesasPendentes(targetId as string),
  });

  const allVendas = vendasQuery.data || [];
  const clientesList = clientesQuery.data || [];
  const estufasList = estufasQuery.data?.estufas || [];
  const talhoesList = talhoesQuery.data || [];
  const plantiosList = plantiosQuery.data || [];
  const totalPagar = despesasPendentesQuery.data || 0;

  const loading = vendasQuery.isLoading || clientesQuery.isLoading;
  const refreshing = !loading && vendasQuery.isFetching;

  const refreshAll = async () => {
    await Promise.all([
      vendasQuery.refetch(),
      clientesQuery.refetch(),
      caixaPessoasQuery.refetch(),
      estufasQuery.refetch(),
      talhoesQuery.refetch(),
      plantiosQuery.refetch(),
      despesasPendentesQuery.refetch(),
    ]);
  };

  // Maps
  const clientesMap = useMemo(() => 
    Object.fromEntries(clientesList.map(c => [c.id, c.nome])), 
    [clientesList]
  );

  const caixaPessoasMap = useMemo(() => 
    Object.fromEntries((caixaPessoasQuery.data || []).map(p => [p.id, p.nome])), 
    [caixaPessoasQuery.data]
  );

  const estufasMap = useMemo(() => 
    Object.fromEntries(estufasList.map(e => [e.id, e.nome])), 
    [estufasList]
  );

  const talhoesMap = useMemo(() => 
    Object.fromEntries(talhoesList.map((t: any) => [t.id, t.nome])), 
    [talhoesList]
  );

  const plantiosCulturaMap = useMemo(() => 
    Object.fromEntries(plantiosList.map(p => [p.id, p.cultura])), 
    [plantiosList]
  );

  const plantiosMap = useMemo(() => 
    Object.fromEntries(plantiosList.map(p => [p.id, p])), 
    [plantiosList]
  );

  // Helpers
  const getClienteNome = useCallback((id?: string | null) => {
    if (!id) return 'Cliente avulso';
    return clientesMap[id] || 'Cliente não identificado';
  }, [clientesMap]);

  const getRecebidoPor = useCallback((venda: any) => {
    const id = venda?.pagamentoPara;
    if (!id) return 'Não informado';
    return caixaPessoasMap[id] || 'Pessoa do caixa';
  }, [caixaPessoasMap]);

  const getVendaProdutoNome = useCallback((venda: any) => {
    const cultura = String(venda?.cultura || '').trim();
    const culturaPlantio = String(plantiosCulturaMap[venda?.plantioId || ''] || '').trim();
    const descricaoItem = String(venda?.itens?.[0]?.descricao || '').trim();
    
    if (cultura) return cultura;
    if (culturaPlantio) return culturaPlantio;
    return descricaoItem || 'Produto não informado';
  }, [plantiosCulturaMap]);

  const getVendaLocalNome = useCallback((venda: any) => {
    if (venda.talhaoId) return talhoesMap[venda.talhaoId] || 'Talhão';
    if (venda.estufaId) return estufasMap[venda.estufaId] || 'Estufa';
    return 'Local';
  }, [talhoesMap, estufasMap]);

  const getVendaLoteNome = useCallback((venda: any) => {
    const plantio = venda.plantioId ? plantiosMap[venda.plantioId] : null;
    return String(venda.loteColheita || venda.codigoLote || plantio?.codigoLote || venda.originId || '-').trim();
  }, [plantiosMap]);

  // Filtering Logic
  const filteredVendas = useMemo(() => {
    const search = normalizeSearchText(searchText || '');

    return allVendas.filter((venda) => {
      const matchCliente =
        filterCliente === 'todos' ? true : filterCliente === 'avulso' ? !venda.clienteId : venda.clienteId === filterCliente;

      const financialStatus = getFinancialStatus(venda);
      const matchStatus = filterStatus === 'todos' || filterStatus === financialStatus;

      const dt = toDateSafe(getVendaData(venda));
      let matchDate = true;
      if (dt && (startDate || endDate)) {
        const base = new Date(dt);
        base.setHours(0, 0, 0, 0);
        const baseTime = base.getTime();
        const startTime = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const endTime = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
        if (startTime !== null && baseTime < startTime) matchDate = false;
        if (endTime !== null && baseTime > endTime) matchDate = false;
      } else if (!dt && (startDate || endDate)) {
        matchDate = false;
      }

      let matchSearch = true;
      if (search) {
        const cliente = getClienteNome(venda.clienteId);
        const estufa = estufasMap[venda.estufaId] || '';
        const talhao = talhoesMap[venda.talhaoId] || '';
        const produto = getVendaProdutoNome(venda);
        const content = normalizeSearchText(`${cliente} ${estufa} ${talhao} ${produto} ${venda.observacoes || ''}`);
        matchSearch = content.includes(search);
      }

      return matchCliente && matchStatus && matchDate && matchSearch;
    });
  }, [allVendas, filterCliente, filterStatus, startDate, endDate, searchText, getClienteNome, estufasMap, talhoesMap, getVendaProdutoNome]);

  const stats = useMemo(() => buildVendasStats(filteredVendas), [filteredVendas]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCliente !== 'todos') count += 1;
    if (filterStatus !== 'todos') count += 1;
    if (startDate) count += 1;
    if (endDate) count += 1;
    return count;
  }, [filterCliente, filterStatus, startDate, endDate]);

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return 'Período completo';
    if (startDate && endDate) return `${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`;
    if (startDate) return `A partir de ${startDate.toLocaleDateString('pt-BR')}`;
    return `Até ${endDate?.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  // Report Logic
  const reportFilteredVendas = useMemo(() => {
    return filteredVendas.filter((venda) => {
      const dt = toDateSafe(getVendaData(venda));
      if (!dt) return false;
      const base = new Date(dt).setHours(0, 0, 0, 0);
      if (reportStartDate && base < new Date(reportStartDate).setHours(0, 0, 0, 0)) return false;
      if (reportEndDate && base > new Date(reportEndDate).setHours(23, 59, 59, 999)) return false;
      if (reportStatusFilter !== 'todos' && getFinancialStatus(venda) !== reportStatusFilter) return false;
      return true;
    });
  }, [filteredVendas, reportStartDate, reportEndDate, reportStatusFilter]);

  const reportStats = useMemo(() => buildVendasStats(reportFilteredVendas), [reportFilteredVendas]);

  const reportPeriodLabel = useMemo(() => {
    const statusLabel = reportStatusFilter !== 'todos' ? ` | somente ${reportStatusFilter}s` : '';
    if (!reportStartDate && !reportEndDate) return periodLabel + statusLabel;
    if (reportStartDate && reportEndDate) return `${reportStartDate.toLocaleDateString('pt-BR')} até ${reportEndDate.toLocaleDateString('pt-BR')}${statusLabel}`;
    return (reportStartDate ? `A partir de ${reportStartDate.toLocaleDateString('pt-BR')}` : `Até ${reportEndDate?.toLocaleDateString('pt-BR')}`) + statusLabel;
  }, [periodLabel, reportEndDate, reportStartDate, reportStatusFilter]);

  // Actions
  const handleShareReport = async () => {
    let msg = `*Relatório de Vendas - SGE*\nPeriodo: ${reportPeriodLabel}\nTotal: ${formatCurrencyBRL(reportStats.totalValor)}\nRecebido: ${formatCurrencyBRL(reportStats.totalRecebido)}\nReceber: ${formatCurrencyBRL(reportStats.totalReceber)}\n`;
    try { await Share.share({ message: msg }); } catch (e) { console.error(e); }
  };

  const handleExportPdf = async (vendas = filteredVendas, label = periodLabel) => {
    if (!targetId) return;
    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const nomeProdutor = currentTenant?.ownerName || user?.name || 'Produtor';
    const statsForExport = buildVendasStats(vendas);
    try {
      await shareSalesReportPdf({
        nomeProdutor,
        nomeEstufa: 'Consolidado',
        tituloRelatorio: 'Relatório de Vendas',
        periodo: label,
        totais: {
          totalReceber: statsForExport.totalReceber,
          totalPagar,
          saldo: statsForExport.totalRecebido + statsForExport.totalReceber - totalPagar,
          totalVendido: statsForExport.totalValor,
          totalRecebido: statsForExport.totalRecebido,
          ticketMedio: statsForExport.ticketMedio,
          totalRegistros: statsForExport.totalItens,
        },
        itens: vendas.map(v => ({
          codigo: v.id.slice(0, 8),
          data: toDateSafe(getVendaData(v))?.toLocaleDateString('pt-BR') || '-',
          cliente: getClienteNome(v.clienteId),
          produto: getVendaProdutoNome(v),
          quantidade: `${getVendaQuantidade(v)} ${getVendaUnidade(v)}`,
          precoUnitario: getVendaPrecoUnitario(v),
          valor: getVendaTotal(v),
          status: getFinancialStatus(v).toUpperCase() as any,
          metodoPagamento: (v.metodoPagamento || 'N/A').toUpperCase(),
          recebidoPor: getRecebidoPor(v),
        })),
      });
    } catch (error) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'Não foi possível exportar o PDF.'));
    }
  };

  const buildAccountingData = useCallback((vendas: any[], label: string) => {
    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    return {
      empresa: currentTenant?.ownerName || user?.name || 'Produtor',
      periodo: label,
      itens: vendas.map((v) => ({
        codigo: v.id.slice(0, 8),
        data: toDateSafe(getVendaData(v))?.toLocaleDateString('pt-BR') || '-',
        cliente: getClienteNome(v.clienteId),
        documentoCliente: '',
        origem: v.originType || 'venda',
        estufa: getVendaLocalNome(v),
        lote: getVendaLoteNome(v),
        produto: getVendaProdutoNome(v),
        quantidade: `${getVendaQuantidade(v)} ${getVendaUnidade(v)}`,
        quantidadeValor: getVendaQuantidade(v),
        quantidadeUnidade: getVendaUnidade(v),
        precoUnitario: getVendaPrecoUnitario(v),
        valorTotal: getVendaTotal(v),
        metodoPagamento: (v.metodoPagamento || v.formaPagamento || 'N/A').toUpperCase(),
        status: getFinancialStatus(v).toUpperCase(),
        recebidoPor: getRecebidoPor(v),
      })),
    };
  }, [availableTenants, targetId, user?.name, getClienteNome, getVendaLocalNome, getVendaLoteNome, getVendaProdutoNome, getRecebidoPor]);

  const handleExportAccountingPdf = async (vendas = reportFilteredVendas, label = reportPeriodLabel) => {
    try {
      await shareSalesAccountingPdf(buildAccountingData(vendas, label));
    } catch (error) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'NÃ£o foi possÃ­vel exportar o PDF contÃ¡bil.'));
    }
  };

  const handleExportAccountingExcel = async (vendas = reportFilteredVendas, label = reportPeriodLabel) => {
    try {
      await exportSalesAccountingExcel(buildAccountingData(vendas, label));
    } catch (error) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'NÃ£o foi possÃ­vel exportar o Excel.'));
    }
  };

  const handleGenerateCustomerStatement = async () => {
    if (!targetId || filterCliente === 'todos' || filterCliente === 'avulso') {
      Alert.alert('Selecione um cliente', 'Escolha um cliente especÃ­fico para gerar o extrato.');
      return;
    }

    const cliente = clientesList.find((item) => item.id === filterCliente);
    if (!cliente) {
      Alert.alert('Cliente nÃ£o encontrado', 'NÃ£o foi possÃ­vel localizar o cliente selecionado.');
      return;
    }

    const vendasCliente = allVendas.filter((venda) => venda.clienteId === filterCliente);
    const vendasFinanceiras = vendasCliente.filter((venda) => getFinancialStatus(venda) !== 'cancelado');
    const totalVendido = vendasFinanceiras.reduce((acc, venda) => acc + getVendaTotal(venda), 0);
    const totalPago = vendasFinanceiras
      .filter((venda) => getFinancialStatus(venda) === 'pago')
      .reduce((acc, venda) => acc + getVendaTotal(venda), 0);
    const totalPendente = vendasFinanceiras
      .filter((venda) => getFinancialStatus(venda) === 'pendente')
      .reduce((acc, venda) => acc + getVendaTotal(venda), 0);

    const orderedVendas = [...vendasCliente].sort((a, b) => {
      const dateA = toDateSafe(getVendaData(a))?.getTime() || 0;
      const dateB = toDateSafe(getVendaData(b))?.getTime() || 0;
      return dateB - dateA;
    });

    try {
      await shareCustomerSalesStatement({
        clienteNome: cliente.nome,
        empresa: availableTenants.find((t) => t.uid === targetId)?.ownerName || user?.name || 'Produtor',
        periodo: 'HistÃ³rico completo do cliente',
        vendas: orderedVendas.map((venda) => ({
          codigo: venda.id.slice(0, 8),
          data: toDateSafe(getVendaData(venda))?.toLocaleDateString('pt-BR') || '-',
          cliente: cliente.nome,
          estufa: getVendaLocalNome(venda),
          lote: getVendaLoteNome(venda),
          produto: getVendaProdutoNome(venda),
          quantidade: `${getVendaQuantidade(venda)} ${getVendaUnidade(venda)}`,
          quantidadeValor: getVendaQuantidade(venda),
          quantidadeUnidade: getVendaUnidade(venda),
          precoUnitario: getVendaPrecoUnitario(venda),
          valorTotal: getVendaTotal(venda),
          metodoPagamento: (venda.metodoPagamento || venda.formaPagamento || 'N/A').toUpperCase(),
          status: getFinancialStatus(venda).toUpperCase(),
          recebidoPor: getRecebidoPor(venda),
        })),
        totalVendido,
        totalPago,
        totalPendente,
      });
    } catch (error) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'NÃ£o foi possÃ­vel gerar o extrato do cliente.'));
    }
  };

  const handlePrintReceiptById = async (vendaId: string, vendaFallback?: any) => {
    if (!targetId) return;
    try {
      const venda = (await getVendaById(vendaId, targetId).catch(() => null)) || vendaFallback;
      const currentTenant = availableTenants.find((t) => t.uid === targetId);
      const cliente = clientesList.find((item) => item.id === venda.clienteId) || null;
      await compartilharPDF({
        colheita: venda as any,
        cliente,
        nomeFazenda: currentTenant?.ownerName || user?.name || 'Produtor',
        nomeEstufa: estufasMap[venda.estufaId] || 'Estufa',
        cultura: getVendaProdutoNome(venda),
      });
    } catch (error) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  };

  // Rendering
  const renderItem = ({ item }: { item: any }) => (
    <VendaItemCard
      item={item}
      theme={theme}
      navigation={navigation}
      isHydroSale={item.originType === 'hydro_lote' || !!item.hydroLoteId}
      clienteNome={getClienteNome(item.clienteId)}
      produtoNome={getVendaProdutoNome(item)}
      loteNome={getVendaLoteNome(item)}
      dataVenda={getVendaData(item)}
      localLabel={item.talhaoId ? 'Talhão' : 'Estufa'}
      localNome={getVendaLocalNome(item)}
      status={getFinancialStatus(item)}
      recebidoPor={getRecebidoPor(item)}
      canWrite={canWrite}
      onPrintReceipt={handlePrintReceiptById}
      onReceive={() => navigation.navigate('ContasReceber')}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredVendas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={refreshAll}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ListHeaderComponent={
          <>
            <ScreenHeaderCard
              title="Financeiro"
              subtitle="Gestão de vendas e fluxo de caixa."
              badgeLabel="Vendas"
            >
              <VendasHeaderStats stats={stats} />
            </ScreenHeaderCard>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
              {[
                { label: 'Vendas', icon: 'cash-multiple', active: true, screen: 'VendasList' },
                { label: 'Contas', icon: 'cash-clock', screen: 'ContasReceber' },
                { label: 'Despesas', icon: 'cash-minus', screen: 'DespesasList' },
                { label: 'Caixa', icon: 'wallet-outline', screen: 'CaixaResumo', hidden: !canViewCash },
              ].filter(l => !l.hidden).map(link => (
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

            <VendasSummary
              stats={stats}
              totalPagar={totalPagar}
              periodLabel={periodLabel}
              activeFiltersLabel={activeFiltersCount > 0 ? `${activeFiltersCount} filtros` : 'Sem filtros'}
              theme={theme}
              onNavigateToContas={() => navigation.navigate('ContasReceber')}
              onNavigateToDespesas={() => navigation.navigate('DespesasList')}
            />

            <VendasToolbar
              searchText={searchText}
              onSearchChange={setSearchText}
              onShowFilters={() => setShowFilterModal(true)}
              onShowReports={() => setShowReportModal(true)}
              onExportPdf={() => handleExportPdf()}
              activeFiltersCount={activeFiltersCount}
              showStatementBtn={filterCliente !== 'todos' && filterCliente !== 'avulso'}
              onGenerateStatement={handleGenerateCustomerStatement}
              theme={theme}
            />

            <View style={styles.statusSection}>
              <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Filtrar por Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusPillsRow}>
                {(['todos', 'pendente', 'pago', 'cancelado'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusPill, filterStatus === s && { borderColor: theme.info, backgroundColor: theme.infoSoft }]}
                    onPress={() => setFilterStatus(s)}
                  >
                    <Text style={[styles.statusPillText, { color: filterStatus === s ? theme.info : theme.textSecondary }]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {loading && <ActivityIndicator size="large" color={theme.info} style={styles.loading} />}
          </>
        }
        ListEmptyComponent={!loading ? (
          <EmptyState icon="basket-off-outline" title="Nenhuma venda encontrada" description="Tente ajustar os filtros." />
        ) : null}
      />

      <VendasFilterModal
        visible={showFilterModal}
        theme={theme}
        filterCliente={filterCliente}
        setFilterCliente={setFilterCliente}
        clientesList={clientesList}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        showStartPicker={showStartPicker}
        setShowStartPicker={setShowStartPicker}
        showEndPicker={showEndPicker}
        setShowEndPicker={setShowEndPicker}
        onClose={() => setShowFilterModal(false)}
        onClear={() => { setFilterCliente('todos'); setStartDate(null); setEndDate(null); }}
      />

      <VendasReportModal
        visible={showReportModal}
        theme={theme}
        reportStats={reportStats}
        reportPeriodLabel={reportPeriodLabel}
        reportStartDate={reportStartDate}
        setReportStartDate={setReportStartDate}
        reportEndDate={reportEndDate}
        setReportEndDate={setReportEndDate}
        showReportStartPicker={showReportStartPicker}
        setShowReportStartPicker={setShowReportStartPicker}
        showReportEndPicker={showReportEndPicker}
        setShowReportEndPicker={setShowReportEndPicker}
        reportStatusFilter={reportStatusFilter}
        setReportStatusFilter={setReportStatusFilter}
        onClose={() => setShowReportModal(false)}
        onExportPdf={() => handleExportPdf(reportFilteredVendas, reportPeriodLabel)}
        onExportAccountingPdf={() => handleExportAccountingPdf(reportFilteredVendas, reportPeriodLabel)}
        onExportAccountingExcel={() => handleExportAccountingExcel(reportFilteredVendas, reportPeriodLabel)}
        onShareReport={handleShareReport}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg },
  loading: { marginVertical: 32 },
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
  statusSection: { marginTop: 20, marginBottom: 12 },
  statusTitle: { fontSize: 15, fontWeight: '900', marginBottom: 12 },
  statusPillsRow: { gap: 10 },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#E2E8F0',
  },
  statusPillText: { fontSize: 13, fontWeight: '700' },
});

export default VendasListScreen;
