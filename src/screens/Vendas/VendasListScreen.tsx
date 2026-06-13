import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useClientesListData } from '../../hooks/queries/useClientesListData';
import { useEstufasListData } from '../../hooks/queries/useEstufasListData';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { queryKeys } from '../../lib/queryClient';
import { getVendaById, listAllVendas } from '../../services/vendaService';
import { getColheitaById } from '../../services/colheitaService';
import { getPlantioById, listAllPlantios } from '../../services/plantioService';
import { getTotalDespesasPendentes } from '../../services/despesaService';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import {
  exportSalesAccountingExcel,
  shareCustomerSalesStatement,
  shareSalesAccountingPdf,
  shareSalesReportPdf,
} from '../../services/receiptService';
import { compartilharPDF } from '../../services/pdfService';
import { Cliente } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import EmptyState from '../../components/ui/EmptyState';
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

const VendasListScreen = ({ navigation }: any) => {
  const { canWrite, user, selectedTenantId, availableTenants, canViewCash } = useAuth();
  const { settings } = useAppSettings();
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

  const vendasQuery = useQuery({
    queryKey: queryKeys.vendasList(targetId || 'none'),
    enabled: !!targetId,
    staleTime: 1000 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listAllVendas(targetId as string),
  });
  const clientesQuery = useClientesListData(targetId);
  const caixaPessoasQuery = useQuery({
    queryKey: queryKeys.caixaPessoas(targetId || 'none'),
    enabled: !!targetId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listCaixaPessoas(targetId as string),
  });
  const estufasQuery = useEstufasListData(targetId);
  const talhoesQuery = useTalhoesListData(targetId);
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    enabled: !!targetId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => listAllPlantios(targetId as string),
  });
  const despesasPendentesQuery = useQuery({
    queryKey: queryKeys.despesasPendingTotal(targetId || 'none'),
    enabled: !!targetId,
    staleTime: 1000 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: () => getTotalDespesasPendentes(targetId as string),
  });

  const allVendas = vendasQuery.data || [];
  const clientesList = clientesQuery.data || [];
  const estufasList = estufasQuery.data?.estufas || [];
  const talhoesList = talhoesQuery.data || [];
  const plantiosList = plantiosQuery.data || [];
  const totalPagar = despesasPendentesQuery.data || 0;
  const loading =
    vendasQuery.isLoading ||
    clientesQuery.isLoading ||
    caixaPessoasQuery.isLoading ||
    estufasQuery.isLoading ||
    talhoesQuery.isLoading ||
    plantiosQuery.isLoading ||
    despesasPendentesQuery.isLoading;
  const refreshing =
    !loading &&
    (vendasQuery.isFetching ||
      clientesQuery.isFetching ||
      caixaPessoasQuery.isFetching ||
      estufasQuery.isFetching ||
      talhoesQuery.isFetching ||
      plantiosQuery.isFetching ||
      despesasPendentesQuery.isFetching);

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

  const toDate = toDateSafe;

  const clientesMap = useMemo(
    () =>
      clientesList.reduce<Record<string, string>>((acc, cliente) => {
        if (cliente.id) acc[cliente.id] = cliente.nome;
        return acc;
      }, {}),
    [clientesList]
  );

  const caixaPessoasMap = useMemo(
    () =>
      (caixaPessoasQuery.data || []).reduce<Record<string, string>>((acc, pessoa) => {
        if (pessoa.id) acc[pessoa.id] = pessoa.nome;
        return acc;
      }, {}),
    [caixaPessoasQuery.data]
  );

  const estufasMap = useMemo(
    () =>
      estufasList.reduce<Record<string, string>>((acc, estufa) => {
        if (estufa.id) acc[estufa.id] = estufa.nome;
        return acc;
      }, {}),
    [estufasList]
  );

  const talhoesMap = useMemo(
    () =>
      talhoesList.reduce<Record<string, string>>((acc, talhao: any) => {
        if (talhao?.id) acc[talhao.id] = talhao.nome;
        return acc;
      }, {}),
    [talhoesList]
  );

  const plantiosCulturaMap = useMemo(
    () =>
      plantiosList.reduce<Record<string, string>>((acc, plantio) => {
        if (plantio.id && plantio.cultura) acc[plantio.id] = plantio.cultura;
        return acc;
      }, {}),
    [plantiosList]
  );

  const plantiosMap = useMemo(
    () =>
      plantiosList.reduce<Record<string, (typeof plantiosList)[number]>>((acc, plantio) => {
        if (plantio.id) acc[plantio.id] = plantio;
        return acc;
      }, {}),
    [plantiosList]
  );

  const getClienteNome = (id?: string | null) => {
    if (!id) return 'Cliente avulso';
    if (clientesMap[id]) return clientesMap[id];
    return 'Cliente não identificado';
  };

  const getClienteDocumento = (id?: string | null) => {
    if (!id) return null;
    const cliente = clientesList.find((item) => item.id === id);
    return cliente?.documento || null;
  };

  const getRecebidoPor = (venda: any) => {
    const id = venda?.pagamentoPara;
    if (!id) return 'Não informado';
    return caixaPessoasMap[id] || 'Pessoa do caixa';
  };

  const getVendaProdutoNome = (venda: any) => {
    const cultura = String(venda?.cultura || '').trim();
    const culturaPlantio = String(plantiosCulturaMap[venda?.plantioId || ''] || '').trim();
    const descricaoItem = String(venda?.itens?.[0]?.descricao || '').trim();
    const descricaoNormalizada = descricaoItem.toLowerCase();
    const isDescricaoGenerica =
      !descricaoItem ||
      descricaoNormalizada === 'producao agricola' ||
      descricaoNormalizada === 'produção agrícola' ||
      descricaoNormalizada === 'producao hidroponica' ||
      descricaoNormalizada === 'produção hidropônica';

    if (cultura) return cultura;
    if (culturaPlantio) return culturaPlantio;
    if (!isDescricaoGenerica) return descricaoItem;
    return 'Produto não informado';
  };

  const getVendaOrigemNome = (venda: any) => {
    if (venda.originType === 'hydro_lote' || venda.hydroLoteId) return 'Hidroponia';
    if (venda.talhaoId) return 'Campo';
    return 'Estufa';
  };

  const getVendaLocalNome = (venda: any) => {
    if (venda.talhaoId) return talhoesMap[venda.talhaoId] || 'Talhão não identificado';
    if (venda.estufaId) return estufasMap[venda.estufaId] || 'Estufa não identificada';
    return 'Local não identificado';
  };

  const getVendaLoteNome = (venda: any) => {
    const plantio = venda.plantioId ? plantiosMap[venda.plantioId] : null;
    const lote =
      String(venda.loteColheita || venda.codigoLote || plantio?.codigoLote || '').trim() ||
      String(venda.originId || '').trim();
    return lote || '-';
  };

  const buildSalesReportItems = (sourceVendas: any[]) =>
    sourceVendas.map((item) => {
      const status = getFinancialStatus(item);
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const clienteId = item.clienteId || null;

      return {
        codigo: String(item.id || '-'),
        data: formatDate(getVendaData(item)),
        cliente: getClienteNome(clienteId),
        documentoCliente: getClienteDocumento(clienteId) || undefined,
        origem: getVendaOrigemNome(item),
        local: getVendaLocalNome(item),
        lote: getVendaLoteNome(item),
        produto: getVendaProdutoNome(item),
        quantidade: `${quantidade} ${unidade}`,
        quantidadeValor: quantidade,
        quantidadeUnidade: unidade,
        precoUnitario,
        metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
        status: status === 'pendente' ? ('PENDENTE' as const) : status === 'cancelado' ? ('CANCELADO' as const) : ('PAGO' as const),
        valor: getVendaTotal(item),
        recebidoPor: status === 'pago' ? getRecebidoPor(item) : '-',
        observacoes: item.observacoes || '',
      };
    });

  const buildSalesAccountingItems = (sourceVendas: any[]) =>
    sourceVendas.map((item) => {
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const total = getVendaTotal(item);
      const status = getFinancialStatus(item);
      const clienteId = item.clienteId || null;

      return {
        codigo: String(item.id || '-'),
        data: formatDate(getVendaData(item)),
        cliente: getClienteNome(clienteId),
        documentoCliente: getClienteDocumento(clienteId) || undefined,
        origem: getVendaOrigemNome(item),
        estufa: getVendaLocalNome(item),
        lote: getVendaLoteNome(item),
        produto: getVendaProdutoNome(item),
        quantidade: `${quantidade} ${unidade}`,
        quantidadeValor: quantidade,
        quantidadeUnidade: unidade,
        precoUnitario,
        valorTotal: total,
        metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
        status: status.toUpperCase(),
        recebidoPor: status === 'pago' ? getRecebidoPor(item) : '-',
        observacoes: item.observacoes || '',
      };
    });

  const formatDate = (timestamp: any) => {
    const d = toDate(timestamp);
    return d ? d.toLocaleDateString('pt-BR') : '-';
  };

  const formatCurrency = formatCurrencyBRL;

  const filteredVendas = useMemo(() => {
    const search = normalizeSearchText(searchText || '');

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
        const talhao = talhoesMap[venda.talhaoId] || '';
        const content = normalizeSearchText(`${cliente} ${estufa} ${talhao} ${recebidoPor} ${obs} ${metodo}`);
        matchSearch = content.includes(search);
      }

      return matchCliente && matchStatus && matchDate && matchSearch;
    });
  }, [allVendas, filterCliente, filterStatus, startDate, endDate, searchText, clientesMap, estufasMap, talhoesMap, caixaPessoasMap]);

  const stats = useMemo(() => buildVendasStats(filteredVendas), [filteredVendas]);

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

  const reportPeriodLabel = useMemo(() => {
    const statusLabel =
      reportStatusFilter === 'pago'
        ? ' | somente pagos'
        : reportStatusFilter === 'pendente'
        ? ' | somente pendentes'
        : '';
    if (!reportStartDate && !reportEndDate) return periodLabel;
    if (reportStartDate && reportEndDate) {
      return `${reportStartDate.toLocaleDateString('pt-BR')} ate ${reportEndDate.toLocaleDateString('pt-BR')}${statusLabel}`;
    }
    if (reportStartDate) return `A partir de ${reportStartDate.toLocaleDateString('pt-BR')}${statusLabel}`;
    return `Ate ${reportEndDate?.toLocaleDateString('pt-BR')}${statusLabel}`;
  }, [periodLabel, reportEndDate, reportStartDate, reportStatusFilter]);

  const reportBaseVendas = useMemo(() => {
    if (!reportStartDate && !reportEndDate) return filteredVendas;

    return filteredVendas.filter((venda) => {
      const vendaData = getVendaData(venda);
      if (!vendaData) return false;

      const dt = toDate(vendaData);
      if (!dt) return false;

      const base = new Date(dt);
      base.setHours(0, 0, 0, 0);

      if (reportStartDate) {
        const min = new Date(reportStartDate);
        min.setHours(0, 0, 0, 0);
        if (base < min) return false;
      }

      if (reportEndDate) {
        const max = new Date(reportEndDate);
        max.setHours(0, 0, 0, 0);
        if (base > max) return false;
      }

      return true;
    });
  }, [filteredVendas, reportStartDate, reportEndDate]);

  const reportFilteredVendas = useMemo(() => {
    if (reportStatusFilter === 'todos') return reportBaseVendas;
    return reportBaseVendas.filter((venda) => getFinancialStatus(venda) === reportStatusFilter);
  }, [reportBaseVendas, reportStatusFilter]);

  const reportStats = useMemo(() => buildVendasStats(reportFilteredVendas), [reportFilteredVendas]);

  const clearFilters = () => {
    setFilterCliente('todos');
    setFilterStatus('todos');
    setStartDate(null);
    setEndDate(null);
    setShowFilterModal(false);
  };

  const handleShareReport = async (sourceVendas = filteredVendas, sourceStats = stats, sourcePeriodLabel = periodLabel) => {
    let msg = '*Relatório de Vendas - SGE*\n';
    msg += '-----------------------------\n';
    msg += `Periodo: ${sourcePeriodLabel}\n`;
    msg += `Total vendido: ${formatCurrency(sourceStats.totalValor)}\n`;
    msg += `Recebido: ${formatCurrency(sourceStats.totalRecebido)}\n`;
    msg += `A receber: ${formatCurrency(sourceStats.totalReceber)}\n`;
    msg += `A pagar: ${formatCurrency(totalPagar)}\n`;
    msg += `Saldo atual: ${formatCurrency(sourceStats.totalRecebido - totalPagar)}\n`;
    msg += `Saldo projetado: ${formatCurrency(sourceStats.totalRecebido + sourceStats.totalReceber - totalPagar)}\n`;
    msg += `Vendas: ${sourceStats.totalItens}\n`;
    msg += '-----------------------------\n\n';

    msg += 'Metodos de pagamento:\n';
    Object.keys(sourceStats.porMetodo).forEach((metodo) => {
      msg += `- ${metodo}: ${formatCurrency(sourceStats.porMetodo[metodo])}\n`;
    });

    msg += '\nPrincipais vendas:\n';
    sourceVendas.slice(0, 10).forEach((venda) => {
      const metodoRaw = String(venda.metodoPagamento || venda.formaPagamento || 'não definido');
      const metodoLabel = metodoRaw.charAt(0).toUpperCase() + metodoRaw.slice(1);
      msg += `- ${getClienteNome(venda.clienteId)}: ${formatCurrency(getVendaTotal(venda))} | ${metodoLabel}\n`;
    });
    if (sourceVendas.length > 10) {
      msg += `... e mais ${sourceVendas.length - 10} vendas.\n`;
    }

    msg += `\nGerado em: ${new Date().toLocaleString('pt-BR')}`;

    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportPdf = async (sourceVendas = filteredVendas, sourcePeriodLabel = periodLabel) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar relatório.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const nomeProdutor = currentTenant?.ownerName || user?.name || 'Produtor';

    try {
      const totalRegistrosFinanceiros = sourceVendas.filter((item) => getFinancialStatus(item) !== 'cancelado').length;
      const totaisRelatorio = sourceVendas.reduce(
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

      sourceVendas.map((item) => {
      const status = getFinancialStatus(item);
      return {
          codigo: item.id,
          data: formatDate(getVendaData(item)),
          cliente: getClienteNome(item.clienteId),
          estufa: estufasMap[item.estufaId] || 'Estufa não identificada',
          metodoPagamento: (item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
          status: status === 'pendente' ? ('PENDENTE' as const) : status === 'cancelado' ? ('CANCELADO' as const) : ('PAGO' as const),
          valor: getVendaTotal(item),
          observacoes:
            `${status === 'pago' ? `Recebido por: ${getRecebidoPor(item)}` : 'Pagamento pendente'}${item.observacoes ? `\n${item.observacoes}` : ''}`,
        };
      });

      await shareSalesReportPdf({
        nomeProdutor,
        nomeEstufa: Object.keys(estufasMap).length === 1 ? Object.values(estufasMap)[0] : 'Relatório Consolidado',
        tituloRelatorio: 'Relatório Gerencial de Vendas',
        periodo: sourcePeriodLabel,
        observacoes: `Relatório consolidado com ${sourceVendas.length} vendas.`,
        totais: {
          totalReceber: totaisRelatorio.totalReceber,
          totalPagar,
          saldo: totaisRelatorio.totalRecebido + totaisRelatorio.totalReceber - totalPagar,
          totalVendido: totaisRelatorio.totalVendido,
          totalRecebido: totaisRelatorio.totalRecebido,
          ticketMedio: totalRegistrosFinanceiros > 0 ? totaisRelatorio.totalVendido / totalRegistrosFinanceiros : 0,
          totalRegistros: totaisRelatorio.totalRegistros,
        },
        itens: buildSalesReportItems(sourceVendas),
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível exportar o PDF.');
    }
  };

  const handlePrintReceiptById = async (vendaId?: string, vendaFallback?: any) => {
    if (!vendaId && !vendaFallback?.id) {
      Alert.alert('Erro', 'Venda inválida para gerar PDF.');
      return;
    }

    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar relatório.');
      return;
    }

    try {
      const venda = (vendaId ? await getVendaById(vendaId, targetId).catch(() => null) : null) || vendaFallback;
      if (!venda) throw new Error('Registro da venda não encontrado.');

      const currentTenant = availableTenants.find((t) => t.uid === targetId);
      const nomeFazenda = currentTenant?.ownerName || user?.name || 'Produtor';
      const cliente = clientesList.find((item) => item.id === venda.clienteId) || null;
      const plantio = venda.plantioId ? await getPlantioById(venda.plantioId, targetId).catch(() => null) : null;
      const colheita = venda.colheitaId ? await getColheitaById(venda.colheitaId, targetId).catch(() => null) : null;
      const cultura = plantio?.cultura || venda.cultura || venda.itens?.[0]?.descricao || 'Cultura não informada';

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
      Alert.alert('Erro', error?.message || 'Não foi possível gerar o PDF desta venda.');
    }
  };

  const handleExportAccountingPdf = async (sourceVendas = reportFilteredVendas, sourcePeriodLabel = reportPeriodLabel) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar relatório.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const empresa = currentTenant?.ownerName || user?.name || 'Produtor';

      sourceVendas.map((item) => {
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const total = getVendaTotal(item);
      const status = getFinancialStatus(item);
      const clienteId = item.clienteId || null;
      const produto = getVendaProdutoNome(item);
      const lote = String((item as any).loteColheita || (item as any).codigoLote || item.plantioId || item.colheitaId || '-');
      const recebidoPor = status === 'pago' ? getRecebidoPor(item) : '-';
        return {
          codigo: String(item.id || '-'),
          data: formatDate(getVendaData(item)),
          cliente: getClienteNome(clienteId),
          documentoCliente: getClienteDocumento(clienteId) || undefined,
        estufa: estufasMap[item.estufaId] || 'Estufa não identificada',
        lote,
        produto,
        quantidade: `${quantidade} ${unidade}`,
        quantidadeValor: quantidade,
        quantidadeUnidade: unidade,
        precoUnitario,
          valorTotal: total,
          metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
          status: status.toUpperCase(),
          recebidoPor,
          observacoes: item.observacoes || '',
        };
      });

    try {
        await shareSalesAccountingPdf({
          empresa,
          periodo: sourcePeriodLabel,
          itens: buildSalesAccountingItems(sourceVendas),
        });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível exportar o relatório contábil.');
    }
  };

  const handleExportAccountingExcel = async (sourceVendas = reportFilteredVendas, sourcePeriodLabel = reportPeriodLabel) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
      Alert.alert('Erro', 'Usuário inválido para gerar relatório.');
      return;
    }

    const currentTenant = availableTenants.find((t) => t.uid === targetId);
    const empresa = currentTenant?.ownerName || user?.name || 'Produtor';

      sourceVendas.map((item) => {
      const quantidade = getVendaQuantidade(item);
      const unidade = getVendaUnidade(item);
      const precoUnitario = getVendaPrecoUnitario(item);
      const total = getVendaTotal(item);
      const status = getFinancialStatus(item);
      const clienteId = item.clienteId || null;
      const produto = getVendaProdutoNome(item);
      const lote = String((item as any).loteColheita || (item as any).codigoLote || item.plantioId || item.colheitaId || '-');
      const recebidoPor = status === 'pago' ? getRecebidoPor(item) : '-';
        return {
          codigo: String(item.id || '-'),
          data: formatDate(getVendaData(item)),
          cliente: getClienteNome(clienteId),
          documentoCliente: getClienteDocumento(clienteId) || undefined,
        estufa: estufasMap[item.estufaId] || 'Estufa não identificada',
        lote,
        produto,
        quantidade: `${quantidade} ${unidade}`,
        quantidadeValor: quantidade,
        quantidadeUnidade: unidade,
        precoUnitario,
          valorTotal: total,
          metodoPagamento: String(item.metodoPagamento || item.formaPagamento || 'N/A').toUpperCase(),
          status: status.toUpperCase(),
          recebidoPor,
          observacoes: item.observacoes || '',
        };
      });

    try {
        await exportSalesAccountingExcel({
          empresa,
          periodo: sourcePeriodLabel,
          itens: buildSalesAccountingItems(sourceVendas),
        });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível exportar o Excel contábil.');
    }
  };

  const handleShareCustomerStatement = async () => {
    if (filterCliente === 'todos') {
      Alert.alert('Aviso', 'Selecione um cliente no filtro para gerar o extrato.');
      return;
    }

    const cliente = clientesList.find((c) => c.id === filterCliente);
    const clienteNome = filterCliente === 'avulso' ? 'Cliente Avulso' : cliente?.nome || 'Cliente';

    try {
      await shareCustomerSalesStatement({
        clienteNome,
        empresa: (settings as any).farmName || 'SGE - Sistema de Gestao de Estufas',
        periodo: periodLabel,
        vendas: filteredVendas.map((v) => ({
          codigo: v.id.slice(0, 8).toUpperCase(),
          data: formatDate(getVendaData(v)),
          cliente: clienteNome,
          estufa: getVendaLocalNome(v),
          produto: getVendaProdutoNome(v),
          quantidade: `${getVendaQuantidade(v)} ${getVendaUnidade(v)}`,
          precoUnitario: getVendaPrecoUnitario(v),
          valorTotal: getVendaTotal(v),
          metodoPagamento: String(v.metodoPagamento || v.formaPagamento || 'N/A').toUpperCase(),
          status: getFinancialStatus(v).toUpperCase(),
        })),
        totalVendido: stats.totalValor,
        totalPago: stats.totalRecebido,
        totalPendente: stats.totalReceber,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível gerar o extrato do cliente.');
    }
  };

  const goToContasReceber = () => navigation.navigate('ContasReceber');

  const activeFiltersLabel =
    activeFiltersCount > 0 ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}` : 'Sem filtros avancados';

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
    const talhao = talhoesMap[item.talhaoId] || 'Sem talhao';
    const isCampoSale = !!item.talhaoId;
    const status = getFinancialStatus(item);
    const metodo = String(item.metodoPagamento || item.formaPagamento || 'não definido');
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
              <Text style={[styles.saleProduct, { color: theme.textSecondary }]} numberOfLines={1}>
                {getVendaProdutoNome(item)}
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

          <View style={styles.saleInfoGrid}>
            <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>Data</Text>
              <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>{formatDate(dataVenda)}</Text>
            </View>
            <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>
                {isCampoSale ? 'Talhao' : 'Estufa'}
              </Text>
              <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]} numberOfLines={1}>
                {isCampoSale ? talhao : estufa}
              </Text>
            </View>
          </View>
          <Text style={[styles.saleMetaStrong, { color: theme.textSecondary }]}>
            {status === 'pago' ? `Recebido por: ${recebidoPor}` : 'Recebimento pendente'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.saleFooter, { borderTopColor: theme.divider }]}>
          {canWrite && status === 'pendente' ? (
            <TouchableOpacity
              style={[styles.saleFooterBtn, styles.saleFooterBtnPrimary, { backgroundColor: `${COLORS.success}18` }]}
              onPress={goToContasReceber}
            >
              <MaterialCommunityIcons name="cash-check" size={20} color={COLORS.success} />
              <Text style={[styles.saleFooterBtnText, { color: COLORS.success }]}>Receber</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.saleFooterBtn, { backgroundColor: theme.surfaceMuted }]}
            onPress={() => void handlePrintReceiptById(item.id, item)}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.info} />
            <Text style={[styles.saleFooterBtnText, { color: theme.info }]}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSaleItem = ({ item }: { item: any }) => {
    const total = getVendaTotal(item);
    const quantidade = getVendaQuantidade(item);
    const precoUnitario = getVendaPrecoUnitario(item);
    const unidade = getVendaUnidade(item);
    const dataVenda = getVendaData(item);
    const clienteNome = getClienteNome(item.clienteId);
    const recebidoPor = getRecebidoPor(item);
    const estufa = estufasMap[item.estufaId] || 'Sem estufa';
    const talhao = talhoesMap[item.talhaoId] || 'Sem talhao';
    const isCampoSale = !!item.talhaoId;
    const status = getFinancialStatus(item);
    const metodo = String(item.metodoPagamento || item.formaPagamento || 'nao definido');
    const isHydroSale = item.originType === 'hydro_lote' || !!item.hydroLoteId;
    const produtoNome = getVendaProdutoNome(item);
    const loteNome = getVendaLoteNome(item);
    const localLabel = isCampoSale ? 'Talhao' : 'Estufa';
    const localNome = isCampoSale ? talhao : estufa;

    const statusTone =
      status === 'pendente'
        ? { bg: theme.dangerBackground, border: COLORS.cFECACA, text: COLORS.danger }
        : status === 'cancelado'
        ? { bg: theme.surfaceMuted, border: theme.border, text: theme.textSecondary }
        : { bg: theme.successBackground, border: COLORS.c86EFAC, text: COLORS.success };

    return (
      <View
        style={[
          styles.saleCard,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
            borderLeftColor: statusTone.text,
          },
        ]}
      >
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
              <Text style={[styles.saleProductTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {produtoNome}
              </Text>
              <Text style={[styles.saleClient, { color: theme.textSecondary }]} numberOfLines={1}>
                {clienteNome}
              </Text>
              <Text style={[styles.saleQuickMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {formatDate(dataVenda)} • {localLabel}: {localNome}
              </Text>
            </View>
            <View style={styles.saleTopRight}>
              <Text style={[styles.saleTotal, { color: theme.textPrimary }]}>{formatCurrency(total)}</Text>
              <View style={[styles.badge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
                <Text style={[styles.badgeText, { color: statusTone.text }]}>
                  {status === 'pago' ? 'PAGO' : status === 'pendente' ? 'PENDENTE' : 'CANCELADO'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.saleBadgesRow}>
            <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>{metodo.toUpperCase()}</Text>
            </View>
            <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.methodBadgeText, { color: theme.textSecondary }]}>LOTE {loteNome}</Text>
            </View>
            {isHydroSale ? (
              <View style={[styles.methodBadge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.methodBadgeText, { color: theme.info }]}>HIDROPONIA</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.saleInfoGrid}>
            <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>Quantidade</Text>
              <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>{quantidade} {unidade}</Text>
            </View>
            <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>Preco unitario</Text>
              <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]}>{formatCurrency(precoUnitario)}</Text>
            </View>
            <View style={[styles.saleInfoCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.saleInfoLabel, { color: theme.textSecondary }]}>{localLabel}</Text>
              <Text style={[styles.saleInfoValue, { color: theme.textPrimary }]} numberOfLines={1}>
                {localNome}
              </Text>
            </View>
          </View>
          <Text style={[styles.saleMetaStrong, { color: theme.textSecondary }]}>
            {status === 'pago' ? `Recebido por: ${recebidoPor}` : 'Recebimento pendente'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.saleFooter, { borderTopColor: theme.divider }]}>
          {canWrite && status === 'pendente' ? (
            <TouchableOpacity
              style={[styles.saleFooterBtn, styles.saleFooterBtnPrimary, { backgroundColor: `${COLORS.success}18` }]}
              onPress={goToContasReceber}
            >
              <MaterialCommunityIcons name="cash-check" size={20} color={COLORS.success} />
              <Text style={[styles.saleFooterBtnText, { color: COLORS.success }]}>Receber</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.saleFooterBtn, { backgroundColor: theme.surfaceMuted }]}
            onPress={() => void handlePrintReceiptById(item.id, item)}
          >
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
        renderItem={renderSaleItem}
        refreshing={refreshing}
        onRefresh={() => void refreshAll()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : 48) + insets.bottom },
        ]}
        ListHeaderComponent={
          <>
            <ScreenHeaderCard
              title="Financeiro"
              subtitle="Acompanhe vendas, pendências e caixa com uma leitura mais objetiva."
              badgeLabel="Vendas"
            >
              <View style={styles.headerStatsRow}>
                <View style={styles.headerChip}>
                  <Text style={styles.headerChipValue}>{stats.totalItens}</Text>
                  <Text style={styles.headerChipLabel}>Vendas</Text>
                </View>
                <View style={styles.headerChip}>
                  <Text style={styles.headerChipValue}>{stats.totalCaixas.toFixed(1)}</Text>
                  <Text style={styles.headerChipLabel}>Caixas</Text>
                </View>
                <View style={styles.headerChip}>
                  <Text style={styles.headerChipValue}>{formatCurrency(stats.totalValor)}</Text>
                  <Text style={styles.headerChipLabel}>Total</Text>
                </View>
              </View>
            </ScreenHeaderCard>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.financeLinksRow}
            >
              <TouchableOpacity
                style={[styles.financeLink, styles.financeLinkActive, { borderColor: theme.info }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })}
              >
                <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.info} />
                <Text style={[styles.financeLinkText, { color: theme.info }]}>Vendas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={() => navigation.navigate('ContasReceber')}
              >
                <MaterialCommunityIcons name="cash-clock" size={16} color={theme.textSecondary} />
                <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                onPress={() => navigation.navigate('DespesasList')}
              >
                <MaterialCommunityIcons name="cash-minus" size={16} color={theme.textSecondary} />
                <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
              </TouchableOpacity>
              {canViewCash ? (
                <TouchableOpacity
                  style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
                  onPress={() => navigation.navigate('CaixaResumo')}
                >
                  <MaterialCommunityIcons name="wallet-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Caixa</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            <View style={[styles.overviewCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={styles.overviewTopRow}>
                <View style={styles.overviewMainBlock}>
                  <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Visao atual</Text>
                  <Text style={[styles.overviewValue, { color: theme.textPrimary }]}>{formatCurrency(stats.totalValor)}</Text>
                  <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>{periodLabel}</Text>
                </View>
                <View style={[styles.overviewBadge, { backgroundColor: theme.infoSoft, borderColor: theme.info }]}>
                  <Text style={[styles.overviewBadgeText, { color: theme.info }]}>{activeFiltersLabel}</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Recebido</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(stats.totalRecebido)}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}
                  onPress={goToContasReceber}
                >
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>A receber</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{formatCurrency(stats.totalReceber)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}
                  onPress={() => navigation.navigate('DespesasList')}
                >
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>A pagar</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{formatCurrency(totalPagar)}</Text>
                </TouchableOpacity>
                <View style={[styles.summaryCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saldo atual</Text>
                  <Text style={[styles.summaryValue, { color: saldoAtual >= 0 ? COLORS.success : COLORS.danger }]}>
                    {formatCurrency(saldoAtual)}
                  </Text>
                </View>
              </View>

              <View style={styles.insightsRow}>
                <View style={[styles.insightCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Saldo projetado</Text>
                  <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{formatCurrency(saldoProjetado)}</Text>
                </View>
                <View style={[styles.insightCard, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Ticket medio</Text>
                  <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{formatCurrency(stats.ticketMedio)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.toolbarCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Buscar por cliente, estufa, caixa ou observação"
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

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
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
                  style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                  onPress={() => setShowReportModal(true)}
                >
                  <MaterialCommunityIcons name="chart-box-outline" size={18} color={theme.info} />
                  <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Resumo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                  onPress={() => void handleExportPdf()}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.info} />
                  <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>PDF</Text>
                </TouchableOpacity>

                {filterCliente !== 'todos' && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { borderColor: COLORS.success, backgroundColor: `${COLORS.success}10`, minWidth: '96%' },
                    ]}
                    onPress={() => void handleShareCustomerStatement()}
                  >
                    <MaterialCommunityIcons name="account-details-outline" size={18} color={COLORS.success} />
                    <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Gerar Extrato do Cliente</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.filterStripCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={styles.filterStripHeader}>
                <Text style={[styles.filterStripTitle, { color: theme.textPrimary }]}>Status das vendas</Text>
                <Text style={[styles.filterStripSubtitle, { color: theme.textSecondary }]}>{filteredVendas.length} registro(s)</Text>
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

              <Text style={[styles.periodText, { color: theme.textSecondary }]}>
                {periodLabel} • {activeFiltersLabel}
              </Text>
            </View>

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
                <Text style={[styles.reportPeriod, { color: theme.textSecondary }]}>{reportPeriodLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowReportStartPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {reportStartDate ? reportStartDate.toLocaleDateString('pt-BR') : 'Inicio'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
              </TouchableOpacity>
              <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>ate</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowReportEndPicker(true)}
              >
                <Text style={[styles.dateBtnText, { color: theme.textPrimary }]}>
                  {reportEndDate ? reportEndDate.toLocaleDateString('pt-BR') : 'Fim'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={16} color={theme.info} />
              </TouchableOpacity>
            </View>

            {showReportStartPicker ? (
              <DateTimePicker
                value={reportStartDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowReportStartPicker(false);
                  if (d) setReportStartDate(d);
                }}
              />
            ) : null}

            {showReportEndPicker ? (
              <DateTimePicker
                value={reportEndDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowReportEndPicker(false);
                  if (d) setReportEndDate(d);
                }}
                />
              ) : null}

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Filtro do resumo</Text>
              <View style={styles.reportFilterRow}>
                <TouchableOpacity
                  style={[
                    styles.reportFilterChip,
                    {
                      borderColor: reportStatusFilter === 'todos' ? theme.info : theme.border,
                      backgroundColor: reportStatusFilter === 'todos' ? theme.infoSoft : theme.surfaceBackground,
                    },
                  ]}
                  onPress={() => setReportStatusFilter('todos')}
                >
                  <Text style={[styles.reportFilterChipText, { color: reportStatusFilter === 'todos' ? theme.info : theme.textPrimary }]}>
                    Tudo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reportFilterChip,
                    {
                      borderColor: reportStatusFilter === 'pago' ? COLORS.success : theme.border,
                      backgroundColor: reportStatusFilter === 'pago' ? COLORS.successSoft : theme.surfaceBackground,
                    },
                  ]}
                  onPress={() => setReportStatusFilter('pago')}
                >
                  <Text style={[styles.reportFilterChipText, { color: reportStatusFilter === 'pago' ? COLORS.success : theme.textPrimary }]}>
                    So pagos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reportFilterChip,
                    {
                      borderColor: reportStatusFilter === 'pendente' ? COLORS.danger : theme.border,
                      backgroundColor: reportStatusFilter === 'pendente' ? theme.dangerBackground : theme.surfaceBackground,
                    },
                  ]}
                  onPress={() => setReportStatusFilter('pendente')}
                >
                  <Text style={[styles.reportFilterChipText, { color: reportStatusFilter === 'pendente' ? COLORS.danger : theme.textPrimary }]}>
                    So pendentes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.bigStat, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.bigStatLabel, { color: theme.textSecondary }]}>Total vendido</Text>
              <Text style={[styles.bigStatValue, { color: theme.textPrimary }]}>{formatCurrency(reportStats.totalValor)}</Text>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginBottom: 12 }]}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Volume Total</Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{reportStats.totalCaixas.toFixed(1)} caixas</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Qtd. Vendas</Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{reportStats.totalItens} registros</Text>
              </View>
            </View>

            <View style={[styles.sectionBox, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Metodos de pagamento</Text>
              {Object.keys(reportStats.porMetodo).length === 0 ? (
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sem dados no periodo.</Text>
              ) : (
                Object.keys(reportStats.porMetodo).map((metodo) => (
                  <View key={metodo} style={[styles.statRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{metodo}</Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                      {formatCurrency(reportStats.porMetodo[metodo])}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: theme.info }]}
                onPress={() => handleExportPdf(reportFilteredVendas, reportPeriodLabel)}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Exportar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.secondary }]}
                onPress={() => handleExportAccountingPdf(reportFilteredVendas, reportPeriodLabel)}
              >
                <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>PDF Contabil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => handleExportAccountingExcel(reportFilteredVendas, reportPeriodLabel)}
              >
                <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.textLight} />
                <Text style={styles.reportActionText}>Excel (.xlsx)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportActionBtn, { backgroundColor: COLORS.whatsapp }]}
                onPress={() => handleShareReport(reportFilteredVendas, reportStats, reportPeriodLabel)}
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

  financeLinksRow: {
    gap: 8,
    marginTop: SPACING.md,
    paddingRight: SPACING.lg,
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
    backgroundColor: COLORS.infoSoft,
  },
  financeLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },

  overviewCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  overviewTopRow: {
    gap: 10,
  },
  overviewMainBlock: {
    gap: 4,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  overviewCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  overviewBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overviewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.md,
  },
  summaryCard: {
    width: '48.7%',
    borderRadius: RADIUS.md,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
  },
  insightCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '900',
  },

  toolbarCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
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
    flexWrap: 'wrap',
  },
  actionBtn: {
    minWidth: '31%',
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

  filterStripCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  filterStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filterStripTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  filterStripSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
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
    fontSize: 12,
    fontWeight: '600',
  },

  saleCard: {
    borderWidth: 1,
    borderLeftWidth: 5,
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
  saleTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  saleProductTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  saleClient: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '800',
  },
  saleProduct: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  saleQuickMeta: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
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
  saleInfoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  saleInfoCard: {
    flex: 1,
    minWidth: '31%',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saleInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  saleInfoValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  saleMetaStrong: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
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
    gap: 8,
    flexWrap: 'wrap',
  },
  saleFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  saleFooterBtnPrimary: {
    paddingHorizontal: 14,
  },
  saleFooterBtnText: {
    fontSize: 14,
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
  reportFilterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reportFilterChip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportFilterChipText: {
    fontSize: 12,
    fontWeight: '800',
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
