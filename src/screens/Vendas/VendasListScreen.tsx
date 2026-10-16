import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useClientesListData } from '../../hooks/queries/useClientesListData';
import { useEstufasListData } from '../../hooks/queries/useEstufasListData';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { queryClient, queryKeys } from '../../lib/queryClient';
import {
  deleteVenda,
  getVendaById,
  listAllVendas,
  markVendaChequeEmMaos,
  receberVenda,
  removeVendaReceipt,
  updateVendaReceipt,
} from '../../services/vendaService';
import { deleteColheita } from '../../services/colheitaService';
import { listAllPlantios } from '../../services/plantioService';
import { listDespesas } from '../../services/despesaService';
import {
  createCaixaPessoa,
  listCaixaPessoas,
} from '../../services/caixaPessoaService';
import {
  exportSalesAccountingExcel,
  shareCustomerSalesStatement,
  shareSalesAccountingPdf,
  shareSalesReportPdf,
} from '../../services/receiptService';
import { compartilharPDF } from '../../services/pdfService';
import { RADIUS, SPACING } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import LoadingButton from '../../components/ui/LoadingButton';

// Components
import VendaItemCard from './components/VendaItemCard';
import VendasToolbar from './components/VendasToolbar';
import VendasFilterModal from './components/VendasFilterModal';
import VendasReportModal from './components/VendasReportModal';
import VendasSummary from './components/VendasSummary';
import VendasHeaderStats from './components/VendasHeaderStats';

import {
  buildVendasStats,
  FinanceView,
  formatCurrencyBRL,
  getFinancialStatus,
  getVendaData,
  getVendaPrecoUnitario,
  getVendaQuantidade,
  getVendaTotal,
  getVendaUnidade,
  getVendaValorRecebido,
  matchesFinanceView,
  normalizeSearchText,
  resolveVendaDeletionTarget,
  toDateSafe,
} from './vendasListUtils';
import { resolveServiceErrorMessage } from '../../services/securityUiHelpers';
import { isChequeEmMaosPayment } from '../../services/paymentStatusHelpers';
import { getAccountingStatusLabel } from '../../services/salesAccountingReportHelpers';
import { sanitizeDecimalInput } from '../../utils/numericFields';
import {
  matchesDespesaProductionMode,
  matchesPlantioProductionMode,
  matchesVendaProductionMode,
} from '../../services/financeProductionScope';

const parseMoneyInput = (value: string) =>
  Number(String(value || '').replace(',', '.'));

const formatMoneyInput = (value: number) =>
  Number(value || 0)
    .toFixed(2)
    .replace('.', ',');

const formatDateInputBR = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const sanitizeDateInputBR = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

