import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '../../components/ui/EmptyState';
import MetricCard from '../../components/ui/MetricCard';
import ScreenHeaderCard from '../../components/ui/ScreenHeaderCard';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { RootStackParamList } from '../../navigation/types';
import { listCaixaPessoas } from '../../services/caixaPessoaService';
import { listDespesasByMonth } from '../../services/despesaService';
import { listAllPlantios } from '../../services/plantioService';
import { exportFinancialOverviewExcel, shareFinancialOverviewPdf } from '../../services/receiptService';
import { resolveServiceErrorMessage } from '../../services/securityUiHelpers';
import { listVendasByMonth } from '../../services/vendaService';
import { Despesa, Plantio, Venda } from '../../types/domain';

const generateYearList = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i -= 1) {
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
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [caixaPessoas, setCaixaPessoas] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getVendaQuantidade = (venda: Venda) =>
    Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);
  const getVendaPrecoUnitario = (venda: Venda) =>
    Number((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0);

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
    (venda as any).originType === 'hydro_lote' || (venda as any).hydroLoteId
      ? 'Hidroponia'
      : (venda as any).talhaoId
        ? 'Campo'
        : 'Estufa';

  const getVendaLocal = (venda: Venda) =>
    String((venda as any).estufaNome || (venda as any).talhaoNome || 'Local nao informado');

  const getVendaLote = (venda: Venda) =>
    String((venda as any).loteColheita || (venda as any).codigoLote || venda.plantioId || '-');

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

    void loadData();
  }, [targetId, selectedMonth, selectedYear]);

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
            data:
              parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
                ? parsedDate.toLocaleDateString('pt-BR')
                : '-',
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
    [caixaPessoasMap, plantiosMap, vendas]
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
      stats.lucroLiquido > 0
        ? 'Lucro no periodo'
        : stats.lucroLiquido < 0
          ? 'Atencao ao prejuizo'
          : 'Periodo em equilibrio';

    return { topVenda, principalCategoria, resultadoLabel };
  }, [stats.categoriasArray, stats.lucroLiquido, topVendas]);

  const handleExportPdf = async () => {
    try {
      await shareFinancialOverviewPdf(buildExportData());
    } catch (error: unknown) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'Nao foi possivel exportar o PDF.'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportFinancialOverviewExcel(buildExportData());
    } catch (error: unknown) {
      Alert.alert('Erro', resolveServiceErrorMessage(error, 'Nao foi possivel exportar o Excel.'));
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.info} />
        </View>
      );
    }

    const semMovimento = stats.receitaTotal <= 0 && stats.despesaTotal <= 0;
    const maxReferencia = Math.max(stats.receitaTotal, stats.despesaTotal, 1);

    return (
      <>
        <View style={[styles.snapshotCard, { backgroundColor: theme.surfaceBackground }]}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotTextWrap}>
              <Text style={styles.sectionEyebrow}>Resumo do periodo</Text>
              <Text style={[styles.snapshotTitle, { color: theme.textPrimary }]}>{periodoLabel}</Text>
              <Text style={[styles.snapshotSubtitle, { color: theme.textSecondary }]}>
                Leitura rapida para decidir qual relatorio gerar.
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: stats.lucroLiquido >= 0 ? theme.successSoft : theme.warningSoft }]}>
              <Text style={[styles.statusBadgeText, { color: stats.lucroLiquido >= 0 ? theme.success : theme.warning }]}>
                {financialHighlights.resultadoLabel}
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard label="Receitas" value={formatCurrency(stats.receitaTotal)} icon="arrow-top-right" tone="success" />
            <MetricCard label="Despesas" value={formatCurrency(stats.despesaTotal)} icon="arrow-bottom-right" tone="danger" />
            <MetricCard
              label="Lucro Liquido"
              value={formatCurrency(stats.lucroLiquido)}
              icon={stats.lucroLiquido >= 0 ? 'trending-up' : 'alert-circle-outline'}
              tone={stats.lucroLiquido >= 0 ? 'info' : 'warning'}
            />
            <MetricCard label="Margem" value={`${stats.margem.toFixed(1)}%`} icon="percent-outline" tone="neutral" />
          </View>

          <View style={[styles.quickReadGrid, { marginTop: 12, marginBottom: 0 }]}>
            <View style={[styles.quickReadCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.quickReadLabel, { color: theme.textSecondary }]}>Volume de Saida</Text>
              <Text style={[styles.quickReadValue, { color: theme.textPrimary }]}>{stats.totalCaixas.toFixed(1)} caixas</Text>
              <Text style={[styles.quickReadMeta, { color: theme.textSecondary }]}>
                Considerando apenas unidades "caixa", "cx" ou "caixas".
              </Text>
            </View>
            <View style={[styles.quickReadCard, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.quickReadLabel, { color: theme.textSecondary }]}>Qtd. Vendas</Text>
              <Text style={[styles.quickReadValue, { color: theme.textPrimary }]}>{vendas.length} registros</Text>
              <Text style={[styles.quickReadMeta, { color: theme.textSecondary }]}>
                Total de notas e vendas emitidas no periodo.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.reportHubCard, { backgroundColor: theme.surfaceBackground }]}>
          <View style={styles.reportHubHeader}>
            <View style={styles.reportHubTextWrap}>
              <Text style={styles.sectionEyebrow}>Exportacao principal</Text>
              <Text style={[styles.reportHubTitle, { color: theme.textPrimary }]}>Relatorio Financeiro Mensal</Text>
              <Text style={[styles.reportHubSubtitle, { color: theme.textSecondary }]}>
                Gera PDF e Excel com receitas, despesas, vendas do mes e leitura gerencial consolidada.
              </Text>
            </View>
            <View style={[styles.reportHubBadge, { backgroundColor: theme.successSoft }]}>
              <MaterialCommunityIcons name="file-chart-outline" size={18} color={theme.success} />
            </View>
          </View>

          <View style={styles.explainRow}>
            <View style={[styles.explainPill, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.explainPillText, { color: theme.textSecondary }]}>Periodo: {periodoLabel}</Text>
            </View>
            <View style={[styles.explainPill, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.explainPillText, { color: theme.textSecondary }]}>{vendas.length} vendas</Text>
            </View>
            <View style={[styles.explainPill, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.explainPillText, { color: theme.textSecondary }]}>{despesas.length} despesas</Text>
            </View>
          </View>

          <View style={styles.exportRow}>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.info }]} onPress={handleExportPdf}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.textLight} />
              <Text style={styles.exportButtonText}>Baixar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.success }]} onPress={handleExportExcel}>
              <MaterialCommunityIcons name="microsoft-excel" size={18} color={COLORS.textLight} />
              <Text style={styles.exportButtonText}>Baixar Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.lucroCard, { backgroundColor: stats.lucroLiquido >= 0 ? theme.infoSoft : theme.warningSoft }]}>
          <View>
            <Text style={[styles.lucroLabel, { color: theme.textSecondary }]}>Resultado Liquido</Text>
            <Text style={[styles.lucroValue, { color: stats.lucroLiquido >= 0 ? theme.success : theme.danger }]}>
              {formatCurrency(stats.lucroLiquido)}
            </Text>
          </View>
          <View style={[styles.margemBadge, { backgroundColor: stats.margem >= 0 ? theme.success : theme.danger }]}>
            <Text style={styles.margemText}>{stats.margem.toFixed(1)}% Margem</Text>
          </View>
        </View>

        <View style={[styles.specializedSection, { backgroundColor: theme.surfaceBackground }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Relatorios especializados</Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Escolha por objetivo</Text>
            </View>
          </View>

          {[
            {
              title: 'Analise de Ciclo de Producao',
              description: 'Use quando quiser avaliar um ciclo especifico com receita, custo, produtividade, lote e vendas.',
              icon: 'chart-line',
              color: theme.info,
              soft: theme.infoSoft,
              onPress: () => navigation.navigate('RelatorioOperacional'),
            },
            {
              title: 'Performance por Estufa',
              description: 'Visao consolidada de ROI e lucratividade acumulada por ambiente de cultivo.',
              icon: 'greenhouse',
              color: theme.success,
              soft: theme.successSoft,
              onPress: () => navigation.navigate('EstufaPerformance'),
            },
            {
              title: 'Caixas e Peso por Ciclo',
              description: 'Use para conferir caixas, peso livre, peso por caixa e total produzido por ciclo.',
              icon: 'package-variant-closed',
              color: theme.warning,
              soft: theme.warningSoft,
              onPress: () => navigation.navigate('CaixasPesoCiclo'),
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.reportNavCard, { borderColor: theme.border, backgroundColor: theme.pageBackground }]}
              onPress={item.onPress}
            >
              <View style={[styles.reportNavIconWrap, { backgroundColor: item.soft }]}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.reportNavContent}>
                <Text style={[styles.reportNavTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.reportNavDescription, { color: theme.textSecondary }]}>{item.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickReadGrid}>
          <View style={[styles.quickReadCard, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.quickReadLabel, { color: theme.textSecondary }]}>Maior venda</Text>
            <Text style={[styles.quickReadValue, { color: theme.textPrimary }]}>
              {financialHighlights.topVenda ? formatCurrency(financialHighlights.topVenda.valor) : 'Sem vendas'}
            </Text>
            <Text style={[styles.quickReadMeta, { color: theme.textSecondary }]}>
              {financialHighlights.topVenda
                ? `${financialHighlights.topVenda.cliente} | ${financialHighlights.topVenda.produto}`
                : 'Nenhuma venda registrada no periodo'}
            </Text>
          </View>

          <View style={[styles.quickReadCard, { backgroundColor: theme.surfaceBackground }]}>
            <Text style={[styles.quickReadLabel, { color: theme.textSecondary }]}>Principal custo</Text>
            <Text style={[styles.quickReadValue, { color: theme.textPrimary }]}>
              {financialHighlights.principalCategoria ? financialHighlights.principalCategoria.nome.toUpperCase() : 'Sem despesas'}
            </Text>
            <Text style={[styles.quickReadMeta, { color: theme.textSecondary }]}>
              {financialHighlights.principalCategoria
                ? formatCurrency(financialHighlights.principalCategoria.valor)
                : 'Nenhuma despesa registrada no periodo'}
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: theme.surfaceBackground }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Receitas vs Despesas</Text>

          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Receitas</Text>
              <Text style={[styles.barAmount, { color: theme.textPrimary }]}>{formatCurrency(stats.receitaTotal)}</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: theme.surfaceMuted }]}>
              <View style={[styles.barFill, { backgroundColor: theme.success, width: `${(stats.receitaTotal / maxReferencia) * 100}%` }]} />
            </View>
          </View>

          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Despesas</Text>
              <Text style={[styles.barAmount, { color: theme.textPrimary }]}>{formatCurrency(stats.despesaTotal)}</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: theme.surfaceMuted }]}>
              <View style={[styles.barFill, { backgroundColor: theme.danger, width: `${(stats.despesaTotal / maxReferencia) * 100}%` }]} />
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

        <View style={[styles.chartCard, { backgroundColor: theme.surfaceBackground }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Distribuicao de Custos</Text>
          {stats.categoriasArray.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sem despesas no periodo.</Text>
          ) : (
            stats.categoriasArray.map((cat, index) => {
              const percent = stats.despesaTotal > 0 ? (cat.valor / stats.despesaTotal) * 100 : 0;
              return (
                <View key={`${cat.nome}-${index}`} style={styles.catRow}>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catName, { color: theme.textSecondary }]}>{cat.nome.toUpperCase()}</Text>
                    <Text style={[styles.catPercent, { color: theme.info }]}>{percent.toFixed(1)}%</Text>
                  </View>
                  <View style={[styles.catTrack, { backgroundColor: theme.surfaceMuted }]}>
                    <View style={[styles.catFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={[styles.catValue, { color: theme.textPrimary }]}>{formatCurrency(cat.valor)}</Text>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.pageBackground }]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 44 }]}>
      <ScreenHeaderCard
        title="Central Financeira"
        subtitle="Fechamento do periodo, leitura gerencial e exportacao rapida dos relatorios mais usados."
        badgeLabel="Financeiro"
      >
        <View style={styles.headerStats}>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{periodoLabel}</Text>
            <Text style={styles.headerStatLabel}>Periodo ativo</Text>
          </View>
          <View style={styles.headerStatChip}>
            <Text style={styles.headerStatValue}>{vendas.length}</Text>
            <Text style={styles.headerStatLabel}>Vendas no recorte</Text>
          </View>
        </View>
      </ScreenHeaderCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financeLinksRow}>
        {[
          { label: 'Vendas', icon: 'cash-multiple', screen: 'VendasList' as const },
          { label: 'Contas', icon: 'cash-clock', screen: 'ContasReceber' as const },
          { label: 'Despesas', icon: 'cash-minus', screen: 'DespesasList' as const },
          { label: 'Relatorios', icon: 'chart-box', active: true },
        ].map((link) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.financeLink,
              {
                borderColor: link.active ? theme.info : theme.border,
                backgroundColor: link.active ? theme.infoSoft : theme.surfaceBackground,
              },
            ]}
            onPress={() => {
              if (!link.active && link.screen) {
                navigation.navigate(link.screen);
              }
            }}
          >
            <MaterialCommunityIcons name={link.icon as any} size={16} color={link.active ? theme.info : theme.textSecondary} />
            <Text style={[styles.financeLinkText, { color: link.active ? theme.info : theme.textSecondary }]}>
              {link.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.filterCard, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
        <View style={styles.filterCardHeader}>
          <View style={styles.filterTextWrap}>
            <Text style={styles.sectionEyebrow}>Passo 1</Text>
            <Text style={[styles.filterTitle, { color: theme.textPrimary }]}>Defina o periodo do fechamento</Text>
            <Text style={[styles.filterHelpText, { color: theme.textSecondary }]}>
              Todo o conteudo abaixo e os arquivos gerados usam este mes e este ano.
            </Text>
          </View>
          <View style={[styles.periodPreview, { backgroundColor: theme.infoSoft }]}>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.info} />
            <Text style={[styles.periodPreviewText, { color: theme.info }]}>{periodoLabel}</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <View style={[styles.pickerWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <Picker selectedValue={selectedMonth} onValueChange={(itemValue) => setSelectedMonth(itemValue)} style={styles.picker}>
              {MONTHS.map((month) => (
                <Picker.Item key={month.value} label={month.label} value={month.value} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
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
  content: { paddingHorizontal: SPACING.xl, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 360 },
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
  headerStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
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
    minWidth: 104,
  },
  financeLinkText: { fontSize: 13, fontWeight: '800' },
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
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  filterCardHeader: {
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  filterTextWrap: { flex: 1 },
  filterTitle: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  filterHelpText: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  filterContainer: { flexDirection: 'row', gap: SPACING.md },
  pickerWrapper: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: { color: COLORS.textDark },
  periodPreview: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodPreviewText: { fontSize: 12, fontWeight: '800' },
  snapshotCard: {
    borderRadius: RADIUS.xl,
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
  snapshotTitle: { fontSize: 22, fontWeight: '900', marginTop: 4, letterSpacing: -0.6 },
  snapshotSubtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  statusBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  reportHubCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  reportHubHeader: {
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  reportHubTextWrap: { flex: 1 },
  reportHubTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  reportHubSubtitle: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  reportHubBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  explainPill: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  explainPillText: { fontSize: 12, fontWeight: '700' },
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
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  lucroLabel: { fontSize: 13, fontWeight: '800' },
  lucroValue: { fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: -0.6 },
  margemBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  margemText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 12 },
  specializedSection: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  reportNavCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  reportNavIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportNavContent: { flex: 1 },
  reportNavTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  reportNavDescription: { fontSize: 13, lineHeight: 18 },
  quickReadGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  quickReadCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  quickReadLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  quickReadValue: { fontSize: 18, fontWeight: '900' },
  quickReadMeta: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  chartCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: SPACING.lg },
  barContainer: { marginBottom: SPACING.md },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 13, fontWeight: '700' },
  barAmount: { fontSize: 13, fontWeight: '800' },
  barTrack: { height: 12, borderRadius: RADIUS.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.pill },
  catRow: { marginBottom: 15 },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 11, fontWeight: '700' },
  catPercent: { fontSize: 11, fontWeight: 'bold' },
  catTrack: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden', marginBottom: 4 },
  catFill: { height: '100%', backgroundColor: COLORS.modDespesas, borderRadius: RADIUS.pill },
  catValue: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});

export default RelatoriosScreen;
