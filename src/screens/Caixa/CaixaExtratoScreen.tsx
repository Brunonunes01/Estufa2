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
} from 'react-native';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { CaixaPeriod, CaixaTipoMov, getCaixaExtrato } from '../../services/caixaService';
import { listCaixaPessoas, CaixaPessoa } from '../../services/caixaPessoaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { gerarRelatorioCaixaPDF } from '../../services/pdfService';
import { exportToExcel } from '../../services/excelService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const CaixaExtratoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, selectedTenantId, canViewCash } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'CaixaExtrato'>>();
  const isFocused = useIsFocused();

  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [tipo, setTipo] = useState<'todos' | CaixaTipoMov>('todos');
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | undefined>(route.params?.caixaPessoaId);
  const [busca, setBusca] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);

  const canView = canViewCash;
  const targetId = selectedTenantId || user?.uid;

  const periods = useMemo(
    () => [
      { id: 'today', label: 'Hoje' },
      { id: '7d', label: '7 dias' },
      { id: 'month', label: 'Mes' },
      { id: 'all', label: 'Tudo' },
      { id: 'custom', label: 'Periodo' },
    ],
    []
  );

  const tipos = useMemo(
    () => [
      { id: 'todos', label: 'Todos' },
      { id: 'entrada', label: 'Entradas' },
      { id: 'saida', label: 'Saidas' },
    ],
    []
  );

  const load = useCallback(
    async (nextPage = 1) => {
      if (!targetId || !canView) return;
      setLoading(true);
      try {
        const result = await getCaixaExtrato(targetId, {
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
        });
        setItems((prev) => (nextPage === 1 ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        setPage(nextPage);
      } catch (err) {
        console.error('Erro ao carregar extrato:', err);
      } finally {
        setLoading(false);
      }
    },
    [targetId, canView, period, tipo, selectedPessoaId, busca, dateFrom, dateTo]
  );

  const filteredTotals = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    items.forEach((item) => {
      if (item.tipo === 'entrada') entradas += item.valor;
      else saidas += item.valor;
    });
    return { entradas, saidas, saldo: entradas - saidas };
  }, [items]);

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
      } catch (e) {
        console.error(e);
      }
    };
    void loadPessoas();
  }, [targetId]);

  useEffect(() => {
    if (isFocused) void load(1);
  }, [isFocused, period, tipo, selectedPessoaId, busca, dateFrom, dateTo]);

  const selectedPessoaNome = useMemo(() => {
    if (!selectedPessoaId) return 'Todos os responsaveis';
    return caixaPessoas.find((p) => p.id === selectedPessoaId)?.nome || 'Responsavel';
  }, [caixaPessoas, selectedPessoaId]);

  const activeFiltersLabel = useMemo(() => {
    const periodLabel = periods.find((p) => p.id === period)?.label || period;
    const tipoLabel = tipos.find((t) => t.id === tipo)?.label || tipo;
    const dateLabel =
      period === 'custom'
        ? `${dateFrom.toLocaleDateString('pt-BR')} ate ${dateTo.toLocaleDateString('pt-BR')}`
        : periodLabel;
    return `${dateLabel} • ${tipoLabel} • ${selectedPessoaNome}`;
  }, [periods, period, tipos, tipo, dateFrom, dateTo, selectedPessoaNome]);

  const clearFilters = () => {
    setPeriod('month');
    setTipo('todos');
    setSelectedPessoaId(undefined);
    setBusca('');
    const now = new Date();
    setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1));
    setDateTo(now);
  };

  const handleExportPdf = async () => {
    if (items.length === 0) {
      Alert.alert('Aviso', 'Não há dados para exportar.');
      return;
    }
    setExporting(true);
    try {
      let periodLabel = periods.find((p) => p.id === period)?.label || period;
      if (period === 'custom') {
        periodLabel = `${dateFrom.toLocaleDateString('pt-BR')} ate ${dateTo.toLocaleDateString('pt-BR')}`;
      }

      await gerarRelatorioCaixaPDF({
        tenantNome: user?.displayName || user?.email || 'Estufa',
        periodo: periodLabel,
        totalEntradas: filteredTotals.entradas,
        totalSaidas: filteredTotals.saidas,
        saldoFinal: filteredTotals.saldo,
        movimentos: items.map((m) => ({
          data: new Date(m.data),
          descricao: m.descricao,
          pessoa: m.caixaPessoaNome,
          valor: m.valor,
          tipo: m.tipo,
          origem: m.origem,
          metodoPagamento: m.metodoPagamento,
          observacoes: m.observacoes,
        })),
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (items.length === 0) {
      Alert.alert('Aviso', 'Não há dados para exportar.');
      return;
    }
    setExportingExcel(true);
    try {
      await exportToExcel({
        fileName: `Extrato_Caixa_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Extrato',
        columns: [
          { header: 'Data', key: 'data', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 25 },
          { header: 'Descrição', key: 'descricao', width: 35 },
          { header: 'Responsável', key: 'pessoa', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Valor', key: 'valor', width: 15 },
          { header: 'Origem', key: 'origem', width: 15 },
          { header: 'Meio Pagamento', key: 'metodo', width: 20 },
          { header: 'Observações', key: 'obs', width: 30 },
        ],
        data: items.map((m) => ({
          data: new Date(m.data).toLocaleDateString('pt-BR'),
          cliente: m.clienteNome || (m.tipo === 'entrada' ? 'Cliente avulso' : '-'),
          descricao: m.descricao,
          pessoa: m.caixaPessoaNome,
          tipo: m.tipo === 'entrada' ? 'Entrada' : 'Saída',
          valor: m.valor,
          origem: String(m.origem).toUpperCase(),
          metodo: String(m.metodoPagamento || '-').toUpperCase(),
          obs: m.observacoes || '-',
        })),
      });
    } catch (e) {
      console.error(e);
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
      <View style={[styles.centered, { backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Acesso restrito</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => (navigation as any).navigate('MainTabs', { screen: 'FinanceiroTab' })}
        >
          <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Vendas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('ContasReceber' as never)}
        >
          <MaterialCommunityIcons name="cash-clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Contas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, { borderColor: theme.border, backgroundColor: theme.surfaceBackground }]}
          onPress={() => navigation.navigate('DespesasList' as never)}
        >
          <MaterialCommunityIcons name="cash-minus" size={16} color={theme.textSecondary} />
          <Text style={[styles.financeLinkText, { color: theme.textSecondary }]}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.financeLink, styles.financeLinkActive, { borderColor: COLORS.modFinanceiro }]}
          onPress={() => navigation.navigate('CaixaResumo' as never)}
        >
          <MaterialCommunityIcons name="wallet-outline" size={16} color={COLORS.modFinanceiro} />
          <Text style={[styles.financeLinkText, { color: COLORS.modFinanceiro }]}>Caixa</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.heroCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIconBox, { backgroundColor: `${COLORS.modFinanceiro}18` }]}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.modFinanceiro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Extrato do caixa</Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
              Filtre os movimentos e acompanhe o saldo da visao atual.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              onPress={handleExportExcel} 
              style={[styles.exportBtn, { backgroundColor: '#1D6F42' }]} 
              disabled={exportingExcel}
              activeOpacity={0.7}
            >
              {exportingExcel ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="file-excel" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleExportPdf} 
              style={[styles.exportBtn, { backgroundColor: COLORS.modFinanceiro }]} 
              disabled={exporting}
              activeOpacity={0.7}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.overviewTopRow}>
          <View>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Saldo filtrado</Text>
            <Text style={[styles.overviewValue, { color: theme.textPrimary }]}>{formatCurrency(filteredTotals.saldo)}</Text>
            <Text style={[styles.overviewCaption, { color: theme.textSecondary }]}>{activeFiltersLabel}</Text>
          </View>
          <View
            style={[
              styles.overviewBadge,
              {
                backgroundColor: filteredTotals.saldo >= 0 ? theme.successBackground : theme.dangerBackground,
                borderColor: filteredTotals.saldo >= 0 ? COLORS.success : COLORS.danger,
              },
            ]}
          >
            <Text style={[styles.overviewBadgeText, { color: filteredTotals.saldo >= 0 ? COLORS.success : COLORS.danger }]}>
              {filteredTotals.saldo >= 0 ? 'Positivo' : 'Negativo'}
            </Text>
          </View>
        </View>

        <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Buscar por descrição ou responsável"
            placeholderTextColor={theme.textSecondary}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 ? (
            <TouchableOpacity onPress={() => setBusca('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.totalsGrid}>
          <View style={[styles.totalCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Entradas</Text>
            <Text style={[styles.totalValue, { color: COLORS.success }]}>{formatCurrency(filteredTotals.entradas)}</Text>
          </View>
          <View style={[styles.totalCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Saidas</Text>
            <Text style={[styles.totalValue, { color: COLORS.danger }]}>{formatCurrency(filteredTotals.saidas)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.filtersPanel, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: theme.textPrimary }]}>Filtros</Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={COLORS.modFinanceiro} />
            <Text style={styles.clearFiltersText}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Periodo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
            {periods.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setPeriod(item.id as CaixaPeriod)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: period === item.id ? COLORS.modFinanceiro : theme.border,
                    backgroundColor: period === item.id ? `${COLORS.modFinanceiro}18` : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: period === item.id ? COLORS.modFinanceiro : theme.textPrimary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {period === 'custom' ? (
          <View style={styles.customDateRow}>
            <TouchableOpacity style={[styles.dateInput, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} onPress={() => setShowPicker('from')}>
              <MaterialCommunityIcons name="calendar-import" size={16} color={COLORS.modFinanceiro} />
              <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateFrom.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateInput, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} onPress={() => setShowPicker('to')}>
              <MaterialCommunityIcons name="calendar-export" size={16} color={COLORS.modFinanceiro} />
              <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateTo.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Tipo</Text>
          <View style={styles.inlineWrap}>
            {tipos.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTipo(t.id as any)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: tipo === t.id ? COLORS.modFinanceiro : theme.border,
                    backgroundColor: tipo === t.id ? `${COLORS.modFinanceiro}18` : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: tipo === t.id ? COLORS.modFinanceiro : theme.textPrimary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {caixaPessoas.length > 0 ? (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Responsavel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
              {[{ id: undefined, nome: 'Todos' }, ...caixaPessoas].map((item) => (
                <TouchableOpacity
                  key={String(item.id)}
                  onPress={() => setSelectedPessoaId(item.id)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: selectedPessoaId === item.id ? COLORS.modFinanceiro : theme.border,
                      backgroundColor: selectedPessoaId === item.id ? `${COLORS.modFinanceiro}18` : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: selectedPessoaId === item.id ? COLORS.modFinanceiro : theme.textPrimary }]}>
                    {item.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBackground }}>
      <FlatList
        data={groupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading && items.length === 0} onRefresh={() => load(1)} tintColor={COLORS.modFinanceiro} />}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          if (item.isHeader) {
            return (
              <View style={styles.dateHeader}>
                <View style={[styles.dateLine, { backgroundColor: theme.divider }]} />
                <Text style={[styles.dateHeaderText, { color: theme.textSecondary, backgroundColor: theme.pageBackground }]}>
                  {item.date}
                </Text>
              </View>
            );
          }

          const isEntrada = item.tipo === 'entrada';
          return (
            <View style={[styles.itemCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={[styles.itemIconBox, { backgroundColor: isEntrada ? `${COLORS.success}18` : `${COLORS.danger}18` }]}>
                <MaterialCommunityIcons name={isEntrada ? 'arrow-down-left' : 'arrow-up-right'} size={20} color={isEntrada ? COLORS.success : COLORS.danger} />
              </View>

              <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                  <Text style={[styles.itemDesc, { color: theme.textPrimary }]} numberOfLines={2}>
                    {item.descricao}
                  </Text>
                  <Text style={[styles.itemValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                    {isEntrada ? '+' : '-'} {formatCurrency(item.valor)}
                  </Text>
                </View>

                <View style={styles.metaWrap}>
                  <View style={[styles.metaBadge, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.metaBadgeText, { color: theme.textSecondary }]}>{item.origem.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.tipo === 'entrada' ? 'Recebido por' : 'Pago para'}: {item.caixaPessoaNome}
                  </Text>
                </View>

                {item.metodoPagamento ? (
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    Meio de pagamento: {String(item.metodoPagamento).toUpperCase()}
                  </Text>
                ) : null}

                {item.observacoes ? (
                  <Text style={[styles.itemObs, { color: theme.textSecondary }]} numberOfLines={2}>
                    Observacao: {item.observacoes}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={60} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhum movimento encontrado</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Ajuste os filtros ou limpe a busca para ampliar o resultado.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity onPress={() => load(page + 1)} style={[styles.loadMoreBtn, { borderColor: theme.border }]} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={COLORS.modFinanceiro} /> : <Text style={[styles.loadMoreText, { color: theme.textPrimary }]}>Carregar mais</Text>}
            </TouchableOpacity>
          ) : null
        }
      />

      {showPicker ? (
        <DateTimePicker
          value={showPicker === 'from' ? dateFrom : dateTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  headerContainer: { padding: SPACING.lg, gap: 14, paddingBottom: 8 },

  financeLinksRow: { gap: 8, paddingBottom: SPACING.xs },
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
  financeLinkActive: { backgroundColor: `${COLORS.modFinanceiro}1A` },
  financeLinkText: { fontSize: 12, fontWeight: '800' },

  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: TYPOGRAPHY.h2, fontWeight: '900' },
  heroSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  overviewLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  overviewValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  overviewCaption: { fontSize: 12, fontWeight: '600', marginTop: 4, maxWidth: 220 },
  overviewBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overviewBadgeText: { fontSize: 11, fontWeight: '800' },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  totalsGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  totalCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  totalLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  totalValue: { fontSize: 18, fontWeight: '900' },

  filtersPanel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: '900' },
  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  filterScrollRow: { paddingRight: SPACING.lg },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    marginRight: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: '800' },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersText: { color: COLORS.modFinanceiro, fontSize: 12, fontWeight: '800' },
  inlineWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customDateRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dateInput: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateInputText: { fontSize: 13, fontWeight: '700' },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 24 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  dateLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  dateHeaderText: { paddingHorizontal: 12, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    ...SHADOWS.card,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1, gap: 6 },
  itemTopRow: { gap: 6 },
  itemDesc: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  itemValue: { fontSize: 16, fontWeight: '900' },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metaBadgeText: { fontSize: 10, fontWeight: '900' },
  metaText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  itemMeta: { fontSize: 11, fontWeight: '700' },
  itemObs: { fontSize: 11, fontStyle: 'italic', lineHeight: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  loadMoreBtn: {
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700' },
});

export default CaixaExtratoScreen;
