import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { getVendaById, listAllVendas } from '../../services/vendaService';
import { getColheitaById } from '../../services/colheitaService';
import { getPlantioById } from '../../services/plantioService';
import { listClientes } from '../../services/clienteService';
import { listEstufas } from '../../services/estufaService';
import { getTotalDespesasPendentes } from '../../services/despesaService';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import { exportSalesAccountingExcel, shareSalesAccountingPdf, shareSalesReportPdf } from '../../services/receiptService';
import { compartilharPDF } from '../../services/pdfService';
import { Cliente } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';

type FinancialStatus = 'pendente' | 'pago' | 'cancelado';

const VendasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [allVendas, setAllVendas] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [caixaPessoasMap, setCaixaPessoasMap] = useState<Record<string, string>>({});
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [totalPagar, setTotalPagar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | FinancialStatus>('todos');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') {
      const parsed = value.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    if (typeof value?.seconds === 'number') {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getVendaQuantidade = (venda: any) => Number(venda.quantidade || venda.itens?.[0]?.quantidade || 0);
  const getVendaPrecoUnitario = (venda: any) => Number(venda.precoUnitario || venda.itens?.[0]?.valorUnitario || 0);
  const getVendaTotal = (venda: any) =>
    Number(venda.valorTotal || getVendaQuantidade(venda) * getVendaPrecoUnitario(venda));
  const getVendaData = (venda: any) => venda.dataVenda || venda.dataColheita || null;
  const getVendaUnidade = (venda: any) => venda.unidade || venda.itens?.[0]?.unidade || 'un';
  const getNormalizedStatusPagamento = (venda: any) =>
    String(venda?.statusPagamento || '')
      .trim()
      .toLowerCase();

  const getFinancialStatus = (venda: any): FinancialStatus => {
    const statusPagamento = getNormalizedStatusPagamento(venda);
    if (statusPagamento === 'cancelado') return 'cancelado';
    if (
      statusPagamento === 'pendente' ||
      statusPagamento === 'atrasado' ||
      (!statusPagamento && venda.metodoPagamento === 'prazo')
    ) {
      return 'pendente';
    }
    return 'pago';
  };

  const getClienteNome = (id?: string | null) => {
    if (!id) return 'Cliente avulso';
    if (clientesMap[id]) return clientesMap[id];
    return 'Cliente nao identificado';
  };

  const getClienteDocumento = (id?: string | null) => {
    if (!id) return null;
    const cliente = clientesList.find((item) => item.id === id);
    return cliente?.documento || null;
  };

  const getRecebidoPor = (venda: any) => {
    const id = venda?.pagamentoPara;
    if (!id) return 'Nao informado';
    return caixaPessoasMap[id] || 'Pessoa do caixa';
  };

  const getVendaProdutoNome = (venda: any) => {
    const cultura = String(venda?.cultura || '').trim();
    const descricaoItem = String(venda?.itens?.[0]?.descricao || '').trim();
    const descricaoNormalizada = descricaoItem.toLowerCase();
    const isDescricaoGenerica =
      !descricaoItem ||
      descricaoNormalizada === 'producao agricola' ||
      descricaoNormalizada === 'produção agrícola' ||
      descricaoNormalizada === 'producao hidroponica' ||
      descricaoNormalizada === 'produção hidropônica';

    if (cultura) return cultura;
    if (!isDescricaoGenerica) return descricaoItem;
    return 'Produto nao informado';
  };

  const formatDate = (timestamp: any) => {
    const d = toDate(timestamp);
    return d ? d.toLocaleDateString('pt-BR') : '-';
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const loadData = async (isRefresh = false) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    if (isRefresh) setRefreshing(true);
    else if (allVendas.length === 0) setLoading(true);

    try {
      const [vendasData, clientesData, pessoasCaixaData, estufasData, despesasPendentes] = await Promise.all([
        listAllVendas(targetId),
        listClientes(targetId),
        listCaixaPessoas(targetId),
        listEstufas(targetId),
        getTotalDespesasPendentes(targetId),
      ]);

      const cMap: Record<string, string> = {};
      clientesData.forEach((c) => {
        if (c.id) cMap[c.id] = c.nome;
      });
      setClientesMap(cMap);
      setClientesList(clientesData);

      const caixaMap: Record<string, string> = {};
      pessoasCaixaData.forEach((pessoa) => {
        if (pessoa.id) caixaMap[pessoa.id] = pessoa.nome;
      });
      setCaixaPessoasMap(caixaMap);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      void loadData();
    }
  }, [isFocused, selectedTenantId, user?.uid]);

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredVendas = useMemo(() => {
    const search = normalizeText(searchText || '');

    return allVendas.filter((venda) => {
      const matchCliente =
        filterCliente === 'todos' ? true : filterCliente === 'avulso' ? !venda.clienteId : venda.clienteId === filterCliente;

      const financialStatus = getFinancialStatus(venda);
      const matchStatus = filterStatus === 'todos' || filterStatus === financialStatus;

      const vendaData = getVendaData(venda);
      let matchDate = true;
      if (startDate || endDate) {
        if (!vendaData) {
          matchDate = false;
        } else {
          const dt = toDate(vendaData);
          if (!dt) return false;
          const base = new Date(dt);
          base.setHours(0, 0, 0, 0);

          if (startDate) {
            const min = new Date(startDate);
            min.setHours(0, 0, 0, 0);
            if (base < min) matchDate = false;
          }
          if (endDate) {
            const max = new Date(endDate);
            max.setHours(0, 0, 0, 0);
            if (base > max) matchDate = false;
          }
        }
      }

      let matchSearch = true;
      if (search) {
        const cliente = getClienteNome(venda.clienteId);
        const estufa = estufasMap[venda.estufaId] || '';
        const recebidoPor = getRecebidoPor(venda);
        const obs = venda.observacoes || '';
        const metodo = venda.metodoPagamento || venda.formaPagamento || '';
        const content = normalizeText(`${cliente} ${estufa} ${recebidoPor} ${obs} ${metodo}`);
        matchSearch = content.includes(search);
      }

      return matchCliente && matchStatus && matchDate && matchSearch;
    });
  }, [allVendas, filterCliente, filterStatus, startDate, endDate, searchText, clientesMap, estufasMap, caixaPessoasMap]);

  const stats = useMemo(() => {
    const data = {
      totalValor: 0,
      totalItens: 0,
      totalItensFinanceiros: 0,
      totalRecebido: 0,
      totalReceber: 0,
      ticketMedio: 0,
      porMetodo: {} as Record<string, number>,
    };

    filteredVendas.forEach((venda) => {
      const val = getVendaTotal(venda);
      const status = getFinancialStatus(venda);
      const ignorarFinanceiro = status === 'cancelado';

      data.totalItens += 1;
      if (ignorarFinanceiro) return;

      data.totalItensFinanceiros += 1;
      data.totalValor += val;
      if (status === 'pago') data.totalRecebido += val;
      if (status === 'pendente') data.totalReceber += val;

      const metodoRaw = String(venda.metodoPagamento || venda.formaPagamento || 'nao definido');
      const metodo = metodoRaw.charAt(0).toUpperCase() + metodoRaw.slice(1);
      data.porMetodo[metodo] = (data.porMetodo[metodo] || 0) + val;
    });

    data.ticketMedio = data.totalItensFinanceiros > 0 ? data.totalValor / data.totalItensFinanceiros : 0;
    return data;
  }, [filteredVendas]);

  const saldoAtual = stats.totalRecebido - totalPagar;
  const saldoProjetado = stats.totalRecebido + stats.totalReceber - totalPagar;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCliente !== 'todos') count += 1;
    if (filterStatus !== 'todos') count += 1;
    if (startDate) count += 1;
    if (endDate) count += 1;
    return count;
  }, [filterCliente, filterStatus, startDate, endDate]);

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return 'Periodo completo';
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('pt-BR')} ate ${endDate.toLocaleDateString('pt-BR')}`;
    }
    if (startDate) return `A partir de ${startDate.toLocaleDateString('pt-BR')}`;
    return `Ate ${endDate?.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  const clearFilters = () => {
    setFilterCliente('todos');
    setFilterStatus('todos');
    setStartDate(null);
    setEndDate(null);
    setShowFilterModal(false);
  };

  const handleShareReport = async () => {
    let msg = '*Relatorio de Vendas - SGE*\n';
    msg += '-----------------------------\n';
    msg += `Periodo: ${periodLabel}\n`;
    msg += `Total vendido: ${formatCurrency(stats.totalValor)}\n`;
    msg += `Recebido: ${formatCurrency(stats.totalRecebido)}\n`;
    msg += `A receber: ${formatCurrency(stats.totalReceber)}\n`;
    msg += `A pagar: ${formatCurrency(totalPagar)}\n`;
    msg += `Saldo atual: ${formatCurrency(saldoAtual)}\n`;
    msg += `Saldo projetado: ${formatCurrency(saldoProjetado)}\n`;
    msg += `Vendas: ${stats.totalItens}\n`;
    msg += '-----------------------------\n\n';

    msg += 'Metodos de pagamento:\n';
    Object.keys(stats.porMetodo).forEach((metodo) => {
      msg += `- ${metodo}: ${formatCurrency(stats.porMetodo[metodo])}\n`;
    });

    msg += '\nPrincipais vendas:\n';
    filteredVendas.slice(0, 10).forEach((venda) => {
      msg += `- ${getClienteNome(venda.clienteId)}: ${formatCurrency(getVendaTotal(venda))}\n`;
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
      Alert.alert('Erro', 'Usuario invalido para gerar relatorio.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const nomeProdutor = currentTenant?.ownerName || user?.name || 'Produtor';

    try {
      const totaisRelatorio = filteredVendas.reduce(
        (acc, item) => {
          const total = getVendaTotal(item);
          const status = getFinancialStatus(item);
          const ignorar = status === 'cancelado';
          if (!ignorar) acc.totalVendido += total;
          acc.totalRecebido += status === 'pago' ? total : 0;
          acc.totalReceber += status === 'pendente' ? total : 0;
          acc.totalRegistros += 1;
          return acc;
        },
        { totalVendido: 0, totalRecebido: 0, totalReceber: 0, totalRegistros: 0 }
      );

      const itens = filteredVendas.map((item) => {
      const status = getFinancialStatus(item);
      return {
          codigo: item.id,
          data: formatDate(getVendaData(item)),
          cliente: getClienteNome(item.clienteId),
          estufa: estufasMap[item.estufaId] || 'Estufa nao identificada',
          metodoPagamento: (item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
          status: status === 'pendente' ? ('PENDENTE' as const) : status === 'cancelado' ? ('CANCELADO' as const) : ('PAGO' as const),
          valor: getVendaTotal(item),
          observacoes:
            `${status === 'pago' ? `Recebido por: ${getRecebidoPor(item)}` : 'Pagamento pendente'}${item.observacoes ? `\n${item.observacoes}` : ''}`,
        };
      });

      await shareSalesReportPdf({
        nomeProdutor,
        nomeEstufa: Object.keys(estufasMap).length === 1 ? Object.values(estufasMap)[0] : 'Relatorio Consolidado',
        tituloRelatorio: 'Relatorio Gerencial de Vendas',
        periodo: periodLabel,
        observacoes: `Relatorio consolidado com ${filteredVendas.length} vendas.`,
        totais: {
          totalReceber: totaisRelatorio.totalReceber,
          totalPagar,
          saldo: totaisRelatorio.totalReceber - totalPagar,
          totalVendido: totaisRelatorio.totalVendido,
          totalRecebido: totaisRelatorio.totalRecebido,
          ticketMedio:
            totaisRelatorio.totalRegistros > 0 ? totaisRelatorio.totalVendido / totaisRelatorio.totalRegistros : 0,
          totalRegistros: totaisRelatorio.totalRegistros,
        },
        itens,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar o PDF.');
    }
  };

  const handlePrintReceiptById = async (vendaId?: string, vendaFallback?: any) => {
    if (!vendaId && !vendaFallback?.id) {
      Alert.alert('Erro', 'Venda invalida para gerar PDF.');
      return;
    }

    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuario invalido para gerar relatorio.');
      return;
    }

    try {
      const venda = (vendaId ? await getVendaById(vendaId, targetId).catch(() => null) : null) || vendaFallback;
      if (!venda) throw new Error('Registro da venda nao encontrado.');

      const currentTenant = availableTenants.find((t) => t.uid === targetId);
      const nomeFazenda = currentTenant?.ownerName || user?.name || 'Produtor';
      const cliente = clientesList.find((item) => item.id === venda.clienteId) || null;
      const plantio = venda.plantioId ? await getPlantioById(venda.plantioId, targetId).catch(() => null) : null;
      const colheita = venda.colheitaId ? await getColheitaById(venda.colheitaId, targetId).catch(() => null) : null;
      const cultura = plantio?.cultura || venda.cultura || venda.itens?.[0]?.descricao || 'Cultura nao informada';

      const vendaParaPdf = colheita
        ? {
            ...colheita,
            ...venda,
            unidade: venda.unidade || colheita.unidade,
            unidadeMedida: venda.unidadeMedida || colheita.unidadeMedida,
            loteColheita: venda.loteColheita || colheita.loteColheita,
            pesoBruto: venda.pesoBruto || colheita.pesoBruto,
            pesoLiquido: venda.pesoLiquido || colheita.pesoLiquido,
          }
        : venda;

      await compartilharPDF({
        colheita: vendaParaPdf as any,
        cliente,
        plantio,
        nomeFazenda,
        nomeEstufa: estufasMap[venda.estufaId] || 'Estufa Geral',
        cultura,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel gerar o PDF desta venda.');
    }
  };

  const handleExportAccountingPdf = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuario invalido para gerar relatorio.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const empresa = currentTenant?.ownerName || user?.name || 'Produtor';

    const itens = filteredVendas.map((item) => {
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const total = getVendaTotal(item);
      const status = getFinancialStatus(item);
      const clienteId = item.clienteId || null;
      const produto = getVendaProdutoNome(item);
      const lote = String(item.loteColheita || item.codigoLote || item.plantioId || item.colheitaId || '-');
      const recebidoPor = status === 'pago' ? getRecebidoPor(item) : '-';
      return {
        codigo: String(item.id || '-'),
        data: formatDate(getVendaData(item)),
        cliente: getClienteNome(clienteId),
        documentoCliente: getClienteDocumento(clienteId) || undefined,
        estufa: estufasMap[item.estufaId] || 'Estufa nao identificada',
        lote,
        produto,
        quantidade: `${quantidade} ${unidade}`,
        precoUnitario,
        valorTotal: total,
        metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
        status: status.toUpperCase(),
        vencimento: item.dataVencimento ? formatDate(item.dataVencimento) : '-',
        recebidoPor,
      };
    });

    try {
      await shareSalesAccountingPdf({
        empresa,
        periodo: periodLabel,
        itens,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar o relatorio contabil.');
    }
  };

  const handleExportAccountingExcel = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuario invalido para gerar relatorio.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const empresa = currentTenant?.ownerName || user?.name || 'Produtor';

    const itens = filteredVendas.map((item) => {
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const total = getVendaTotal(item);
      const status = getFinancialStatus(item);
      const clienteId = item.clienteId || null;
      const produto = getVendaProdutoNome(item);
      const lote = String(item.loteColheita || item.codigoLote || item.plantioId || item.colheitaId || '-');
      const recebidoPor = status === 'pago' ? getRecebidoPor(item) : '-';
      return {
        codigo: String(item.id || '-'),
        data: formatDate(getVendaData(item)),
        cliente: getClienteNome(clienteId),
        documentoCliente: getClienteDocumento(clienteId) || undefined,
        estufa: estufasMap[item.estufaId] || 'Estufa nao identificada',
        lote,
        produto,
        quantidade: `${quantidade} ${unidade}`,
        precoUnitario,
        valorTotal: total,
        metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
        status: status.toUpperCase(),
        vencimento: item.dataVencimento ? formatDate(item.dataVencimento) : '-',
        recebidoPor,
      };
    });

    try {
      await exportSalesAccountingExcel({
        empresa,
        periodo: periodLabel,
        itens,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar Excel contabil.');
    }
  };

  const goToContasReceber = () => navigation.navigate('ContasReceber');

  const renderStatusPill = (value: 'todos' | FinancialStatus, label: string) => {
    const active = filterStatus === value;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.statusPill,
          {
            borderColor: active ? theme.info : theme.border,
            backgroundColor: active ? theme.infoSoft : theme.surfaceBackground,
          },
        ]}
        onPress={() => setFilterStatus(value)}
      >
        <Text style={[styles.statusPillText, { color: active ? theme.info : theme.textSecondary }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const total = getVendaTotal(item);
    const quantidade = getVendaQuantidade(item);
    const precoUnitario = getVendaPrecoUnitario(item);
    const unidade = getVendaUnidade(item);
    const dataVenda = getVendaData(item);
    const clienteNome = getClienteNome(item.clienteId);
    const recebidoPor = getRecebidoPor(item);
    const estufa = estufasMap[item.estufaId] || 'Sem estufa';
    const status = getFinancialStatus(item);
    const metodo = String(item.metodoPagamento || item.formaPagamento || 'nao definido');
    const isHydroSale = item.originType === 'hydro_lote' || !!item.hydroLoteId;

    const statusTone =
      status === 'pendente'
        ? { bg: theme.dangerBackground, border: COLORS.cFECACA, text: COLORS.danger }
        : status === 'cancelado'
        ? { bg: theme.surfaceMuted, border: theme.border, text: theme.textSecondary }
        : { bg: theme.successBackground, border: COLORS.c86EFAC, text: COLORS.success };

    return (
      <View style={[styles.saleCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            isHydroSale
              ? navigation.navigate('HidroponiaVendaForm', { vendaId: item.id })
              : navigation.navigate('ColheitaForm', { vendaId: item.id, isEdit: true })
          }
        >
          <View style={styles.saleTopRow}>
            <View style={styles.saleTopLeft}>
              <Text style={[styles.saleClient, { color: theme.textPrimary }]} numberOfLines={1}>
                {clienteNome}
              </Text>
              <Text style={[styles.saleMeta, { color: theme.textSecondary }]}>
                {quantidade} {unidade} x {formatCurrency(precoUnitario)}
              </Text>
            </View>
            <Text style={[styles.saleTotal, { color: theme.textPrimary }]}>{formatCurrency(total)}</Text>
          </View>

          <View style={styles.saleBadgesRow}>
            <View style={[styles.badge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
              <Text style={[styles.badgeText, { color: statusTone.text }]}>
                {status === 'pago' ? 'PAGO' : status === 'pendente' ? 'PENDENTE' : 'CANCELADO'}
              </Text>
            </View>
            <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>{metodo.toUpperCase()}</Text>
            </View>
            {isHydroSale ? (
              <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.methodBadgeText, { color: theme.info }]}>HIDROPONIA</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.saleMeta, { color: theme.textSecondary }]}>Data: {formatDate(dataVenda)}</Text>
          <Text style={[styles.saleMeta, { color: theme.textSecondary }]}>Estufa: {estufa}</Text>
          <Text style={[styles.saleMeta, { color: theme.textSecondary }]}>
            {status === 'pago' ? `Recebido por: ${recebidoPor}` : 'Recebimento: pendente'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.saleFooter, { borderTopColor: theme.divider }]}> 
          {status === 'pendente' ? (
            <TouchableOpacity style={styles.saleFooterBtn} onPress={goToContasReceber}>
              <MaterialCommunityIcons name="cash-check" size={20} color={COLORS.success} />
              <Text style={[styles.saleFooterBtnText, { color: COLORS.success }]}>Receber</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.saleFooterBtn} onPress={() => void handlePrintReceiptById(item.id, item)}>
            <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.info} />
            <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredVendas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => void loadData(true)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : 48) + insets.bottom },
        ]}
        ListHeaderComponent={
          <>
            <ScreenHeaderCard
              title="Financeiro"
              subtitle="Gestao de vendas, recebimentos e resultado do caixa em uma tela unica."
              badgeLabel="Operacao"
            >
              <View style={styles.headerStatsRow}>
                <View style={styles.headerChip}>
                  <Text style={styles.headerChipValue}>{stats.totalItens}</Text>
                  <Text style={styles.headerChipLabel}>Vendas filtradas</Text>
                </View>
                <View style={styles.headerChip}>
                  <Text style={styles.headerChipValue}>{formatCurrency(stats.totalValor)}</Text>
                  <Text style={styles.headerChipLabel}>Valor vendido</Text>
                </View>
              </View>
            </ScreenHeaderCard>

            <View style={styles.metricsGrid}>
              <MetricCard label="Recebido" value={formatCurrency(stats.totalRecebido)} icon="cash-check" tone="success" />
              <MetricCard
                label="A receber"
                value={formatCurrency(stats.totalReceber)}
                icon="cash-clock"
                tone="warning"
                onPress={goToContasReceber}
              />
              <MetricCard
                label="A pagar"
                value={formatCurrency(totalPagar)}
                icon="cash-minus"
                tone="danger"
                onPress={() => navigation.navigate('DespesasList')}
              />
              <MetricCard
                label="Saldo atual"
                value={formatCurrency(saldoAtual)}
                icon={saldoAtual >= 0 ? 'trending-up' : 'trending-down'}
                tone={saldoAtual >= 0 ? 'success' : 'danger'}
              />
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard label="Saldo projetado" value={formatCurrency(saldoProjetado)} icon="chart-line" />
              <MetricCard label="Ticket medio" value={formatCurrency(stats.ticketMedio)} icon="calculator-variant" />
            </View>

            <View style={styles.financeLinksRow}>
              <TouchableOpacity
                style={[styles.financeLink, styles.financeLinkActive, { borderColor: theme.info }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
              >
                <Text style={[styles.financeLinkText, { color: theme.info }]}>Vendas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={() => navigation.navigate('ContasReceber')}
              >
                <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={() => navigation.navigate('DespesasList')}
              >
                <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toolbarRow}>
              <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Buscar por cliente, estufa, caixa ou observacao"
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

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
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
                style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={() => setShowReportModal(true)}
              >
                <MaterialCommunityIcons name="chart-box-outline" size={18} color={theme.info} />
                <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Resumo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={handleExportPdf}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.info} />
                <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>PDF</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusPillsRow}
            >
              {renderStatusPill('todos', 'Todos')}
              {renderStatusPill('pendente', 'Pendentes')}
              {renderStatusPill('pago', 'Pagos')}
              {renderStatusPill('cancelado', 'Cancelados')}
            </ScrollView>

            <Text style={[styles.periodText, { color: theme.textSecondary }]}>{periodLabel}</Text>

            {loading ? <ActivityIndicator size="large" color={theme.info} style={styles.loading} /> : null}
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="basket-off-outline"
              title="Nenhuma venda encontrada"
              description="Ajuste os filtros ou registre novas vendas para visualizar dados."
            />
          )
        }
      />

      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtros avancados</Text>
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

              <Text style={[styles.label, { color: theme.textSecondary }]}>Periodo</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                    {startDate ? startDate.toLocaleDateString('pt-BR') : 'Inicio'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
                </TouchableOpacity>
                <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>ate</Text>
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
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme.info }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.reportCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderTextWrap}>
                <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>Resumo gerencial</Text>
                <Text style={[styles.reportPeriod, { color: theme.textSecondary }]}>{periodLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bigStat, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.bigStatLabel, { color: theme.textSecondary }]}>Total vendido</Text>
              <Text style={[styles.bigStatValue, { color: theme.textPrimary }]}>{formatCurrency(stats.totalValor)}</Text>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Metodos de pagamento</Text>
              {Object.keys(stats.porMetodo).length === 0 ? (
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sem dados no periodo.</Text>
              ) : (
                Object.keys(stats.porMetodo).map((metodo) => (
                  <View key={metodo} style={[styles.statRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{metodo}</Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                      {formatCurrency(stats.porMetodo[metodo])}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: theme.info }]} onPress={handleExportPdf}>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Exportar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.secondary }]}
                onPress={handleExportAccountingPdf}
              >
                <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>PDF Contabil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleExportAccountingExcel}
              >
                <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Excel (.xlsx)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.whatsapp }]}
                onPress={handleShareReport}
              >
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
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  loading: { marginTop: 32, marginBottom: 20 },

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
    marginTop: SPACING.md,
  },

  financeLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
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

  toolbarRow: {
    marginTop: SPACING.md,
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    minHeight: 44,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 8,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 8,
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

  statusPillsRow: {
    marginTop: SPACING.sm,
    paddingBottom: 2,
    gap: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodText: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    fontSize: 12,
    fontWeight: '600',
  },

  saleCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  saleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  saleTopLeft: {
    flex: 1,
  },
  saleClient: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
  },
  saleTotal: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '900',
  },
  saleMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  saleBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  methodBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  saleFooter: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saleFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saleFooterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dateBtnText: {
    fontWeight: '600',
  },
  dateSeparator: {
    marginHorizontal: 8,
    fontWeight: '700',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 10,
  },
  clearBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearBtnText: {
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    color: COLORS.textLight,
    fontWeight: '800',
  },

  reportCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportHeaderTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  reportTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '800',
  },
  reportPeriod: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  bigStat: {
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bigStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bigStatValue: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  reportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  reportActionBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  reportActionText: {
    color: COLORS.textLight,
    fontWeight: '800',
    fontSize: 13,
  },
});

export default VendasListScreen;
