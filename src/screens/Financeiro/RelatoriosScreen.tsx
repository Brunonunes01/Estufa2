import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import EmptyState from '../../components/ui/EmptyState';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import { listDespesasByMonth } from '../../services/despesaService';
import { listAllPlantios } from '../../services/plantioService';
import { exportFinancialOverviewExcel, shareFinancialOverviewPdf } from '../../services/receiptService';
import { listVendasByMonth } from '../../services/vendaService';
import { Despesa, Plantio, Venda } from '../../types/domain';

const generateYearList = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
};

const MONTHS = [
  { label: 'Janeiro', value: 1 },
  { label: 'Fevereiro', value: 2 },
  { label: 'Marco', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Maio', value: 5 },
  { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 },
  { label: 'Novembro', value: 11 },
  { label: 'Dezembro', value: 12 },
];

const YEARS = generateYearList();

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Relatorios'>;

const RelatoriosScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { user, selectedTenantId, availableTenants } = useAuth();
  const targetId = selectedTenantId || user?.uid;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [caixaPessoas, setCaixaPessoas] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getVendaQuantidade = (venda: Venda) => Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);
  const getVendaPrecoUnitario = (venda: Venda) => Number((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0);

  const plantiosMap = useMemo(
    () =>
      plantios.reduce<Record<string, Plantio>>((acc, plantio) => {
        if (plantio.id) acc[plantio.id] = plantio;
        return acc;
      }, {}),
    [plantios]
  );

  const caixaPessoasMap = useMemo(
    () =>
      caixaPessoas.reduce<Record<string, string>>((acc, pessoa) => {
        if (pessoa.id) acc[pessoa.id] = pessoa.nome;
        return acc;
      }, {}),
    [caixaPessoas]
  );

  const getVendaProduto = (venda: Venda) => {
    const culturaVenda = String((venda as any).cultura || '').trim();
    const culturaPlantio = String(plantiosMap[venda.plantioId || '']?.cultura || '').trim();
    const descricaoItem = String(venda.itens?.[0]?.descricao || '').trim();
    const descricaoNormalizada = descricaoItem.toLowerCase();
    const isDescricaoGenerica =
      !descricaoItem ||
      descricaoNormalizada === 'producao agricola' ||
      descricaoNormalizada === 'producao hidroponica';

    if (culturaVenda) return culturaVenda;
    if (culturaPlantio) return culturaPlantio;
    if (!isDescricaoGenerica) return descricaoItem;
    return 'Produto nao informado';
  };

  const getVendaOrigem = (venda: Venda) =>
    (venda as any).originType === 'hydro_lote' || (venda as any).hydroLoteId ? 'Hidroponia' : (venda as any).talhaoId ? 'Campo' : 'Estufa';
  const getVendaLocal = (venda: Venda) => String((venda as any).estufaNome || (venda as any).talhaoNome || 'Local nao informado');
  const getVendaLote = (venda: Venda) => String((venda as any).loteColheita || (venda as any).codigoLote || venda.plantioId || '-');

  useEffect(() => {
    const loadData = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const [vendasData, despesasData, plantiosData, caixaPessoasData] = await Promise.all([
          listVendasByMonth(targetId, selectedYear, selectedMonth),
          listDespesasByMonth(targetId, selectedYear, selectedMonth),
          listAllPlantios(targetId),
          listCaixaPessoas(targetId),
        ]);
        setVendas(vendasData);
        setDespesas(despesasData);
        setPlantios(plantiosData);
        setCaixaPessoas(caixaPessoasData);
      } catch (error) {
        console.error('Erro ao carregar relatorios', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [targetId, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    let totalCaixas = 0;
    const receitaTotal = vendas.reduce((acc, venda) => {
      const status = String(venda.statusPagamento || '').toLowerCase().trim();
      if (status === 'cancelado') return acc;
      
      const item = venda.itens?.[0];
      const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
      
      const unidade = String((venda as any).unidade || item?.unidade || '').toLowerCase().trim();
      if (unidade === 'caixas' || unidade === 'caixa' || unidade === 'cx') {
        totalCaixas += Number(venda.quantidade || item?.quantidade || 0);
      }

      return acc + Number(venda.valorTotal || fallbackTotal || 0);
    }, 0);

    const despesasFiltradas = despesas.filter((despesa) => despesa.tipoGasto !== 'investimento_inicial');
    const despesaTotal = despesasFiltradas.reduce((acc, despesa) => acc + Number(despesa.valor || 0), 0);
    const lucroLiquido = receitaTotal - despesaTotal;
    const margem = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

    const porCategoria: Record<string, number> = {};
    despesasFiltradas.forEach((despesa) => {
      const categoria = despesa.categoria || 'outros';
      porCategoria[categoria] = (porCategoria[categoria] || 0) + Number(despesa.valor || 0);
    });

    const categoriasArray = Object.entries(porCategoria)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    return { receitaTotal, despesaTotal, lucroLiquido, margem, categoriasArray, totalCaixas };
  }, [despesas, vendas]);

  const periodoLabel = useMemo(
    () => `${MONTHS.find((month) => month.value === selectedMonth)?.label || selectedMonth}/${selectedYear}`,
    [selectedMonth, selectedYear]
  );

  const empresa = useMemo(
    () => availableTenants.find((item) => item.uid === targetId)?.name || user?.name || 'Produtor',
    [availableTenants, targetId, user?.name]
  );

  const topVendas = useMemo(
    () =>
      [...vendas]
        .map((venda) => {
          const item = venda.itens?.[0];
          const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
          const dataRef = venda.dataVenda || (venda as any).dataColheita;
          const parsedDate =
            (dataRef as any)?.toDate?.() ||
            (typeof (dataRef as any)?.seconds === 'number' ? new Date((dataRef as any).seconds * 1000) : null) ||
            (dataRef ? new Date(dataRef as any) : null);

          return {
            codigo: venda.id,
            data: parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString('pt-BR') : '-',
            cliente: (venda as any).clienteNome || (venda as any).clienteId || 'Cliente',
            documentoCliente: (venda as any).clienteDocumento || '',
            ciclo: getVendaProduto(venda),
            origem: getVendaOrigem(venda),
            local: getVendaLocal(venda),
            lote: getVendaLote(venda),
            produto: getVendaProduto(venda),
            quantidade: `${getVendaQuantidade(venda)} ${String((venda as any).unidade || venda.itens?.[0]?.unidade || 'un')}`,
            quantidadeValor: getVendaQuantidade(venda),
            quantidadeUnidade: String((venda as any).unidade || venda.itens?.[0]?.unidade || 'un'),
            precoUnitario: getVendaPrecoUnitario(venda),
            valor: Number(venda.valorTotal || fallbackTotal || 0),
            status: String(venda.statusPagamento || (venda as any).status || 'PAGO').toUpperCase(),
            metodoPagamento: String((venda as any).metodoPagamento || (venda as any).formaPagamento || 'N/A').toUpperCase(),
            recebidoPor: String(
              (venda as any).pagamentoParaNome ||
                caixaPessoasMap[(venda as any).pagamentoPara || ''] ||
                (venda as any).pagamentoPara ||
                ''
            ),
            observacoes: String((venda as any).observacoes || ''),
          };
        })
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
    [vendas, plantiosMap, caixaPessoasMap]
  );

  const buildExportData = () => ({
    empresa,
    periodo: periodoLabel,
    receitaTotal: stats.receitaTotal,
    despesaTotal: stats.despesaTotal,
    lucroLiquido: stats.lucroLiquido,
    margem: stats.margem,
    totalVendas: vendas.length,
    totalDespesas: despesas.length,
    categorias: stats.categoriasArray.map((item) => ({
      categoria: item.nome,
      valor: item.valor,
      percentual: stats.despesaTotal > 0 ? (item.valor / stats.despesaTotal) * 100 : 0,
    })),
    topVendas,
  });

  const financialHighlights = useMemo(() => {
    const topVenda = topVendas[0] || null;
    const principalCategoria = stats.categoriasArray[0] || null;
    const resultadoLabel =
      stats.lucroLiquido > 0 ? 'Lucro no periodo' : stats.lucroLiquido < 0 ? 'Atencao ao prejuizo' : 'Periodo em equilibrio';

    return { topVenda, principalCategoria, resultadoLabel };
  }, [stats.categoriasArray, stats.lucroLiquido, topVendas]);

  const handleExportPdf = async () => {
    try {
      await shareFinancialOverviewPdf(buildExportData());
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar o PDF.');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportFinancialOverviewExcel(buildExportData());
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar o Excel.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    const semMovimento = stats.receitaTotal <= 0 && stats.despesaTotal <= 0;
    const maxReferencia = Math.max(stats.receitaTotal, stats.despesaTotal, 1);

    return (
      <>
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotTextWrap}>
              <Text style={styles.sectionEyebrow}>Resumo do periodo</Text>
              <Text style={styles.snapshotTitle}>{periodoLabel}</Text>
              <Text style={styles.snapshotSubtitle}>Leitura rapida para decidir qual relatorio gerar.</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{financialHighlights.resultadoLabel}</Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, styles.kpiCardPositive]}>
              <Text style={styles.kpiLabel}>Receitas</Text>
              <Text style={[styles.kpiValue, { color: COLORS.success }]}>{formatCurrency(stats.receitaTotal)}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardNegative]}>
              <Text style={styles.kpiLabel}>Despesas</Text>
              <Text style={[styles.kpiValue, { color: COLORS.danger }]}>{formatCurrency(stats.despesaTotal)}</Text>
            </View>
          </View>

          <View style={[styles.quickReadGrid, { marginTop: 12, marginBottom: 0 }]}>
            <View style={styles.quickReadCard}>
              <Text style={styles.quickReadLabel}>Volume de Saida</Text>
              <Text style={styles.quickReadValue}>{stats.totalCaixas.toFixed(1)} caixas</Text>
              <Text style={styles.quickReadMeta}>Considerando apenas unidades 'caixa', 'cx' ou 'caixas'.</Text>
            </View>
            <View style={styles.quickReadCard}>
              <Text style={styles.quickReadLabel}>Qtd. Vendas</Text>
              <Text style={styles.quickReadValue}>{vendas.length} registros</Text>
              <Text style={styles.quickReadMeta}>Total de notas/vendas emitidas no periodo.</Text>
            </View>
          </View>
        </View>

        <View style={styles.reportHubCard}>
          <View style={styles.reportHubHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Exportacao principal</Text>
              <Text style={styles.reportHubTitle}>Relatorio Financeiro Mensal</Text>
              <Text style={styles.reportHubSubtitle}>
                Gera PDF e Excel com receitas, despesas, vendas do mes e leitura gerencial consolidada.
              </Text>
            </View>
          </View>

          <View style={styles.explainRow}>
            <View style={styles.explainPill}>
              <Text style={styles.explainPillText}>Periodo: {periodoLabel}</Text>
            </View>
            <View style={styles.explainPill}>
              <Text style={styles.explainPillText}>{vendas.length} vendas</Text>
            </View>
            <View style={styles.explainPill}>
              <Text style={styles.explainPillText}>{despesas.length} despesas</Text>
            </View>
          </View>

          <View style={styles.exportRow}>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: COLORS.info }]} onPress={handleExportPdf}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
              <Text style={styles.exportButtonText}>Baixar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: COLORS.primary }]} onPress={handleExportExcel}>
              <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.textLight} />
              <Text style={styles.exportButtonText}>Baixar Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.lucroCard, { backgroundColor: stats.lucroLiquido >= 0 ? COLORS.infoSoft : `${COLORS.warning}20` }]}>
          <View>
            <Text style={styles.lucroLabel}>Resultado Liquido</Text>
            <Text style={[styles.lucroValue, { color: stats.lucroLiquido >= 0 ? COLORS.primary : COLORS.danger }]}>
              {formatCurrency(stats.lucroLiquido)}
            </Text>
          </View>
          <View style={styles.margemBadge}>
            <Text style={styles.margemText}>{stats.margem.toFixed(1)}% Margem</Text>
          </View>
        </View>

        <View style={styles.specializedSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Relatorios especializados</Text>
              <Text style={styles.sectionTitle}>Escolha por objetivo</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.reportNavCard} onPress={() => navigation.navigate('RelatorioOperacional')}>
            <View style={styles.reportNavIconWrap}>
              <MaterialCommunityIcons name="chart-line" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.reportNavContent}>
              <Text style={styles.reportNavTitle}>Analise de Ciclo de Producao</Text>
              <Text style={styles.reportNavDescription}>
                Use quando quiser avaliar um ciclo especifico com receita, custo, produtividade, lote e vendas.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportNavCard} onPress={() => navigation.navigate('EstufaPerformance')}>
            <View style={styles.reportNavIconWrap}>
              <MaterialCommunityIcons name="greenhouse" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.reportNavContent}>
              <Text style={styles.reportNavTitle}>Performance por Estufa</Text>
              <Text style={styles.reportNavDescription}>
                Visão consolidada de ROI e lucratividade acumulada por ambiente de cultivo.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportNavCard} onPress={() => navigation.navigate('CaixasPesoCiclo')}>
            <View style={styles.reportNavIconWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.reportNavContent}>
              <Text style={styles.reportNavTitle}>Caixas e Peso por Ciclo</Text>
              <Text style={styles.reportNavDescription}>
                Use para conferir caixas, peso livre, peso por caixa e total produzido por ciclo.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.quickReadGrid}>
          <View style={styles.quickReadCard}>
            <Text style={styles.quickReadLabel}>Maior venda</Text>
            <Text style={styles.quickReadValue}>
              {financialHighlights.topVenda ? formatCurrency(financialHighlights.topVenda.valor) : 'Sem vendas'}
            </Text>
            <Text style={styles.quickReadMeta}>
              {financialHighlights.topVenda
                ? `${financialHighlights.topVenda.cliente} | ${financialHighlights.topVenda.produto}`
                : 'Nenhuma venda registrada no periodo'}
            </Text>
          </View>

          <View style={styles.quickReadCard}>
            <Text style={styles.quickReadLabel}>Principal custo</Text>
            <Text style={styles.quickReadValue}>
              {financialHighlights.principalCategoria ? financialHighlights.principalCategoria.nome.toUpperCase() : 'Sem despesas'}
            </Text>
            <Text style={styles.quickReadMeta}>
              {financialHighlights.principalCategoria
                ? formatCurrency(financialHighlights.principalCategoria.valor)
                : 'Nenhuma despesa registrada no periodo'}
            </Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Receitas vs Despesas</Text>

          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Receitas</Text>
              <Text style={styles.barAmount}>{formatCurrency(stats.receitaTotal)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: COLORS.success, width: `${(stats.receitaTotal / maxReferencia) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Despesas</Text>
              <Text style={styles.barAmount}>{formatCurrency(stats.despesaTotal)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: COLORS.danger, width: `${(stats.despesaTotal / maxReferencia) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {semMovimento ? (
          <EmptyState
            icon="chart-box-outline"
            title="Sem movimentacao no periodo"
            description="Nao ha vendas nem despesas para o mes selecionado."
          />
        ) : null}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribuicao de Custos</Text>
          {stats.categoriasArray.length === 0 ? (
            <Text style={styles.emptyText}>Sem despesas no periodo.</Text>
          ) : (
            stats.categoriasArray.map((cat, index) => {
              const percent = stats.despesaTotal > 0 ? (cat.valor / stats.despesaTotal) * 100 : 0;
              return (
                <View key={index} style={styles.catRow}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{cat.nome.toUpperCase()}</Text>
                    <Text style={styles.catPercent}>{percent.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.catValue}>{formatCurrency(cat.valor)}</Text>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Central Financeira</Text>
        <Text style={styles.subtitle}>Organize o periodo, escolha o tipo de relatorio e exporte sem confusao.</Text>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterCardHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Passo 1</Text>
            <Text style={styles.filterTitle}>Defina o periodo do fechamento</Text>
            <Text style={styles.filterHelpText}>Todo o conteudo abaixo e os arquivos gerados usam este mes e este ano.</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedMonth} onValueChange={(itemValue) => setSelectedMonth(itemValue)} style={styles.picker}>
              {MONTHS.map((month) => (
                <Picker.Item key={month.value} label={month.label} value={month.value} />
              ))}
            </Picker>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedYear} onValueChange={(itemValue) => setSelectedYear(itemValue)} style={styles.picker}>
              {YEARS.map((year) => (
                <Picker.Item key={year} label={String(year)} value={year} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {renderContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },

  header: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeader: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },

  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  filterCardHeader: { marginBottom: SPACING.md },
  filterTitle: { fontSize: 17, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },
  filterHelpText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 19 },
  filterContainer: { flexDirection: 'row', gap: SPACING.md },
  pickerWrapper: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
    height: 50,
    justifyContent: 'center',
  },
  picker: { color: COLORS.textDark },

  snapshotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  snapshotTextWrap: { flex: 1 },
  snapshotTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },
  snapshotSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  statusBadge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', gap: SPACING.md },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
  },
  kpiCardPositive: { borderLeftColor: COLORS.success, borderLeftWidth: 4 },
  kpiCardNegative: { borderLeftColor: COLORS.danger, borderLeftWidth: 4 },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900' },

  reportHubCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  reportHubHeader: { marginBottom: SPACING.md },
  reportHubTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },
  reportHubSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 19 },
  explainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  explainPill: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  explainPillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  exportRow: { flexDirection: 'row', gap: SPACING.md },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  exportButtonText: { color: COLORS.textLight, fontSize: 13, fontWeight: '800' },

  lucroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  lucroLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  lucroValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  margemBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  margemText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 12 },

  specializedSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  reportNavCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  reportNavIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportNavContent: { flex: 1 },
  reportNavTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  reportNavDescription: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  quickReadGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  quickReadCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  quickReadLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 8 },
  quickReadValue: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  quickReadMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, lineHeight: 17 },

  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  chartTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: SPACING.lg },
  barContainer: { marginBottom: SPACING.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  barAmount: { fontSize: 13, fontWeight: '800', color: COLORS.textDark },
  barTrack: { height: 12, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.pill },

  catRow: { marginBottom: 15 },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  catPercent: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  catTrack: { height: 8, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.pill, overflow: 'hidden', marginBottom: 4 },
  catFill: { height: '100%', backgroundColor: COLORS.modDespesas, borderRadius: RADIUS.pill },
  catValue: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, textAlign: 'right' },
  emptyText: { fontSize: 13, color: COLORS.textPlaceholder, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});

export default RelatoriosScreen;