const parseDateInputBR = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const VendasListScreen = ({ navigation, route }: any) => {
  const { canWrite, user, selectedTenantId, availableTenants, canViewCash } =
    useAuth();
  const { settings } = useAppSettings();
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterCliente, setFilterCliente] = useState('todos');
  const [financeView, setFinanceView] = useState<FinanceView>(
    route?.params?.filter || 'todos'
  );
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptEditMode, setReceiptEditMode] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<any | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('');
  const [chequeEmMaos, setChequeEmMaos] = useState(false);
  const [pagamentoPara, setPagamentoPara] = useState<string | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(new Date());
  const [dataRecebimentoInput, setDataRecebimentoInput] = useState(
    formatDateInputBR(new Date())
  );
  const [showReceiptDatePicker, setShowReceiptDatePicker] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [caixaPersonModalVisible, setCaixaPersonModalVisible] = useState(false);
  const [novoCaixaNome, setNovoCaixaNome] = useState('');
  const [savingCaixaPerson, setSavingCaixaPerson] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null);
  const [showReportStartPicker, setShowReportStartPicker] = useState(false);
  const [showReportEndPicker, setShowReportEndPicker] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<
    'todos' | 'pago' | 'pendente'
  >('todos');
  const [exportingAccountingPdf, setExportingAccountingPdf] = useState(false);
  const [exportingAccountingExcel, setExportingAccountingExcel] =
    useState(false);
  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(
    null
  );
  const [deletingVendaId, setDeletingVendaId] = useState<string | null>(null);
  const [removingReceiptId, setRemovingReceiptId] = useState<string | null>(
    null
  );

  const targetId = selectedTenantId || user?.uid;
  const productionMode = settings.activeProductionMode;
  const isCampoMode = productionMode === 'campo';
  const auditActor = useMemo(
    () =>
      user?.uid
        ? { uid: user.uid, name: user.displayName || user.name || null }
        : null,
    [user?.displayName, user?.name, user?.uid]
  );

  useEffect(() => {
    const requestedFilter = route?.params?.filter as FinanceView | undefined;
    if (!requestedFilter) return;
    setFinanceView(requestedFilter);
    navigation.setParams({ filter: undefined });
  }, [navigation, route?.params?.filter]);

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
  const estufasQuery = useEstufasListData(isCampoMode ? undefined : targetId);
  const talhoesQuery = useTalhoesListData(isCampoMode ? targetId : undefined);
  const plantiosQuery = useQuery({
    queryKey: queryKeys.plantiosList(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => listAllPlantios(targetId as string),
  });
  const despesasQuery = useQuery({
    queryKey: queryKeys.despesasList(targetId || 'none'),
    enabled: !!targetId,
    queryFn: () => listDespesas(targetId as string),
  });

  const allVendas = vendasQuery.data || [];
  const clientesList = clientesQuery.data || [];
  const estufasList = estufasQuery.data?.estufas || [];
  const talhoesList = talhoesQuery.data || [];
  const plantiosList = useMemo(
    () =>
      (plantiosQuery.data || []).filter((plantio) =>
        matchesPlantioProductionMode(plantio, productionMode)
      ),
    [plantiosQuery.data, productionMode]
  );

  const loading = vendasQuery.isLoading || clientesQuery.isLoading;
  const refreshing = !loading && vendasQuery.isFetching;

  const refreshAll = async () => {
    await Promise.all([
      vendasQuery.refetch(),
      clientesQuery.refetch(),
      caixaPessoasQuery.refetch(),
      isCampoMode ? talhoesQuery.refetch() : estufasQuery.refetch(),
      plantiosQuery.refetch(),
      despesasQuery.refetch(),
    ]);
  };

  // Maps
  const clientesMap = useMemo(
    () => Object.fromEntries(clientesList.map((c) => [c.id, c.nome])),
    [clientesList]
  );

  const caixaPessoasMap = useMemo(
    () =>
      Object.fromEntries(
        (caixaPessoasQuery.data || []).map((p) => [p.id, p.nome])
      ),
    [caixaPessoasQuery.data]
  );

  const estufasMap = useMemo(
    () => Object.fromEntries(estufasList.map((e) => [e.id, e.nome])),
    [estufasList]
  );

  const talhoesMap = useMemo(
    () => Object.fromEntries(talhoesList.map((t: any) => [t.id, t.nome])),
    [talhoesList]
  );

  const plantiosCulturaMap = useMemo(
    () => Object.fromEntries(plantiosList.map((p) => [p.id, p.cultura])),
    [plantiosList]
  );

  const plantiosMap = useMemo(
    () => Object.fromEntries(plantiosList.map((p) => [p.id, p])),
    [plantiosList]
  );

  const totalPagar = useMemo(
    () =>
      (despesasQuery.data || [])
        .filter(
          (despesa) =>
            (despesa.statusPagamento === 'pendente' ||
              despesa.status === 'pendente') &&
            matchesDespesaProductionMode(despesa, productionMode, plantiosMap)
        )
        .reduce((total, despesa) => total + Number(despesa.valor || 0), 0),
    [despesasQuery.data, plantiosMap, productionMode]
  );

  // Helpers
  const getClienteNome = useCallback(
    (id?: string | null) => {
      if (!id) return 'Cliente avulso';
      return clientesMap[id] || 'Cliente não identificado';
    },
    [clientesMap]
  );

  const getRecebidoPor = useCallback(
    (venda: any) => {
      const id = venda?.pagamentoPara;
      if (!id) return 'Não informado';
      return caixaPessoasMap[id] || 'Pessoa do caixa';
    },
    [caixaPessoasMap]
  );

  const getVendaProdutoNome = useCallback(
    (venda: any) => {
      const cultura = String(venda?.cultura || '').trim();
      const culturaPlantio = String(
        plantiosCulturaMap[venda?.plantioId || ''] || ''
      ).trim();
      const descricaoItem = String(venda?.itens?.[0]?.descricao || '').trim();

      if (cultura) return cultura;
      if (culturaPlantio) return culturaPlantio;
      return descricaoItem || 'Produto não informado';
    },
    [plantiosCulturaMap]
  );

  const getVendaLocalNome = useCallback(
    (venda: any) => {
      if (venda.talhaoId) return talhoesMap[venda.talhaoId] || 'Talhão';
      if (venda.estufaId) return estufasMap[venda.estufaId] || 'Estufa';
      return 'Local';
    },
    [talhoesMap, estufasMap]
  );

  const getVendaLoteNome = useCallback(
    (venda: any) => {
      const plantio = venda.plantioId ? plantiosMap[venda.plantioId] : null;
      return String(
        venda.loteColheita ||
          venda.codigoLote ||
          plantio?.codigoLote ||
          venda.originId ||
          '-'
      ).trim();
    },
    [plantiosMap]
  );

  // Filtering Logic
  const modeScopedVendas = useMemo(
    () =>
      allVendas
        .filter((venda) =>
          matchesVendaProductionMode(venda, productionMode, plantiosMap)
        )
        .map((venda) => {
          const plantio = venda.plantioId ? plantiosMap[venda.plantioId] : null;
          if (productionMode === 'campo' && !venda.talhaoId) {
            return { ...venda, talhaoId: plantio?.talhaoId };
          }
          return venda;
        }),
    [allVendas, plantiosMap, productionMode]
  );

  const filteredVendas = useMemo(() => {
    const search = normalizeSearchText(searchText || '');

    return modeScopedVendas.filter((venda) => {
      const matchCliente =
        filterCliente === 'todos'
          ? true
          : filterCliente === 'avulso'
            ? !venda.clienteId
            : venda.clienteId === filterCliente;

      const matchStatus = matchesFinanceView(venda, financeView);

      const dt = toDateSafe(getVendaData(venda));
      let matchDate = true;
      if (dt && (startDate || endDate)) {
        const base = new Date(dt);
        base.setHours(0, 0, 0, 0);
        const baseTime = base.getTime();
        const startTime = startDate
          ? new Date(startDate).setHours(0, 0, 0, 0)
          : null;
        const endTime = endDate
          ? new Date(endDate).setHours(23, 59, 59, 999)
          : null;
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
        const content = normalizeSearchText(
          `${cliente} ${estufa} ${talhao} ${produto} ${venda.observacoes || ''}`
        );
        matchSearch = content.includes(search);
      }

      return matchCliente && matchStatus && matchDate && matchSearch;
    });
  }, [
    modeScopedVendas,
    filterCliente,
    financeView,
    startDate,
    endDate,
    searchText,
    getClienteNome,
    estufasMap,
    talhoesMap,
    getVendaProdutoNome,
  ]);

  const stats = useMemo(
    () => buildVendasStats(filteredVendas),
    [filteredVendas]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCliente !== 'todos') count += 1;
    if (financeView !== 'todos') count += 1;
    if (startDate) count += 1;
    if (endDate) count += 1;
    return count;
  }, [filterCliente, financeView, startDate, endDate]);

  const selectedClienteNome = useMemo(() => {
    if (filterCliente === 'todos') return null;
    if (filterCliente === 'avulso') return 'Vendas avulsas';
    return clientesMap[filterCliente] || 'Cliente selecionado';
  }, [clientesMap, filterCliente]);

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return 'Período completo';
    if (startDate && endDate)
      return `${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`;
    if (startDate)
      return `A partir de ${startDate.toLocaleDateString('pt-BR')}`;
    return `Até ${endDate?.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (selectedClienteNome) chips.push(`Cliente: ${selectedClienteNome}`);
    if (financeView !== 'todos') {
      const viewLabels: Record<Exclude<FinanceView, 'todos'>, string> = {
        receber: 'A receber',
        cheques: 'Cheques',
        recebidas: 'Recebidas',
      };
      chips.push(`Visão: ${viewLabels[financeView]}`);
    }
    if (startDate || endDate) chips.push(periodLabel);
    return chips;
  }, [selectedClienteNome, financeView, startDate, endDate, periodLabel]);

  // Report Logic
  const reportFilteredVendas = useMemo(() => {
    return filteredVendas.filter((venda) => {
      const dt = toDateSafe(getVendaData(venda));
      if (!dt) return false;
      const base = new Date(dt).setHours(0, 0, 0, 0);
      if (
        reportStartDate &&
        base < new Date(reportStartDate).setHours(0, 0, 0, 0)
      )
        return false;
      if (
        reportEndDate &&
        base > new Date(reportEndDate).setHours(23, 59, 59, 999)
      )
        return false;
      if (
        reportStatusFilter !== 'todos' &&
        getFinancialStatus(venda) !== reportStatusFilter
      )
        return false;
      return true;
    });
  }, [filteredVendas, reportStartDate, reportEndDate, reportStatusFilter]);

  const reportStats = useMemo(
    () => buildVendasStats(reportFilteredVendas),
    [reportFilteredVendas]
  );

  const reportPeriodLabel = useMemo(() => {
    const statusLabel =
      reportStatusFilter !== 'todos' ? ` | somente ${reportStatusFilter}s` : '';
    if (!reportStartDate && !reportEndDate) return periodLabel + statusLabel;
    if (reportStartDate && reportEndDate)
      return `${reportStartDate.toLocaleDateString('pt-BR')} até ${reportEndDate.toLocaleDateString('pt-BR')}${statusLabel}`;
    return (
      (reportStartDate
        ? `A partir de ${reportStartDate.toLocaleDateString('pt-BR')}`
        : `Até ${reportEndDate?.toLocaleDateString('pt-BR')}`) + statusLabel
    );
  }, [periodLabel, reportEndDate, reportStartDate, reportStatusFilter]);

  // Actions
  const handleShareReport = async () => {
    let msg = `*Relatório de Vendas - SGE*\nPeriodo: ${reportPeriodLabel}\nTotal: ${formatCurrencyBRL(reportStats.totalValor)}\nRecebido: ${formatCurrencyBRL(reportStats.totalRecebido)}\nReceber: ${formatCurrencyBRL(reportStats.totalReceber)}\n`;
    try {
      await Share.share({ message: msg });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPdf = async (
    vendas = filteredVendas,
    label = periodLabel
  ) => {
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
          saldo:
            statsForExport.totalRecebido +
            statsForExport.totalReceber -
            totalPagar,
          totalVendido: statsForExport.totalValor,
          totalRecebido: statsForExport.totalRecebido,
          ticketMedio: statsForExport.ticketMedio,
          totalRegistros: statsForExport.totalItens,
        },
        itens: vendas.map((v) => ({
          codigo: v.id.slice(0, 8),
          data: toDateSafe(getVendaData(v))?.toLocaleDateString('pt-BR') || '-',
          cliente: getClienteNome(v.clienteId),
          produto: getVendaProdutoNome(v),
          quantidade: `${getVendaQuantidade(v)} ${getVendaUnidade(v)}`,
          precoUnitario: getVendaPrecoUnitario(v),
          valor: getVendaTotal(v),
          valorRecebido:
            getFinancialStatus(v) === 'pago'
              ? getVendaValorRecebido(v)
              : undefined,
          status: getFinancialStatus(v).toUpperCase() as any,
          metodoPagamento: (v.metodoPagamento || 'N/A').toUpperCase(),
          recebidoPor: getRecebidoPor(v),
          observacoes: v.observacoes || null,
        })),
      });
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(error, 'Não foi possível exportar o PDF.')
      );
    }
  };

  const buildAccountingData = useCallback(
    (vendas: any[], label: string) => {
      const currentTenant = availableTenants.find((t) => t.uid === targetId);
      return {
        empresa:
          currentTenant?.name ||
          currentTenant?.ownerName ||
          user?.name ||
          'Produtor',
        periodo: label,
        itens: vendas.map((v) => {
          const cliente = clientesList.find((item) => item.id === v.clienteId);
          const origem =
             v.talhaoId
                ? 'Campo'
                : 'Estufa';
          const vencimento = toDateSafe(
            v.dataCompensacaoCheque || v.dataVencimento
          );
          const dataCompensacaoCheque = toDateSafe(v.dataCompensacaoCheque);
          const dataRecebimento = toDateSafe(v.dataRecebimento);
          const metodoPagamento = String(
            v.metodoPagamento || v.formaPagamento || 'N/A'
          ).toUpperCase();
          const isChequeEmMaos = isChequeEmMaosPayment(v.formaPagamento);
          const valorChequeEmMaos = isChequeEmMaos
            ? Number(v.valorRecebido ?? getVendaTotal(v))
            : 0;
          const status = getFinancialStatus(v).toUpperCase();

          return {
            codigo: String(v.id || '-').slice(0, 8),
            data:
              toDateSafe(getVendaData(v))?.toLocaleDateString('pt-BR') || '-',
            cliente: getClienteNome(v.clienteId),
            documentoCliente: cliente?.documento || '',
            origem,
            estufa: getVendaLocalNome(v),
            lote: getVendaLoteNome(v),
            produto: getVendaProdutoNome(v),
            quantidade: `${getVendaQuantidade(v)} ${getVendaUnidade(v)}`,
            quantidadeValor: getVendaQuantidade(v),
            quantidadeUnidade: getVendaUnidade(v),
            precoUnitario: getVendaPrecoUnitario(v),
            valorTotal: getVendaTotal(v),
            valorRecebido:
              getFinancialStatus(v) === 'pago'
                ? getVendaValorRecebido(v)
                : undefined,
            valorChequeEmMaos,
            metodoPagamento: isChequeEmMaos ? 'CHEQUE EM MÃOS' : metodoPagamento,
            formaPagamento: v.formaPagamento || null,
            status,
            vencimento: vencimento?.toLocaleDateString('pt-BR'),
            dataCompensacaoCheque:
              dataCompensacaoCheque?.toLocaleDateString('pt-BR'),
            dataRecebimento: dataRecebimento?.toLocaleDateString('pt-BR'),
            statusContabil: isChequeEmMaos
              ? 'CHEQUE EM MÃOS'
              : getAccountingStatusLabel({
                  status,
                  metodoPagamento,
                  formaPagamento: v.formaPagamento,
                  dataCompensacaoCheque: v.dataCompensacaoCheque,
                }),
            recebidoPor: getRecebidoPor(v),
            observacoes: String(v.observacoes || ''),
          };
        }),
      };
    },
    [
      availableTenants,
      targetId,
      user?.name,
      clientesList,
      getClienteNome,
      getVendaLocalNome,
      getVendaLoteNome,
      getVendaProdutoNome,
      getRecebidoPor,
    ]
  );

  const handleExportAccountingPdf = async (
    vendas = reportFilteredVendas,
    label = reportPeriodLabel
  ) => {
    if (vendas.length === 0) {
      Alert.alert(
        'Sem dados',
        'Não há vendas no período selecionado para gerar o PDF contábil.'
      );
      return;
    }
    if (exportingAccountingPdf) return;

    setExportingAccountingPdf(true);
    try {
      await shareSalesAccountingPdf(buildAccountingData(vendas, label));
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'Não foi possível exportar o PDF contábil.'
        )
      );
    } finally {
      setExportingAccountingPdf(false);
    }
  };

  const handleExportAccountingExcel = async (
    vendas = reportFilteredVendas,
    label = reportPeriodLabel
  ) => {
    if (vendas.length === 0) {
      Alert.alert(
        'Sem dados',
        'Não há vendas no período selecionado para gerar o Excel.'
      );
      return;
    }
    if (exportingAccountingExcel) return;

    setExportingAccountingExcel(true);
    try {
      await exportSalesAccountingExcel(buildAccountingData(vendas, label));
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'Não foi possível exportar o Excel.'
        )
      );
    } finally {
      setExportingAccountingExcel(false);
    }
  };

  const handleGenerateCustomerStatement = async () => {
    if (!targetId || filterCliente === 'todos' || filterCliente === 'avulso') {
      Alert.alert(
        'Selecione um cliente',
        'Escolha um cliente especÃ­fico para gerar o extrato.'
      );
      return;
    }

    const cliente = clientesList.find((item) => item.id === filterCliente);
    if (!cliente) {
      Alert.alert(
        'Cliente nÃ£o encontrado',
        'NÃ£o foi possÃ­vel localizar o cliente selecionado.'
      );
      return;
    }

    const vendasCliente = modeScopedVendas.filter(
      (venda) => venda.clienteId === filterCliente
    );
    const vendasFinanceiras = vendasCliente.filter(
      (venda) => getFinancialStatus(venda) !== 'cancelado'
    );
    const totalVendido = vendasFinanceiras.reduce(
      (acc, venda) => acc + getVendaTotal(venda),
      0
    );
    const totalPago = vendasFinanceiras
      .filter((venda) => getFinancialStatus(venda) === 'pago')
      .reduce((acc, venda) => acc + getVendaValorRecebido(venda), 0);
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
        empresa:
          availableTenants.find((t) => t.uid === targetId)?.ownerName ||
          user?.name ||
          'Produtor',
        periodo: 'HistÃ³rico completo do cliente',
        vendas: orderedVendas.map((venda) => {
          const isChequeEmMaos = isChequeEmMaosPayment(venda.formaPagamento);
          return {
            codigo: venda.id.slice(0, 8),
            data:
              toDateSafe(getVendaData(venda))?.toLocaleDateString('pt-BR') ||
              '-',
            cliente: cliente.nome,
            estufa: getVendaLocalNome(venda),
            lote: getVendaLoteNome(venda),
            produto: getVendaProdutoNome(venda),
            quantidade: `${getVendaQuantidade(venda)} ${getVendaUnidade(venda)}`,
            quantidadeValor: getVendaQuantidade(venda),
            quantidadeUnidade: getVendaUnidade(venda),
            precoUnitario: getVendaPrecoUnitario(venda),
            valorTotal: getVendaTotal(venda),
            valorRecebido:
              getFinancialStatus(venda) === 'pago'
                ? getVendaValorRecebido(venda)
                : undefined,
            metodoPagamento: isChequeEmMaos
              ? 'CHEQUE EM MÃOS'
              : (
                  venda.metodoPagamento ||
                  venda.formaPagamento ||
                  'N/A'
                ).toUpperCase(),
            status: isChequeEmMaos
              ? 'CHEQUE EM MÃOS'
              : getFinancialStatus(venda).toUpperCase(),
            recebidoPor: getRecebidoPor(venda),
          };
        }),
        totalVendido,
        totalPago,
        totalPendente,
      });
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'NÃ£o foi possÃ­vel gerar o extrato do cliente.'
        )
      );
    }
  };

  const handlePrintReceiptById = async (
    vendaId: string,
    vendaFallback?: any
  ) => {
    if (!targetId || generatingReceiptId) return;
    setGeneratingReceiptId(vendaId);
    try {
      const venda =
        (await getVendaById(vendaId, targetId).catch(() => null)) ||
        vendaFallback;
      if (!venda) {
        throw new Error('Venda não encontrada para gerar o comprovante.');
      }
      const currentTenant = availableTenants.find((t) => t.uid === targetId);
      const cliente =
        clientesList.find((item) => item.id === venda.clienteId) || null;
      await compartilharPDF({
        colheita: venda as any,
        cliente,
        nomeFazenda: currentTenant?.ownerName || user?.name || 'Produtor',
        nomeEstufa: getVendaLocalNome(venda),
        cultura: getVendaProdutoNome(venda),
      });
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(error, 'Não foi possível gerar o PDF.')
      );
    } finally {
      setGeneratingReceiptId(null);
    }
  };

  const handleDeleteVenda = (vendaItem: any) => {
    if (!targetId || deletingVendaId) return;

    Alert.alert(
      'Excluir venda',
      'Esta ação remove permanentemente a venda e seus registros vinculados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingVendaId(vendaItem.id);
            try {
              const venda =
                (await getVendaById(vendaItem.id, targetId).catch(
                  () => null
                )) || vendaItem;
              const onlineOnly = { syncMode: 'online_only' as const };
              const deletionTarget = resolveVendaDeletionTarget(venda);
              if (!deletionTarget) {
                throw new Error('Não foi possível identificar a venda.');
              }

              if (deletionTarget.type === 'colheita') {
                await deleteColheita(
                  deletionTarget.id,
                  targetId,
                  onlineOnly,
                  auditActor
                );
              } else {
                await deleteVenda(
                  deletionTarget.id,
                  targetId,
                  onlineOnly,
                  auditActor
                );
              }

              await Promise.all([
                vendasQuery.refetch(),
                queryClient.invalidateQueries({
                  queryKey: queryKeys.dashboard(targetId),
                }),
              ]);
              Alert.alert(
                'Venda excluída',
                'A venda foi removida com sucesso.'
              );
            } catch (error) {
              Alert.alert(
                'Não foi possível excluir',
                resolveServiceErrorMessage(
                  error,
                  'Confira sua conexão e sua permissão para excluir vendas.'
                )
              );
            } finally {
              setDeletingVendaId(null);
            }
          },
        },
      ]
    );
  };

  const openReceiptConfirmation = (venda: any) => {
    const today = new Date();
    setSelectedVenda(venda);
    setReceiptEditMode(false);
    setMetodoRecebimento('');
    setChequeEmMaos(isChequeEmMaosPayment(venda.formaPagamento));
    setPagamentoPara(venda.pagamentoPara || null);
    setValorRecebido(formatMoneyInput(getVendaTotal(venda)));
    setDataRecebimento(today);
    setDataRecebimentoInput(formatDateInputBR(today));
    setReceiptModalVisible(true);
  };

  const openReceiptCorrection = (venda: any) => {
    const receiptDate = toDateSafe(venda.dataRecebimento) || new Date();
    setSelectedVenda(venda);
    setReceiptEditMode(true);
    setMetodoRecebimento(venda.metodoPagamento || venda.formaPagamento || '');
    setChequeEmMaos(false);
    setPagamentoPara(venda.pagamentoPara || null);
    setValorRecebido(
      formatMoneyInput(
        venda.valorRecebido != null
          ? Number(venda.valorRecebido)
        : getVendaTotal(venda)
      )
    );
    setDataRecebimento(receiptDate);
    setDataRecebimentoInput(formatDateInputBR(receiptDate));
    setShowReceiptDatePicker(false);
    setReceiptModalVisible(true);
  };

  const closeReceiptConfirmation = () => {
    if (confirmingReceipt) return;
    setReceiptModalVisible(false);
    setSelectedVenda(null);
    setReceiptEditMode(false);
    setShowReceiptDatePicker(false);
  };

  const confirmReceipt = async () => {
    if (!targetId || !selectedVenda) return;
    if (!metodoRecebimento) {
      Alert.alert(
        'Forma de recebimento',
        'Selecione como o pagamento foi recebido.'
      );
      return;
    }
    const shouldMarkChequeEmMaos =
      !receiptEditMode && metodoRecebimento === 'cheque' && chequeEmMaos;
    if (!shouldMarkChequeEmMaos && !pagamentoPara) {
      Alert.alert(
        'Pessoa do caixa',
        'Selecione ou cadastre quem recebeu o pagamento.'
      );
      return;
    }
    const valorRecebidoNumero = parseMoneyInput(valorRecebido);
    if (
      !valorRecebido.trim() ||
      !Number.isFinite(valorRecebidoNumero) ||
      valorRecebidoNumero < 0
    ) {
      Alert.alert(
        'Valor recebido',
        'Informe quanto o cliente realmente pagou.'
      );
      return;
    }

    const receiptDate =
      Platform.OS === 'web'
        ? parseDateInputBR(dataRecebimentoInput)
        : dataRecebimento;
    if (!receiptDate) {
      Alert.alert('Data inválida', 'Informe a data no formato dd/mm/aaaa.');
      return;
    }

    const saleDate = toDateSafe(getVendaData(selectedVenda));
    if (saleDate) {
      const saleDay = new Date(saleDate);
      const receiptDay = new Date(receiptDate);
      saleDay.setHours(0, 0, 0, 0);
      receiptDay.setHours(0, 0, 0, 0);
      if (receiptDay.getTime() < saleDay.getTime()) {
        Alert.alert(
          'Data inválida',
          'A data do recebimento não pode ser anterior à data da venda.'
        );
        return;
      }
    }

    setConfirmingReceipt(true);
    try {
      if (shouldMarkChequeEmMaos) {
        await markVendaChequeEmMaos(
          selectedVenda.id,
          targetId,
          receiptDate,
          valorRecebidoNumero,
          undefined,
          auditActor
        );
      } else if (receiptEditMode) {
        await updateVendaReceipt(
          selectedVenda.id,
          targetId,
          {
            metodoRecebimento,
            pagamentoPara,
            receivedAt: receiptDate,
            valorRecebido: valorRecebidoNumero,
          },
          undefined,
          auditActor
        );
      } else {
        await receberVenda(
          selectedVenda.id,
          targetId,
          metodoRecebimento,
          pagamentoPara,
          undefined,
          auditActor,
          receiptDate,
          valorRecebidoNumero
        );
      }
      await Promise.all([
        vendasQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard(targetId),
        }),
      ]);
      setReceiptModalVisible(false);
      setSelectedVenda(null);
      setReceiptEditMode(false);
      Alert.alert(
        shouldMarkChequeEmMaos
          ? 'Cheque registrado'
          : receiptEditMode
            ? 'Recebimento atualizado'
            : 'Entrada confirmada',
        shouldMarkChequeEmMaos
          ? 'O cheque ficou marcado como em mãos, sem entrar no caixa.'
          : receiptEditMode
          ? 'A data, a forma de recebimento e o caixa foram atualizados.'
          : 'O recebimento foi confirmado e o valor entrou no caixa.'
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          receiptEditMode
            ? 'Não foi possível atualizar o recebimento.'
            : 'Não foi possível confirmar o recebimento.'
        )
      );
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const showRemoveReceiptResult = (title: string, message: string) => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.alert === 'function'
    ) {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const performRemoveReceipt = async (venda: any) => {
    if (!targetId) return;
    setRemovingReceiptId(venda.id);
    try {
      await removeVendaReceipt(venda.id, targetId, undefined, auditActor);
      await Promise.all([
        vendasQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard(targetId),
        }),
      ]);
      showRemoveReceiptResult(
        'Recebimento removido',
        'A venda voltou para A receber. Agora registre o pagamento na venda correta.'
      );
    } catch (error) {
      showRemoveReceiptResult(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'Não foi possível remover o recebimento.'
        )
      );
    } finally {
      setRemovingReceiptId(null);
    }
  };

  const handleRemoveReceipt = (venda: any) => {
    if (!targetId) return;
    const message =
      'Use esta opção quando o pagamento foi registrado na venda errada. A venda voltará para A receber e o valor sairá dos recebidos.';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function'
    ) {
      if (window.confirm(`Remover recebimento?\n\n${message}`)) {
        void performRemoveReceipt(venda);
      }
      return;
    }

    Alert.alert('Remover recebimento?', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          void performRemoveReceipt(venda);
        },
      },
    ]);
  };

  const saveCaixaPerson = async () => {
    if (!targetId || !novoCaixaNome.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome da pessoa do caixa.');
      return;
    }

    setSavingCaixaPerson(true);
    try {
      const id = await createCaixaPessoa(
        { nome: novoCaixaNome.trim() },
        targetId
      );
      await caixaPessoasQuery.refetch();
      setPagamentoPara(id);
      setNovoCaixaNome('');
      setCaixaPersonModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Erro',
        resolveServiceErrorMessage(
          error,
          'Não foi possível cadastrar a pessoa do caixa.'
        )
      );
    } finally {
      setSavingCaixaPerson(false);
    }
  };

  // Rendering
  const renderItem = ({ item }: { item: any }) => (
    <VendaItemCard
      item={item}
      theme={theme}
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
      isGeneratingReceipt={generatingReceiptId === item.id}
      onDelete={() => handleDeleteVenda(item)}
      isDeleting={deletingVendaId === item.id}
      onEdit={() =>
        navigation.navigate(item.talhaoId ? 'CampoVendaForm' : 'ColheitaForm', {
          vendaId: item.id,
          isEdit: true,
        })
      }
      onReceive={() => openReceiptConfirmation(item)}
      onEditReceipt={() => openReceiptCorrection(item)}
      onRemoveReceipt={() => handleRemoveReceipt(item)}
      isRemovingReceipt={removingReceiptId === item.id}
    />
  );

  const selectedValorCombinado = selectedVenda
    ? getVendaTotal(selectedVenda)
    : 0;
  const selectedValorRecebido = parseMoneyInput(valorRecebido);
  const selectedValorDifference = Number.isFinite(selectedValorRecebido)
    ? selectedValorRecebido - selectedValorCombinado
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.pageBackground }]}>
      <FlatList
        data={filteredVendas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={refreshAll}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        ListHeaderComponent={
          <>
            <ScreenHeaderCard
              title="Financeiro"
              subtitle={`Gestão de vendas e fluxo de caixa — ${
                productionMode === 'campo'
                  ? 'Campo'
                  :  'Estufas'
              }.`}
              badgeLabel={
                productionMode === 'campo'
                  ? 'Campo'
                  :  'Estufas'
              }
            >
              <VendasHeaderStats stats={stats} />
            </ScreenHeaderCard>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.financeLinksRow}
            >
              {[
                {
                  label: 'Vendas',
                  icon: 'cash-multiple',
                  active: true,
                  screen: 'VendasList',
                },
                {
                  label: 'A receber',
                  icon: 'cash-clock',
                  action: () => setFinanceView('receber'),
                },
                {
                  label: 'Despesas',
                  icon: 'cash-minus',
                  screen: 'DespesasList',
                },
                {
                  label: 'Caixa',
                  icon: 'wallet-outline',
                  screen: 'CaixaResumo',
                  hidden: !canViewCash,
                },
              ]
                .filter((l) => !l.hidden)
                .map((link) => (
                  <TouchableOpacity
                    key={link.label}
                    style={[
                      styles.financeLink,
                      link.active && {
                        borderColor: theme.info,
                        backgroundColor: theme.infoSoft,
                      },
                    ]}
                    onPress={() =>
                      link.active
                        ? setFinanceView('todos')
                        : link.action
                          ? link.action()
                          : navigation.navigate(link.screen)
                    }
                  >
                    <MaterialCommunityIcons
                      name={link.icon as any}
                      size={16}
                      color={link.active ? theme.info : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.financeLinkText,
                        {
                          color: link.active ? theme.info : theme.textSecondary,
                        },
                      ]}
                    >
                      {link.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <VendasSummary
              stats={stats}
              totalPagar={totalPagar}
              periodLabel={periodLabel}
              activeFiltersLabel={
                activeFiltersCount > 0
                  ? `${activeFiltersCount} filtro(s)`
                  : 'Sem filtros'
              }
              theme={theme}
              onNavigateToContas={() => setFinanceView('receber')}
              onNavigateToDespesas={() => navigation.navigate('DespesasList')}
            />

            <VendasToolbar
              searchPlaceholder={
                isCampoMode
                  ? 'Buscar cliente, talhão ou produto...'
                  : 'Buscar cliente, local ou produto...'
              }
              searchText={searchText}
              onSearchChange={setSearchText}
              onShowFilters={() => setShowFilterModal(true)}
              onShowReports={() => setShowReportModal(true)}
              onExportPdf={() => handleExportPdf()}
              activeFiltersCount={activeFiltersCount}
              showStatementBtn={
                filterCliente !== 'todos' && filterCliente !== 'avulso'
              }
              statementClientName={selectedClienteNome}
              onGenerateStatement={handleGenerateCustomerStatement}
              theme={theme}
            />

            {activeFilterChips.length > 0 ? (
              <View
                style={[
                  styles.activeFiltersCard,
                  {
                    backgroundColor: theme.surfaceBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.activeFiltersHeader}>
                  <View style={styles.activeFiltersTitleRow}>
                    <MaterialCommunityIcons
                      name="filter-check-outline"
                      size={18}
                      color={theme.info}
                    />
                    <Text
                      style={[
                        styles.activeFiltersTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Filtros ativos
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setFilterCliente('todos');
                      setFinanceView('todos');
                      setStartDate(null);
                      setEndDate(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.activeFiltersClearText,
                        { color: theme.info },
                      ]}
                    >
                      Limpar
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeFiltersRow}
                >
                  {activeFilterChips.map((chip) => (
                    <View
                      key={chip}
                      style={[
                        styles.activeFilterChip,
                        { backgroundColor: theme.infoSoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeFilterChipText,
                          { color: theme.info },
                        ]}
                      >
                        {chip}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.statusSection}>
              <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                Movimentações financeiras
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statusPillsRow}
              >
                {(
                  [
                    {
                      id: 'todos',
                      label: 'Todas',
                      icon: 'format-list-bulleted',
                    },
                    { id: 'receber', label: 'A receber', icon: 'cash-clock' },
                    {
                      id: 'cheques',
                      label: 'Cheques',
                      icon: 'calendar-clock-outline',
                    },
                    { id: 'recebidas', label: 'Recebidas', icon: 'cash-check' },
                  ] as Array<{ id: FinanceView; label: string; icon: string }>
                ).map((view) => (
                  <TouchableOpacity
                    key={view.id}
                    style={[
                      styles.statusPill,
                      financeView === view.id && {
                        borderColor: theme.info,
                        backgroundColor: theme.infoSoft,
                      },
                    ]}
                    onPress={() => setFinanceView(view.id)}
                  >
                    <MaterialCommunityIcons
                      name={view.icon as any}
                      size={17}
                      color={
                        financeView === view.id
                          ? theme.info
                          : theme.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            financeView === view.id
                              ? theme.info
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {view.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {loading && (
              <ActivityIndicator
                size="large"
                color={theme.info}
                style={styles.loading}
              />
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="basket-off-outline"
              title="Nenhuma venda encontrada"
              description="Tente ajustar os filtros."
            />
          ) : null
        }
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
        onClear={() => {
          setFilterCliente('todos');
          setStartDate(null);
          setEndDate(null);
        }}
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
        onExportPdf={() =>
          handleExportPdf(reportFilteredVendas, reportPeriodLabel)
        }
        onExportAccountingPdf={() =>
          handleExportAccountingPdf(reportFilteredVendas, reportPeriodLabel)
        }
        accountingPdfLoading={exportingAccountingPdf}
        accountingExcelLoading={exportingAccountingExcel}
        onExportAccountingExcel={() =>
          handleExportAccountingExcel(reportFilteredVendas, reportPeriodLabel)
        }
        onShareReport={handleShareReport}
      />

      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReceiptConfirmation}
      >
        <View
          style={[styles.receiptOverlay, { backgroundColor: theme.overlay }]}
        >
          <ScrollView
            style={[
              styles.receiptModal,
              { backgroundColor: theme.surfaceBackground },
            ]}
            contentContainerStyle={styles.receiptModalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.receiptHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.receiptEyebrow, { color: theme.info }]}>
                  {receiptEditMode
                    ? 'CORREÇÃO DO RECEBIMENTO'
                    : 'BAIXA DIRETA NO FINANCEIRO'}
                </Text>
                <Text
                  style={[styles.receiptTitle, { color: theme.textPrimary }]}
                >
                  {receiptEditMode
                    ? 'Editar recebimento'
                    : 'Confirmar recebimento'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeReceiptConfirmation}
                disabled={confirmingReceipt}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={25}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {selectedVenda ? (
              <View
                style={[
                  styles.receiptSummary,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.receiptClient, { color: theme.textPrimary }]}
                  >
                    {getClienteNome(selectedVenda.clienteId)}
                  </Text>
                  <Text
                    style={[
                      styles.receiptProduct,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {getVendaProdutoNome(selectedVenda)}
                  </Text>
                </View>
                <Text style={[styles.receiptValue, { color: theme.info }]}>
                  {formatCurrencyBRL(getVendaTotal(selectedVenda))}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.receivedValueCard,
                {
                  backgroundColor: theme.successBackground,
                  borderColor: theme.success,
                },
              ]}
            >
              <View style={styles.receivedValueHeader}>
                <View style={styles.receivedValueIcon}>
                  <MaterialCommunityIcons
                    name="cash-check"
                    size={21}
                    color={theme.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.receivedValueLabel,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {chequeEmMaos
                      ? 'Valor do cheque em mãos *'
                      : 'Quanto o cliente realmente pagou? *'}
                  </Text>
                  <Text
                    style={[
                      styles.receivedValueHint,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {chequeEmMaos
                      ? 'Esse valor não entra no caixa até confirmar a compensação.'
                      : 'O valor combinado continuará salvo para conferência.'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.receivedValueInputRow,
                  {
                    backgroundColor: theme.surfaceBackground,
                    borderColor: theme.success,
                  },
                ]}
              >
                <Text
                  style={[styles.receivedValuePrefix, { color: theme.success }]}
                >
                  R$
                </Text>
                <TextInput
                  style={[
                    styles.receivedValueInput,
                    { color: theme.textPrimary },
                  ]}
                  value={valorRecebido}
                  onChangeText={(value) =>
                    setValorRecebido(sanitizeDecimalInput(value))
                  }
                  placeholder="0,00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              {Math.abs(selectedValorDifference) >= 0.01 ? (
                <Text
                  style={[
                    styles.receivedDifference,
                    {
                      color:
                        selectedValorDifference < 0
                          ? theme.warning
                          : theme.success,
                    },
                  ]}
                >
                  {selectedValorDifference < 0
                    ? `${formatCurrencyBRL(Math.abs(selectedValorDifference))} abaixo do combinado`
                    : `${formatCurrencyBRL(selectedValorDifference)} acima do combinado`}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.receivedDifference,
                    { color: theme.textSecondary },
                  ]}
                >
                  Mesmo valor combinado
                </Text>
              )}
            </View>

            {metodoRecebimento === 'cheque' ? (
              <View
                style={[
                  styles.chequeReceiptNotice,
                  {
                    backgroundColor: theme.warningSoft,
                    borderColor: theme.warning,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="calendar-clock-outline"
                  size={19}
                  color={theme.warning}
                />
                <Text
                  style={[
                    styles.chequeReceiptText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {receiptEditMode
                    ? 'Use a data real da entrada abaixo para informar quando o cheque efetivamente caiu.'
                    : `Previsão: ${
                        toDateSafe(
                          selectedVenda?.dataCompensacaoCheque ||
                            selectedVenda?.dataVencimento
                        )?.toLocaleDateString('pt-BR') || 'não informada'
                      }. Confirme somente quando o dinheiro estiver disponível.`}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>
              Forma recebida
            </Text>
            <View
              style={[
                styles.receiptPicker,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <Picker
                selectedValue={metodoRecebimento}
                onValueChange={(value) => {
                  setMetodoRecebimento(value);
                  if (value !== 'cheque') setChequeEmMaos(false);
                }}
                style={{ color: theme.textPrimary }}
                dropdownIconColor={theme.textPrimary}
              >
                <Picker.Item
                  label="Selecione a forma de recebimento..."
                  value=""
                />
                <Picker.Item label="Pix" value="pix" />
                <Picker.Item label="Dinheiro" value="dinheiro" />
                <Picker.Item label="Cartão" value="cartao" />
                <Picker.Item label="Boleto" value="boleto" />
                <Picker.Item label="Cheque" value="cheque" />
                <Picker.Item label="Outro" value="outro" />
              </Picker>
            </View>

            {!receiptEditMode && metodoRecebimento === 'cheque' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chequeWalletOption,
                  {
                    backgroundColor: chequeEmMaos
                      ? theme.warningSoft
                      : theme.surfaceMuted,
                    borderColor: chequeEmMaos ? theme.warning : theme.border,
                  },
                ]}
                onPress={() => {
                  setChequeEmMaos((current) => !current);
                  setPagamentoPara(null);
                }}
              >
                <MaterialCommunityIcons
                  name={
                    chequeEmMaos
                      ? 'checkbox-marked-circle-outline'
                      : 'checkbox-blank-circle-outline'
                  }
                  size={22}
                  color={chequeEmMaos ? theme.warning : theme.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.chequeWalletTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Cheque em mãos, destino a definir
                  </Text>
                  <Text
                    style={[
                      styles.chequeWalletText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Mantém a venda pendente, não entra no caixa e sai destacado
                    no PDF/Excel.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>
              {chequeEmMaos ? 'Data que pegou o cheque' : 'Data real da entrada'}
            </Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={[
                  styles.receiptDateInput,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                value={dataRecebimentoInput}
                onChangeText={(value) => {
                  const formatted = sanitizeDateInputBR(value);
                  setDataRecebimentoInput(formatted);
                  const parsed = parseDateInputBR(formatted);
                  if (parsed) setDataRecebimento(parsed);
                }}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.receiptDateButton,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowReceiptDatePicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar-check-outline"
                  size={20}
                  color={theme.info}
                />
                <Text
                  style={[styles.receiptDateText, { color: theme.textPrimary }]}
                >
                  {dataRecebimento.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>
            )}
            {Platform.OS !== 'web' && showReceiptDatePicker ? (
              <DateTimePicker
                value={dataRecebimento}
                mode="date"
                display="default"
                minimumDate={
                  toDateSafe(getVendaData(selectedVenda)) || undefined
                }
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowReceiptDatePicker(false);
                  if (date) {
                    setDataRecebimento(date);
                    setDataRecebimentoInput(formatDateInputBR(date));
                  }
                }}
              />
            ) : null}

            <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>
              {chequeEmMaos ? 'Destino do cheque' : 'Quem recebeu no caixa'}
            </Text>
            {chequeEmMaos ? (
              <Text style={[styles.receiptHelperText, { color: theme.textSecondary }]}>
                Pode deixar sem selecionar. Depois você define para quem vai e confirma a entrada.
              </Text>
            ) : null}
            {selectedVenda?.metodoPagamento === 'cheque' ? (
              <Text style={[styles.receiptHelperText, { color: theme.textSecondary }]}>
                Se o cheque foi entregue a outra pessoa, selecione quem efetivamente recebeu a entrada agora.
              </Text>
            ) : null}
            <View style={styles.receiptPersonRow}>
              <View
                style={[
                  styles.receiptPicker,
                  {
                    flex: 1,
                    marginBottom: 0,
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Picker
                  selectedValue={pagamentoPara || ''}
                  onValueChange={(value) => setPagamentoPara(value || null)}
                  style={{ color: theme.textPrimary }}
                  dropdownIconColor={theme.textPrimary}
                >
                  <Picker.Item label="Selecione uma pessoa..." value="" />
                  {(caixaPessoasQuery.data || []).map((pessoa) => (
                    <Picker.Item
                      key={pessoa.id}
                      label={pessoa.nome}
                      value={pessoa.id}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={[
                  styles.addReceiptPerson,
                  { backgroundColor: theme.infoSoft, borderColor: theme.info },
                ]}
                onPress={() => setCaixaPersonModalVisible(true)}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={22}
                  color={theme.info}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.receiptActions}>
              <LoadingButton
                label="Cancelar"
                variant="neutral"
                onPress={closeReceiptConfirmation}
                disabled={confirmingReceipt}
                style={{ flex: 1 }}
              />
              <LoadingButton
                label={
                  chequeEmMaos
                    ? 'Registrar cheque'
                    :
                  receiptEditMode
                    ? 'Salvar correção'
                    : 'Confirmar entrada'
                }
                variant="success"
                onPress={confirmReceipt}
                loading={confirmingReceipt}
                style={{ flex: 1.6 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={caixaPersonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCaixaPersonModalVisible(false)}
      >
        <View
          style={[
            styles.receiptCenterOverlay,
            { backgroundColor: theme.overlay },
          ]}
        >
          <View
            style={[
              styles.caixaPersonModal,
              { backgroundColor: theme.surfaceBackground },
            ]}
          >
            <Text style={[styles.receiptTitle, { color: theme.textPrimary }]}>
              Nova pessoa do caixa
            </Text>
            <Text
              style={[styles.caixaPersonHint, { color: theme.textSecondary }]}
            >
              Ela ficará selecionada neste recebimento.
            </Text>
            <TextInput
              style={[
                styles.caixaPersonInput,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              value={novoCaixaNome}
              onChangeText={setNovoCaixaNome}
              placeholder="Nome da pessoa"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <View style={styles.receiptActions}>
              <LoadingButton
                label="Cancelar"
                variant="neutral"
                onPress={() => setCaixaPersonModalVisible(false)}
                style={{ flex: 1 }}
              />
              <LoadingButton
                label="Salvar"
                onPress={saveCaixaPerson}
                loading={savingCaixaPerson}
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
  loading: { marginVertical: 32 },
  activeFiltersCard: {
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  activeFiltersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeFiltersTitle: { fontSize: 14, fontWeight: '900' },
  activeFiltersClearText: { fontSize: 12, fontWeight: '800' },
  activeFiltersRow: {
    gap: 8,
    paddingTop: 12,
    paddingRight: 20,
  },
  activeFilterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '800',
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
    flexDirection: 'row',
    gap: 6,
    borderColor: '#E2E8F0',
  },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  receiptOverlay: { flex: 1, justifyContent: 'flex-end' },
  receiptModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
  },
  receiptModalContent: {
    padding: 22,
    paddingBottom: 34,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  receiptEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  receiptTitle: { fontSize: 21, fontWeight: '900', marginTop: 3 },
  receiptSummary: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  receiptClient: { fontSize: 15, fontWeight: '900' },
  receiptProduct: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  receiptValue: { fontSize: 18, fontWeight: '900' },
  receivedValueCard: {
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 13,
    marginBottom: 12,
  },
  receivedValueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  receivedValueIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  receivedValueLabel: { fontSize: 13, fontWeight: '900' },
  receivedValueHint: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  receivedValueInputRow: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  receivedValuePrefix: { fontSize: 17, fontWeight: '900', marginRight: 8 },
  receivedValueInput: {
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    paddingVertical: 10,
  },
  receivedDifference: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'right',
  },
  chequeReceiptNotice: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  chequeReceiptText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 7,
  },
  receiptHelperText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 8,
  },
  receiptPicker: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: 6,
  },
  chequeWalletOption: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  chequeWalletTitle: { fontSize: 13, fontWeight: '900' },
  chequeWalletText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  receiptDateButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 6,
  },
  receiptDateText: { fontSize: 14, fontWeight: '800' },
  receiptDateInput: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '800',
  },
  receiptPersonRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  addReceiptPerson: {
    width: 54,
    height: 54,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  receiptCenterOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  caixaPersonModal: { width: '100%', borderRadius: RADIUS.xl, padding: 20 },
  caixaPersonHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  caixaPersonInput: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    minHeight: 52,
    marginTop: 16,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default VendasListScreen;
