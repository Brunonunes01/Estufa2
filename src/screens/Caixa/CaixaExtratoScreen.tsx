import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal
} from 'react-native';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MotiView, MotiScrollView } from 'moti';

import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { RootStackParamList } from '../../navigation/types';
import {
  CaixaMovimento,
  CaixaMovimentosResumo,
  CaixaPeriod,
  CaixaTipoMov,
  getCaixaExtrato,
  getCaixaRelatorio,
} from '../../services/caixaService';
import { listCaixaPessoas, CaixaPessoa } from '../../services/caixaPessoaService';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { gerarRelatorioCaixaPDF } from '../../services/pdfService';
import { exportToExcel } from '../../services/excelService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const EMPTY_CAIXA_SUMMARY: CaixaMovimentosResumo = {
  entradas: 0,
  saidas: 0,
  saldo: 0,
  quantidadeEntradas: 0,
  quantidadeSaidas: 0,
  entradasPrevistas: 0,
  quantidadeEntradasPrevistas: 0,
};

const formatOptionalDate = (value?: Date) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

const isBoxUnit = (value?: string) =>
  ['caixa', 'caixas', 'cx'].includes(String(value || '').trim().toLowerCase());

const CaixaExtratoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, selectedTenantId, availableTenants, canViewCash } = useAuth();
  const { settings } = useAppSettings();
  const route = useRoute<RouteProp<RootStackParamList, 'CaixaExtrato'>>();
  const isFocused = useIsFocused();

  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [tipo, setTipo] = useState<'todos' | CaixaTipoMov>('todos');
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | undefined>(route.params?.caixaPessoaId);
  const [busca, setBusca] = useState('');
  
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [items, setItems] = useState<CaixaMovimento[]>([]);
  const [filteredSummary, setFilteredSummary] =
    useState<CaixaMovimentosResumo>(EMPTY_CAIXA_SUMMARY);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);

  const canView = canViewCash;
  const targetId = selectedTenantId || user?.uid;

  const periods = useMemo(
    () => [
      { id: 'today', label: 'Hoje' },
      { id: '7d', label: '7 dias' },
      { id: 'month', label: 'Mês' },
      { id: 'all', label: 'Tudo' },
      { id: 'custom', label: 'Período' },
    ],
    []
  );

  const tipos = useMemo(
    () => [
      { id: 'todos', label: 'Todas as movimentações' },
      { id: 'entrada', label: 'Entradas' },
      { id: 'saida', label: 'Saídas' },
    ],
    []
  );

  const load = useCallback(
    async (nextPage = 1) => {
      if (!targetId || !canView) return;
      setLoading(true);
      try {
        const result = await getCaixaExtrato(
          targetId,
          {
            range: {
              period,
              from: period === 'custom' ? dateFrom : undefined,
              to: period === 'custom' ? dateTo : undefined,
            },
            tipo,
            caixaPessoaId: selectedPessoaId,
            busca,
            page: nextPage,
            pageSize: 50,
          },
          settings.activeProductionMode
        );

        setItems((prev) => (nextPage === 1 ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        setTotalItems(result.total);
        setFilteredSummary(result.resumo);
        setPage(nextPage);
      } catch (err) {
        console.error('Erro ao carregar extrato:', err);
      } finally {
        setLoading(false);
      }
    },
    [
      busca,
      canView,
      dateFrom,
      dateTo,
      period,
      selectedPessoaId,
      settings.activeProductionMode,
      targetId,
      tipo,
    ]
  );

  const filteredTotals = filteredSummary;

  const groupedItems = useMemo(() => {
    const groups: any[] = [];
    let lastDate = '';
    items.forEach((item) => {
      const dateStr = new Date(item.data).toLocaleDateString('pt-BR');
      if (dateStr !== lastDate) {
        groups.push({ isHeader: true, date: dateStr, id: `header-${dateStr}` });
        lastDate = dateStr;
      }
      groups.push(item);
    });
    return groups;
  }, [items]);

  useEffect(() => {
    const loadPessoas = async () => {
      if (!targetId) return;
      try {
        const list = await listCaixaPessoas(targetId);
        setCaixaPessoas(list);
      } catch (error) {
        console.error(error);
      }
    };
    void loadPessoas();
  }, [targetId]);

  useEffect(() => {
    if (isFocused) {
      void load(1);
    }
  }, [dateFrom, dateTo, busca, isFocused, load, period, selectedPessoaId, tipo]);

  const selectedPessoaNome = useMemo(() => {
    if (!selectedPessoaId) return null;
    return caixaPessoas.find((pessoa) => pessoa.id === selectedPessoaId)?.nome || 'Responsável';
  }, [caixaPessoas, selectedPessoaId]);

  const tenantNome = useMemo(() => {
    const tenant = availableTenants.find((item) => item.uid === targetId);
    return (
      tenant?.name ||
      tenant?.ownerName ||
      user?.name ||
      user?.displayName ||
      user?.email ||
      'Produtor'
    );
  }, [availableTenants, targetId, user?.displayName, user?.email, user?.name]);

  const currentPeriodLabel = useCallback(() => {
    if (period === 'custom') {
      return `${dateFrom.toLocaleDateString('pt-BR')} até ${dateTo.toLocaleDateString('pt-BR')}`;
    }
    return periods.find((item) => item.id === period)?.label || period;
  }, [dateFrom, dateTo, period, periods]);

  const loadFullFilteredReport = useCallback(async () => {
    if (!targetId) return null;
    return getCaixaRelatorio(
      targetId,
      {
        range: {
          period,
          from: period === 'custom' ? dateFrom : undefined,
          to: period === 'custom' ? dateTo : undefined,
        },
        tipo,
        caixaPessoaId: selectedPessoaId,
        busca,
      },
      settings.activeProductionMode
    );
  }, [
    busca,
    dateFrom,
    dateTo,
    period,
    selectedPessoaId,
    settings.activeProductionMode,
    targetId,
    tipo,
  ]);

  const clearFilters = () => {
    setPeriod('month');
    setTipo('todos');
    setSelectedPessoaId(undefined);
    const now = new Date();
    setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1));
    setDateTo(now);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const report = await loadFullFilteredReport();
      if (!report || report.items.length === 0) {
        Alert.alert('Aviso', 'Não há dados para exportar com os filtros atuais.');
        return;
      }

      await gerarRelatorioCaixaPDF({
        tenantNome,
        periodo: currentPeriodLabel(),
        responsavel: selectedPessoaNome || 'Todos os responsáveis',
        tipoFiltro: tipos.find((item) => item.id === tipo)?.label || tipo,
        busca: busca.trim() || undefined,
        resumo: report.resumo,
        movimentos: report.items,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const report = await loadFullFilteredReport();
      if (!report || report.items.length === 0) {
        Alert.alert('Aviso', 'Não há dados para exportar com os filtros atuais.');
        return;
      }

      await exportToExcel({
        fileName: `Relatorio_Caixa_${selectedPessoaNome || 'Todos'}_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Caixa detalhado',
        columns: [
          { header: 'Data do Caixa', key: 'dataCaixa', width: 15 },
          { header: 'Data da Venda', key: 'dataVenda', width: 15 },
          { header: 'Data da Baixa', key: 'dataRecebimento', width: 15 },
          { header: 'Compensação do Cheque', key: 'dataCheque', width: 22 },
          { header: 'Vencimento', key: 'dataVencimento', width: 15 },
          { header: 'Referência', key: 'referencia', width: 38 },
          { header: 'Cliente', key: 'cliente', width: 25 },
          { header: 'Descrição', key: 'descricao', width: 35 },
          { header: 'Responsável', key: 'pessoa', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Situação', key: 'status', width: 25 },
          { header: 'Origem', key: 'origem', width: 15 },
          { header: 'Origem da Produção', key: 'origemProducao', width: 22 },
          { header: 'Itens / Quantidades', key: 'itens', width: 60 },
          { header: 'Quantidade de Caixas', key: 'caixas', width: 22 },
          { header: 'Valor Combinado', key: 'valorCombinado', width: 18 },
          { header: 'Valor Recebido', key: 'valorRecebido', width: 18 },
          { header: 'Valor no Caixa', key: 'valorCaixa', width: 18 },
          { header: 'Meio Pagamento', key: 'metodo', width: 20 },
          { header: 'Categoria', key: 'categoria', width: 20 },
          { header: 'Observações', key: 'obs', width: 30 },
        ],
        data: report.items.map((item) => ({
          dataCaixa: formatOptionalDate(item.data),
          dataVenda: formatOptionalDate(item.dataVenda),
          dataRecebimento: formatOptionalDate(item.dataRecebimento),
          dataCheque: formatOptionalDate(item.dataCompensacaoCheque),
          dataVencimento: formatOptionalDate(item.dataVencimento),
          referencia: item.referenciaId,
          cliente: item.clienteNome || (item.tipo === 'entrada' ? 'Cliente avulso' : '-'),
          descricao: item.descricao,
          pessoa: item.caixaPessoaNome,
          tipo: item.tipo === 'entrada' ? 'Entrada' : 'Saída',
          status:
            item.status === 'previsto'
              ? 'Aguardando compensação'
              : item.tipo === 'entrada'
                ? 'Recebido'
                : 'Pago',
          origem: item.origem === 'venda' ? 'Venda' : 'Despesa',
          origemProducao: item.origemProducao || '-',
          itens:
            item.itens
              .map(
                (detail) =>
                  `${detail.descricao}: ${detail.quantidade} ${detail.unidade || 'un'} x ${formatCurrency(detail.valorUnitario)} = ${formatCurrency(detail.valorTotal)}`
              )
              .join(' | ') || item.descricao,
          caixas: item.itens
            .filter((detail) => isBoxUnit(detail.unidade))
            .reduce((total, detail) => total + Number(detail.quantidade || 0), 0),
          valorCombinado:
            item.origem === 'venda' ? Number(item.valorCombinado ?? item.valor) : '',
          valorRecebido:
            item.origem === 'venda' && item.valorRecebido != null
              ? Number(item.valorRecebido)
              : '',
          valorCaixa: item.tipo === 'entrada' ? item.valor : -item.valor,
          metodo: String(item.metodoPagamento || '-').replace(/_/g, ' ').toUpperCase(),
          categoria: item.categoria || '-',
          obs: item.observacoes || '-',
        })),
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao gerar arquivo Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowPicker(null);
    if (selectedDate) {
      if (showPicker === 'from') setDateFrom(selectedDate);
      if (showPicker === 'to') setDateTo(selectedDate);
    }
  };

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.pageBackground }]}>
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
          style={[styles.lockCircle, { backgroundColor: theme.surfaceMuted }]}
        >
          <MaterialCommunityIcons name="lock-outline" size={36} color={theme.textSecondary} />
        </MotiView>
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Acesso Restrito</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.topArea, { backgroundColor: theme.panelBackground, paddingTop: Math.max(insets.top, 10) }]}>
        <MotiView 
          from={{ opacity: 0, translateY: -15 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.topHeader}
        >
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={[styles.pageTitle, { color: theme.rawColors.textLight }]}>Extrato</Text>
            <Text style={[styles.pageSubtitle, { color: theme.rawColors.whiteAlpha60 }]} numberOfLines={1}>
              Movimentações do caixa
            </Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleExportExcel} style={styles.exportBtn} disabled={exportingExcel}>
              {exportingExcel ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="file-excel-outline" size={24} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleExportPdf} style={[styles.exportBtn, { marginLeft: 8 }]} disabled={exporting}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />}
            </TouchableOpacity>
          </View>
        </MotiView>

        <MotiView 
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 100 }}
          style={[styles.summaryBox, { borderColor: 'rgba(255,255,255,0.1)' }]}
        >
          <Text style={[styles.summaryLabel, { color: theme.rawColors.whiteAlpha60 }]}>SALDO CONFIRMADO</Text>
          <Text style={[styles.summaryValue, { color: theme.rawColors.textLight }]}>{formatCurrency(filteredTotals.saldo)}</Text>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <MaterialCommunityIcons name="arrow-top-right" size={14} color={theme.success} />
              <Text style={[styles.summaryStat, { color: theme.success }]}>{formatCurrency(filteredTotals.entradas)}</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <MaterialCommunityIcons name="arrow-bottom-right" size={14} color={theme.danger} />
              <Text style={[styles.summaryStat, { color: theme.danger }]}>{formatCurrency(filteredTotals.saidas)}</Text>
            </View>
            {filteredTotals.entradasPrevistas > 0 && (
               <View style={styles.summaryStatItem}>
                 <MaterialCommunityIcons name="clock-outline" size={14} color={theme.warning} />
                 <Text style={[styles.summaryStat, { color: theme.warning }]}>
                   {formatCurrency(filteredTotals.entradasPrevistas)}
                 </Text>
               </View>
            )}
          </View>
        </MotiView>
      </View>

      <View style={styles.searchContainer}>
        <MotiView 
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 150, type: 'spring' }}
          style={[styles.searchBox, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }, SHADOWS.floating]}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Buscar por cliente, obs ou desc..."
            placeholderTextColor={theme.textMuted}
            value={busca}
            onChangeText={setBusca}
            selectionColor={COLORS.modFinanceiro}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} style={{ marginRight: 10 }}>
              <MaterialCommunityIcons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setFiltersModalVisible(true)}
            style={[styles.filterActionBtn, { backgroundColor: theme.surfaceMuted }]}
          >
            <MaterialCommunityIcons name="tune" size={20} color={COLORS.modFinanceiro} />
          </TouchableOpacity>
        </MotiView>
      </View>

      <MotiScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.activeFiltersRow}
        from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 200 }}
      >
        <TouchableOpacity style={[styles.activeFilterChip, { backgroundColor: COLORS.modFinanceiro + '15', borderColor: COLORS.modFinanceiro }]} onPress={() => setFiltersModalVisible(true)}>
          <Text style={[styles.activeFilterChipText, { color: COLORS.modFinanceiro }]}>
            Periodo: {period === 'custom' ? 'Customizado' : periods.find(p => p.id === period)?.label}
          </Text>
          <MaterialCommunityIcons name="menu-down" size={16} color={COLORS.modFinanceiro} />
        </TouchableOpacity>

        {tipo !== 'todos' && (
          <TouchableOpacity style={[styles.activeFilterChip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} onPress={() => setTipo('todos')}>
            <Text style={[styles.activeFilterChipText, { color: theme.textPrimary }]}>
              {tipos.find(t => t.id === tipo)?.label}
            </Text>
            <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {selectedPessoaId && (
          <TouchableOpacity style={[styles.activeFilterChip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} onPress={() => setSelectedPessoaId(undefined)}>
            <Text style={[styles.activeFilterChipText, { color: theme.textPrimary }]}>
              {selectedPessoaNome}
            </Text>
            <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {(period !== 'month' || tipo !== 'todos' || selectedPessoaId) && (
          <TouchableOpacity style={{ paddingVertical: 8, paddingHorizontal: 12 }} onPress={clearFilters}>
            <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>Limpar tudo</Text>
          </TouchableOpacity>
        )}
      </MotiScrollView>

      <View
        style={[
          styles.reportCta,
          {
            backgroundColor: theme.surfaceBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.reportCtaIcon, { backgroundColor: theme.successSoft }]}>
          <MaterialCommunityIcons
            name="file-chart-outline"
            size={24}
            color={COLORS.modFinanceiro}
          />
        </View>
        <View style={styles.reportCtaContent}>
          <Text style={[styles.reportCtaTitle, { color: theme.textPrimary }]}>Relatório detalhado</Text>
          <Text style={[styles.reportCtaSubtitle, { color: theme.textSecondary }]}>
            {totalItems} registro(s), com vendas, clientes, caixas e pagamentos conforme os filtros.
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleExportPdf}
          style={[styles.reportCtaButton, { backgroundColor: COLORS.modFinanceiro }]}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
              <Text style={styles.reportCtaButtonText}>Gerar PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBackground }}>
      <FlatList
        data={groupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={loading && items.length === 0} onRefresh={() => load(1)} tintColor={COLORS.modFinanceiro} />
        }
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => {
          if (item.isHeader) {
            return (
              <MotiView 
                from={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                style={styles.dateHeaderContainer}
              >
                <View style={[styles.dateBadge, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.dateHeaderText, { color: theme.textPrimary }]}>
                    {item.date}
                  </Text>
                </View>
              </MotiView>
            );
          }

          const isEntrada = item.tipo === 'entrada';
          const isPrevisto = item.status === 'previsto';
          
          return (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: Math.min(index * 20, 300) }}
              style={[styles.itemCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
            >
              <View style={styles.itemTopRow}>
                <View style={[styles.itemIconBox, { backgroundColor: isPrevisto ? theme.warningSoft : isEntrada ? theme.successSoft : theme.dangerSoft }]}>
                  <MaterialCommunityIcons
                    name={isPrevisto ? 'clock-outline' : isEntrada ? 'arrow-bottom-left' : 'arrow-top-right'}
                    size={24}
                    color={isPrevisto ? theme.warning : isEntrada ? theme.success : theme.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemDesc, { color: theme.textPrimary }]} numberOfLines={2}>
                    {item.descricao}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {isPrevisto
                      ? `Previsão: ${new Date(item.data).toLocaleDateString('pt-BR')}`
                      : `${item.caixaPessoaNome}`}
                  </Text>
                </View>
                <View style={styles.itemValueColumn}>
                  <Text style={[styles.itemValue, { color: isPrevisto ? theme.warning : isEntrada ? theme.success : theme.textPrimary }]}>
                    {isPrevisto ? '' : isEntrada ? '+' : '-'} {formatCurrency(item.valor)}
                  </Text>
                  {isPrevisto && <Text style={[styles.pendingLabel, { color: theme.warning }]}>PENDENTE</Text>}
                </View>
              </View>

              <View style={styles.tagsRow}>
                <View style={[styles.tag, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{String(item.origem).toUpperCase()}</Text>
                </View>
                {item.metodoPagamento && (
                  <View style={[styles.tag, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                      {String(item.metodoPagamento).toUpperCase()}
                    </Text>
                  </View>
                )}
                {item.clienteNome && (
                  <View style={styles.clientTag}>
                    <MaterialCommunityIcons name="account" size={12} color={theme.textSecondary} />
                    <Text style={[styles.clientInfo, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.clienteNome}
                    </Text>
                  </View>
                )}
              </View>

              {item.observacoes ? (
                <View style={[styles.obsBox, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.itemObs, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.observacoes}
                  </Text>
                </View>
              ) : null}
            </MotiView>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.emptyContainer}>
              <View style={[styles.emptyIconBg, { backgroundColor: theme.surfaceMuted }]}>
                <MaterialCommunityIcons name="layers-search" size={56} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhum movimento</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Tente ajustar os filtros ou limpar a busca.
              </Text>
            </MotiView>
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => load(page + 1)}
              style={[styles.loadMoreBtn, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.modFinanceiro} />
              ) : (
                <Text style={[styles.loadMoreText, { color: theme.textPrimary }]}>Carregar Mais</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FILTER MODAL */}
      <Modal
        visible={filtersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filtersModalContent, { backgroundColor: theme.surfaceBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setFiltersModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
              <Text style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>Período</Text>
              <View style={styles.modalChipsWrap}>
                {periods.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPeriod(p.id as any)}
                    style={[styles.modalChip, { backgroundColor: period === p.id ? COLORS.modFinanceiro : theme.surfaceMuted, borderColor: period === p.id ? COLORS.modFinanceiro : theme.border }]}
                  >
                    <Text style={[styles.modalChipText, { color: period === p.id ? '#fff' : theme.textPrimary }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {period === 'custom' && (
                <View style={styles.customDateRow}>
                  <TouchableOpacity
                    style={[styles.dateInput, { backgroundColor: theme.pageBackground, borderColor: theme.border }]}
                    onPress={() => setShowPicker('from')}
                  >
                    <MaterialCommunityIcons name="calendar" size={16} color={COLORS.modFinanceiro} />
                    <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateFrom.toLocaleDateString('pt-BR')}</Text>
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textSecondary} />
                  <TouchableOpacity
                    style={[styles.dateInput, { backgroundColor: theme.pageBackground, borderColor: theme.border }]}
                    onPress={() => setShowPicker('to')}
                  >
                    <MaterialCommunityIcons name="calendar" size={16} color={COLORS.modFinanceiro} />
                    <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateTo.toLocaleDateString('pt-BR')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[styles.modalSectionLabel, { color: theme.textSecondary, marginTop: 24 }]}>Tipo de Movimento</Text>
              <View style={styles.modalChipsWrap}>
                {tipos.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setTipo(t.id as any)}
                    style={[styles.modalChip, { backgroundColor: tipo === t.id ? COLORS.modFinanceiro : theme.surfaceMuted, borderColor: tipo === t.id ? COLORS.modFinanceiro : theme.border }]}
                  >
                    <Text style={[styles.modalChipText, { color: tipo === t.id ? '#fff' : theme.textPrimary }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalSectionLabel, { color: theme.textSecondary, marginTop: 24 }]}>Responsável pelo Caixa</Text>
              <View style={styles.modalChipsWrap}>
                <TouchableOpacity
                  onPress={() => setSelectedPessoaId(undefined)}
                  style={[styles.modalChip, { backgroundColor: selectedPessoaId === undefined ? COLORS.modFinanceiro : theme.surfaceMuted, borderColor: selectedPessoaId === undefined ? COLORS.modFinanceiro : theme.border }]}
                >
                  <Text style={[styles.modalChipText, { color: selectedPessoaId === undefined ? '#fff' : theme.textPrimary }]}>Todos</Text>
                </TouchableOpacity>
                {caixaPessoas.map(cp => (
                  <TouchableOpacity
                    key={cp.id}
                    onPress={() => setSelectedPessoaId(cp.id)}
                    style={[styles.modalChip, { backgroundColor: selectedPessoaId === cp.id ? COLORS.modFinanceiro : theme.surfaceMuted, borderColor: selectedPessoaId === cp.id ? COLORS.modFinanceiro : theme.border }]}
                  >
                    <Text style={[styles.modalChipText, { color: selectedPessoaId === cp.id ? '#fff' : theme.textPrimary }]}>{cp.nome}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={[styles.modalFooter, { borderTopColor: theme.divider }]}>
              <TouchableOpacity onPress={() => { clearFilters(); setFiltersModalVisible(false); }} style={styles.modalFooterBtnClear}>
                <Text style={[styles.modalFooterBtnClearText, { color: theme.textSecondary }]}>Limpar Tudo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFiltersModalVisible(false)} style={[styles.modalFooterBtnApply, { backgroundColor: COLORS.modFinanceiro }]}>
                <Text style={styles.modalFooterBtnApplyText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? dateFrom : dateTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  lockTitle: { fontSize: 22, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  
  headerContainer: { paddingBottom: 8, zIndex: 10 },
  topArea: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  topHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontWeight: '600' },
  exportActions: { flexDirection: 'row' },
  exportBtn: { width: 46, height: 46, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  
  summaryBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.xl, padding: 24, borderWidth: 1 },
  summaryLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  summaryValue: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, marginBottom: 16 },
  summaryStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  summaryStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryStat: { fontSize: 15, fontWeight: '800' },
  
  searchContainer: { paddingHorizontal: SPACING.lg, marginTop: -32, zIndex: 11 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: RADIUS.xl, borderWidth: 1, paddingLeft: 20, paddingRight: 8, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600', height: '100%' },
  filterActionBtn: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  
  activeFiltersRow: { paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 10 },
  activeFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, gap: 6 },
  activeFilterChipText: { fontSize: 12, fontWeight: '800' },
  reportCta: {
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCtaContent: { flex: 1 },
  reportCtaTitle: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  reportCtaSubtitle: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  reportCtaButton: {
    minWidth: 104,
    height: 42,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportCtaButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  listContent: { paddingBottom: 24, paddingHorizontal: SPACING.lg },
  dateHeaderContainer: { alignItems: 'center', marginVertical: 20 },
  dateBadge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.pill },
  dateHeaderText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  
  itemCard: { borderRadius: RADIUS.xl, borderWidth: 1, padding: 20, marginBottom: 14 },
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  itemIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  itemDesc: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  itemMeta: { fontSize: 14, fontWeight: '600' },
  itemValueColumn: { alignItems: 'flex-end' },
  itemValue: { fontSize: 18, fontWeight: '900' },
  pendingLabel: { fontSize: 11, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },
  
  tagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingLeft: 62 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  tagText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  clientTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  clientInfo: { fontSize: 13, fontWeight: '700', fontStyle: 'italic', flexShrink: 1 },
  
  obsBox: { marginTop: 14, padding: 14, borderRadius: RADIUS.lg, marginLeft: 62 },
  itemObs: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 14 },
  emptyIconBg: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  
  loadMoreBtn: { marginTop: 20, borderRadius: RADIUS.xl, borderWidth: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  loadMoreText: { fontSize: 16, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  filtersModalContent: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  modalChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1 },
  modalChipText: { fontSize: 14, fontWeight: '800' },
  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  modalFooter: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, borderTopWidth: 1, gap: 16, marginTop: 24, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg },
  modalFooterBtnClear: { paddingVertical: 14, paddingHorizontal: 16 },
  modalFooterBtnClearText: { fontSize: 15, fontWeight: '800' },
  modalFooterBtnApply: { flex: 1, paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center' },
  modalFooterBtnApplyText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateInputText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
});

export default CaixaExtratoScreen;
