import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View, TextInput, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { RouteProp, useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const CaixaExtratoScreen = () => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, selectedTenantId, isOwner, isAdmin } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'CaixaExtrato'>>();
  const isFocused = useIsFocused();
  
  // Filtros
  const [period, setPeriod] = useState<CaixaPeriod>('month');
  const [tipo, setTipo] = useState<'todos' | CaixaTipoMov>('todos');
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | undefined>(route.params?.caixaPessoaId);
  const [busca, setBusca] = useState('');

  // Datas Customizadas
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);
  
  // Dados
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);

  const canView = Boolean(isOwner || isAdmin);
  const targetId = selectedTenantId || user?.uid;

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
          pageSize: 50 
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

  // Totais da visão filtrada (calculados sobre os itens carregados)
  const filteredTotals = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    items.forEach(item => {
      if (item.tipo === 'entrada') entradas += item.valor;
      else saidas += item.valor;
    });
    return { entradas, saidas, saldo: entradas - saidas };
  }, [items]);

  // Agrupamento por data para o render
  const groupedItems = useMemo(() => {
    const groups: any[] = [];
    let lastDate = '';
    
    items.forEach(item => {
      const dateStr = new Date(item.data).toLocaleDateString('pt-BR');
      if (dateStr !== lastDate) {
        groups.push({ isHeader: true, date: dateStr, id: `header-${dateStr}` });
        lastDate = dateStr;
      }
      groups.push(item);
    });
    
    return groups;
  }, [items]);

  // Carregar pessoas para filtro
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

  // Recarregar quando filtros mudam
  useEffect(() => {
    if (isFocused) void load(1);
  }, [isFocused, period, tipo, selectedPessoaId, busca, dateFrom, dateTo]);

  const periods = useMemo(() => [
    { id: 'today', label: 'Hoje' },
    { id: '7d', label: '7 Dias' },
    { id: 'month', label: 'Mês' },
    { id: 'all', label: 'Tudo' },
    { id: 'custom', label: 'Período' },
  ], []);

  const tipos = useMemo(() => [
    { id: 'todos', label: 'Todos' },
    { id: 'entrada', label: 'Entradas' },
    { id: 'saida', label: 'Saídas' },
  ], []);

  const selectedPessoaNome = useMemo(() => {
    if (!selectedPessoaId) return 'Todos responsaveis';
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
      let periodLabel = periods.find(p => p.id === period)?.label || period;
      if (period === 'custom') {
        periodLabel = `${dateFrom.toLocaleDateString('pt-BR')} até ${dateTo.toLocaleDateString('pt-BR')}`;
      }
      
      await gerarRelatorioCaixaPDF({
        tenantNome: user?.displayName || user?.email || 'Estufa',
        periodo: periodLabel,
        totalEntradas: filteredTotals.entradas,
        totalSaidas: filteredTotals.saidas,
        saldoFinal: filteredTotals.saldo,
        movimentos: items.map(m => ({
          data: new Date(m.data),
          descricao: m.descricao,
          pessoa: m.caixaPessoaNome,
          valor: m.valor,
          tipo: m.tipo,
          origem: m.origem,
          metodoPagamento: m.metodoPagamento,
          observacoes: m.observacoes
        }))
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    } finally {
      setExporting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(null);
    if (selectedDate) {
      if (showPicker === 'from') {
        setDateFrom(selectedDate);
      } else if (showPicker === 'to') {
        setDateTo(selectedDate);
      }
    }
  };

  if (!canView) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surfaceBackground }]}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={theme.textSecondary} />
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 10 }}>Acesso restrito</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Busca */}
      <View style={styles.topActions}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Buscar..."
            placeholderTextColor={theme.textSecondary}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          onPress={handleExportPdf}
          style={[styles.exportBtn, { backgroundColor: COLORS.modFinanceiro }]}
          disabled={exporting}
        >
          {exporting ? <ActivityIndicator size="small" color="#fff" /> : (
            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.filterSummary, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <Text style={[styles.filterSummaryText, { color: theme.textSecondary }]} numberOfLines={2}>
          {activeFiltersLabel}
        </Text>
        <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
          <MaterialCommunityIcons name="filter-remove-outline" size={16} color={COLORS.modFinanceiro} />
          <Text style={styles.clearFiltersText}>Limpar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo Filtrado */}
      <View style={[styles.totalsSummary, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>ENTRADAS</Text>
          <Text style={[styles.totalValue, { color: COLORS.success }]}>{formatCurrency(filteredTotals.entradas)}</Text>
        </View>
        <View style={[styles.totalDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>SAÍDAS</Text>
          <Text style={[styles.totalValue, { color: COLORS.danger }]}>{formatCurrency(filteredTotals.saidas)}</Text>
        </View>
        <View style={[styles.totalDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>SALDO</Text>
          <Text style={[styles.totalValue, { color: theme.textPrimary }]}>{formatCurrency(filteredTotals.saldo)}</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={periods}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setPeriod(item.id as CaixaPeriod)}
                style={[
                  styles.filterChip,
                  { 
                    borderColor: period === item.id ? COLORS.modFinanceiro : theme.border,
                    backgroundColor: period === item.id ? `${COLORS.modFinanceiro}22` : 'transparent'
                  }
                ]}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: period === item.id ? COLORS.modFinanceiro : theme.textPrimary }
                ]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {period === 'custom' && (
          <View style={styles.customDateRow}>
            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} 
              onPress={() => setShowPicker('from')}
            >
              <MaterialCommunityIcons name="calendar-import" size={16} color={COLORS.modFinanceiro} />
              <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateFrom.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            
            <View style={[styles.dateSeparator, { backgroundColor: theme.divider }]} />

            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]} 
              onPress={() => setShowPicker('to')}
            >
              <MaterialCommunityIcons name="calendar-export" size={16} color={COLORS.modFinanceiro} />
              <Text style={[styles.dateInputText, { color: theme.textPrimary }]}>{dateTo.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.filterSection}>
          <View style={styles.chipRow}>
            {tipos.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTipo(t.id as any)}
                style={[
                  styles.filterChip,
                  { 
                    borderColor: tipo === t.id ? COLORS.modFinanceiro : theme.border,
                    backgroundColor: tipo === t.id ? `${COLORS.modFinanceiro}22` : 'transparent'
                  }
                ]}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: tipo === t.id ? COLORS.modFinanceiro : theme.textPrimary }
                ]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {caixaPessoas.length > 0 && (
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: undefined, nome: 'Todos Responsáveis' }, ...caixaPessoas]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedPessoaId(item.id)}
                  style={[
                    styles.filterChip,
                    { 
                      borderColor: selectedPessoaId === item.id ? COLORS.modFinanceiro : theme.border,
                      backgroundColor: selectedPessoaId === item.id ? `${COLORS.modFinanceiro}22` : 'transparent'
                    }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: selectedPessoaId === item.id ? COLORS.modFinanceiro : theme.textPrimary }
                  ]}>{item.nome}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.surfaceBackground }}>
      <FlatList
        data={groupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading && items.length === 0} onRefresh={() => load(1)} tintColor={COLORS.modFinanceiro} />}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          if (item.isHeader) {
            return (
              <View style={styles.dateHeader}>
                <View style={[styles.dateLine, { backgroundColor: theme.divider }]} />
                <Text style={[styles.dateHeaderText, { color: theme.textSecondary, backgroundColor: theme.surfaceBackground }]}>
                  {item.date}
                </Text>
              </View>
            );
          }

          const isEntrada = item.tipo === 'entrada';
          return (
            <View style={[styles.itemCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
              <View style={[styles.iconBox, { backgroundColor: isEntrada ? `${COLORS.success}1A` : `${COLORS.danger}1A` }]}>
                <MaterialCommunityIcons 
                  name={isEntrada ? 'plus' : 'minus'} 
                  size={24} 
                  color={isEntrada ? COLORS.success : COLORS.danger} 
                />
              </View>
              
              <View style={styles.itemContent}>
                <View style={styles.itemHeaderRow}>
                   <Text style={[styles.itemPessoa, { color: theme.textSecondary }]}>
                    {item.tipo === 'entrada' ? 'Recebido por' : 'Pago para'}: {item.caixaPessoaNome}
                  </Text>
                   <View style={[styles.originBadge, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.originText, { color: theme.textSecondary }]}>{item.origem.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={[styles.itemDesc, { color: theme.textPrimary }]} numberOfLines={2}>{item.descricao}</Text>

                {item.metodoPagamento ? (
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    Meio de pagamento: {String(item.metodoPagamento).toUpperCase()}
                  </Text>
                ) : null}
                
                {item.observacoes ? (
                  <Text style={[styles.itemObs, { color: theme.textSecondary }]} numberOfLines={1}>
                    Nota: {item.observacoes}
                  </Text>
                ) : null}

                <View style={styles.itemFooter}>
                  <Text style={[styles.itemValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                    {isEntrada ? '+' : '-'} {formatCurrency(item.valor)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhum movimento encontrado</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              onPress={() => load(page + 1)}
              style={[styles.loadMoreBtn, { borderColor: theme.border }]}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color={COLORS.modFinanceiro} /> : (
                <Text style={[styles.loadMoreText, { color: theme.textPrimary }]}>Carregar mais</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  headerContainer: { padding: SPACING.lg, gap: 16, paddingBottom: 8 },
  topActions: { flexDirection: 'row', gap: 10 },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  exportBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  totalsSummary: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
  totalValue: { fontSize: 14, fontWeight: '900' },
  totalDivider: { width: 1, height: 24 },
  filtersContainer: { gap: 10 },
  filterSummary: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterSummaryText: { flex: 1, fontSize: 12, fontWeight: '700' },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersText: { color: COLORS.modFinanceiro, fontSize: 12, fontWeight: '800' },
  filterSection: { gap: 6 },
  chipRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    marginRight: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: '800' },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  dateInputText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateSeparator: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 24 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  dateLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  dateHeaderText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: { flex: 1, gap: 4 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPessoa: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  itemDesc: { fontSize: 14, fontWeight: '700' },
  itemMeta: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  itemObs: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  originBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  originText: { fontSize: 8, fontWeight: '900' },
  itemValue: { fontSize: 16, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
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
