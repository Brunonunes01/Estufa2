import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';

import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { listAllPlantios } from '../../services/plantioService';
import { listVendasByPlantio } from '../../services/vendaService';
import { getEstufaById } from '../../services/estufaService';
import { listTalhoes } from '../../services/talhaoService';
import {
  getSaleAgreedValue,
  getSaleReceivedValue,
} from '../../services/financialReportHelpers';
import { Plantio, Venda } from '../../types/domain';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  exportOperationalCycleExcel,
  shareOperationalCyclePdf,
} from '../../services/receiptService';
import { matchesPlantioProductionMode } from '../../services/financeProductionScope';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value?.seconds === 'number') {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getVendaQuantidade = (venda: Venda) =>
  Number((venda as any).quantidade || venda.itens?.[0]?.quantidade || 0);

const getVendaTotal = (venda: Venda) => {
  const item = venda.itens?.[0];
  const fallbackTotal =
    Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
  return Number(venda.valorTotal || fallbackTotal || 0);
};

const getVendaPrecoUnitario = (venda: Venda) =>
  Number((venda as any).precoUnitario || venda.itens?.[0]?.valorUnitario || 0);

const getVendaProduto = (venda: Venda, plantio?: Plantio | null) =>
  String(
    (venda as any).cultura ||
      plantio?.cultura ||
      venda.itens?.[0]?.descricao ||
      'Produto nao informado'
  ).trim();

const getVendaUnidade = (venda: Venda) =>
  String((venda as any).unidade || venda.itens?.[0]?.unidade || 'un');

const fetchCycleAnalysisData = async (plantio: Plantio, tenantId: string) => {
  const vendas = await listVendasByPlantio(tenantId, plantio.id);
  if (plantio.estufaId) {
    const estufa = await getEstufaById(plantio.estufaId, tenantId);
    if (!estufa) throw new Error('Estufa do ciclo não encontrada.');
    return { vendas, local: estufa, localTipo: 'Estufa' as const };
  }
  if (plantio.talhaoId) {
    const talhoes = await listTalhoes(tenantId);
    const talhao = talhoes.find((item) => item.id === plantio.talhaoId);
    if (!talhao) throw new Error('Talhão do ciclo não encontrado.');
    return { vendas, local: talhao, localTipo: 'Talhão' as const };
  }
  throw new Error('Este ciclo não possui estufa ou talhão vinculado.');
};

const RelatorioOperacionalScreen = () => {
  const { user, selectedTenantId, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const tenantId = selectedTenantId || user?.uid;

  const [selectedPlantioId, setSelectedPlantioId] = useState<string | null>(
    null
  );

  const { data: plantios, isLoading: isLoadingPlantios } = useQuery<Plantio[]>({
    queryKey: ['allPlantios', tenantId, settings.activeProductionMode],
    queryFn: async () => {
      const allPlantios = await listAllPlantios(tenantId!);
      return allPlantios.filter((plantio) =>
        matchesPlantioProductionMode(
          plantio,
          settings.activeProductionMode
        )
      );
    },
    enabled: !!tenantId,
  });

  const selectedPlantio = useMemo(() => {
    return plantios?.find((p) => p.id === selectedPlantioId) || null;
  }, [plantios, selectedPlantioId]);

  const { data: analysisData, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['cycleAnalysis', tenantId, selectedPlantioId],
    queryFn: () => fetchCycleAnalysisData(selectedPlantio!, tenantId!),
    enabled:
      !!selectedPlantio &&
      !!tenantId &&
      (!!selectedPlantio.estufaId || !!selectedPlantio.talhaoId),
  });

  const calculatedMetrics = useMemo(() => {
    if (!selectedPlantio || !analysisData || !analysisData.local) {
      return null;
    }

    const { vendas, local } = analysisData;
    const custoMuda = Number(selectedPlantio.custoEstimadoInicial || 0);
    const custoAcumulado = Math.max(
      0,
      Number(selectedPlantio.custoAcumulado || 0) - custoMuda
    );
    const localArea =
      Number((local as any).area || 0) ||
      Number((local as any).areaHectares || 0) * 10000 ||
      Number((local as any).areaCalculadaHectares || 0) * 10000;
    const unidadePredominante =
      vendas
        .map((v) => getVendaUnidade(v))
        .find((value) => String(value || '').trim()) || 'un';

    const vendasValidas = vendas.filter(
      (venda) =>
        String(venda.statusPagamento || '')
          .toLowerCase()
          .trim() !== 'cancelado'
    );
    const totalVolumeVendido = vendasValidas.reduce(
      (acc, venda) => acc + getVendaQuantidade(venda),
      0
    );
    const valorVendido = vendasValidas.reduce(
      (acc, venda) => acc + getSaleAgreedValue(venda),
      0
    );
    const receitaTotal = vendasValidas.reduce((acc, v) => {
      const status = String(v.statusPagamento || '')
        .toLowerCase()
        .trim();
      if (status !== 'pago') return acc;
      return acc + getSaleReceivedValue(v);
    }, 0);
    const valorReceber = vendasValidas.reduce((acc, venda) => {
      const status = String(venda.statusPagamento || '')
        .toLowerCase()
        .trim();
      return status === 'pendente' || status === 'atrasado'
        ? acc + getSaleAgreedValue(venda)
        : acc;
    }, 0);

    const custoPorUnidade =
      totalVolumeVendido > 0 ? custoAcumulado / totalVolumeVendido : 0;
    const produtividadeUnM2 =
      localArea > 0 ? totalVolumeVendido / localArea : 0;

    let cicloDias = 0;
    const inicioCiclo = toDate(
      selectedPlantio.dataPlantio || selectedPlantio.dataInicio
    );
    if (inicioCiclo) {
      const datasVenda = vendas
        .map((v) => toDate(v.dataVenda))
        .filter((d): d is Date => !!d);
      const fimCiclo =
        datasVenda.length > 0
          ? new Date(Math.max(...datasVenda.map((d) => d.getTime())))
          : new Date();
      cicloDias = Math.floor(
        (fimCiclo.getTime() - inicioCiclo.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const lucro = receitaTotal - custoAcumulado;
    const lucroProjetado = valorVendido - custoAcumulado;

    return {
      totalVolumeVendido,
      unidadePredominante,
      valorVendido,
      receitaTotal,
      valorReceber,
      custoPorUnidade,
      produtividadeUnM2,
      cicloDias,
      lucro,
      lucroProjetado,
      custoAcumulado,
    };
  }, [selectedPlantio, analysisData]);

  const empresa = useMemo(
    () =>
      availableTenants.find((item) => item.uid === tenantId)?.name ||
      user?.name ||
      'Produtor',
    [availableTenants, tenantId, user?.name]
  );

  const exportData = useMemo(() => {
    if (!selectedPlantio || !analysisData?.local || !calculatedMetrics)
      return null;

    const inicio = toDate(
      selectedPlantio.dataPlantio || selectedPlantio.dataInicio
    );
    const datasVenda = (analysisData.vendas || [])
      .filter(
        (venda) =>
          String(venda.statusPagamento || '')
            .toLowerCase()
            .trim() !== 'cancelado'
      )
      .map((venda) => toDate(venda.dataVenda))
      .filter((value): value is Date => !!value);
    const fim =
      datasVenda.length > 0
        ? new Date(Math.max(...datasVenda.map((item) => item.getTime())))
        : new Date();

    return {
      empresa,
      periodo: `${inicio ? inicio.toLocaleDateString('pt-BR') : '-'} a ${fim.toLocaleDateString('pt-BR')}`,
      ciclo: selectedPlantio.cultura || 'Ciclo sem nome',
      cicloDescricao: `${selectedPlantio.cultura || 'Ciclo sem nome'}${selectedPlantio.codigoLote ? ` • Lote ${selectedPlantio.codigoLote}` : ''}`,
      lote: selectedPlantio.codigoLote || 'Sem lote',
      estufa: analysisData.local.nome || analysisData.localTipo,
      localTipo: analysisData.localTipo,
      status: selectedPlantio.status,
      inicio: inicio ? inicio.toLocaleDateString('pt-BR') : '-',
      fim: fim.toLocaleDateString('pt-BR'),
      totalVolumeVendido: calculatedMetrics.totalVolumeVendido,
      unidadeVolume: calculatedMetrics.unidadePredominante,
      receitaTotal: calculatedMetrics.receitaTotal,
      valorVendido: calculatedMetrics.valorVendido,
      valorReceber: calculatedMetrics.valorReceber,
      custoAcumulado: calculatedMetrics.custoAcumulado,
      custoPorUnidade: calculatedMetrics.custoPorUnidade,
      produtividadeUnM2: calculatedMetrics.produtividadeUnM2,
      cicloDias: calculatedMetrics.cicloDias,
      lucro: calculatedMetrics.lucro,
      lucroProjetado: calculatedMetrics.lucroProjetado,
      vendas: (analysisData.vendas || []).map((venda) => ({
        codigo: String(venda.id || '-'),
        data: toDate(venda.dataVenda)?.toLocaleDateString('pt-BR') || '-',
        cliente: String(
          (venda as any).clienteNome || venda.clienteId || 'Cliente avulso'
        ),
        documentoCliente: String((venda as any).clienteDocumento || ''),
        origem: (venda as any).talhaoId ? 'Campo' : 'Estufa',
        estufa: analysisData.local.nome || analysisData.localTipo,
        lote: String(
          (venda as any).loteColheita || selectedPlantio.codigoLote || '-'
        ),
        produto: getVendaProduto(venda, selectedPlantio),
        quantidade: `${getVendaQuantidade(venda)} ${getVendaUnidade(venda)}`,
        quantidadeValor: getVendaQuantidade(venda),
        quantidadeUnidade: getVendaUnidade(venda),
        precoUnitario: getVendaPrecoUnitario(venda),
        valorTotal: getVendaTotal(venda),
        valorRecebido:
          String(venda.statusPagamento || '').toLowerCase() === 'pago'
            ? getSaleReceivedValue(venda)
            : undefined,
        metodoPagamento: String(
          (venda as any).metodoPagamento ||
            (venda as any).formaPagamento ||
            'N/A'
        ).toUpperCase(),
        status: String(venda.statusPagamento || 'PAGO').toUpperCase(),
        recebidoPor: String((venda as any).pagamentoParaNome || ''),
        observacoes: String(venda.observacoes || ''),
      })),
    };
  }, [analysisData, calculatedMetrics, empresa, selectedPlantio]);

  const handleExportPdf = async () => {
    if (!exportData) {
      Alert.alert('Atencao', 'Selecione um ciclo para exportar o relatorio.');
      return;
    }
    try {
      await shareOperationalCyclePdf(exportData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel exportar o PDF.');
    }
  };

  const handleExportExcel = async () => {
    if (!exportData) {
      Alert.alert('Atencao', 'Selecione um ciclo para exportar o relatorio.');
      return;
    }
    try {
      await exportOperationalCycleExcel(exportData);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Nao foi possivel exportar o Excel.'
      );
    }
  };

  const renderPicker = () => (
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedPlantioId}
        onValueChange={(itemValue) => setSelectedPlantioId(itemValue)}
        style={styles.picker}
        prompt="Selecione um Ciclo de Produção"
      >
        <Picker.Item label="-- Selecione um Ciclo --" value={null} />
        {plantios
          ?.filter((p) => p.estufaId || p.talhaoId)
          .map((p) => (
            <Picker.Item
              key={p.id}
              label={`${p.cultura} (${p.codigoLote || 'sem lote'}) - ${p.status}`}
              value={p.id}
            />
          ))}
      </Picker>
    </View>
  );

  const MetricCard = ({
    icon,
    label,
    value,
    unit,
    color = COLORS.primary,
  }: any) => (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons
        name={icon}
        size={32}
        color={color}
        style={styles.metricIcon}
      />
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {value} <Text style={styles.metricUnit}>{unit}</Text>
        </Text>
      </View>
    </View>
  );

  const renderAnalysis = () => {
    if (isLoadingAnalysis) {
      return (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 40 }}
        />
      );
    }
    if (!calculatedMetrics) {
      return (
        <Text style={styles.emptyText}>
          Selecione um ciclo para ver a análise.
        </Text>
      );
    }

    const {
      totalVolumeVendido,
      valorVendido,
      receitaTotal,
      valorReceber,
      custoPorUnidade,
      produtividadeUnM2,
      cicloDias,
      lucro,
      lucroProjetado,
      custoAcumulado,
    } = calculatedMetrics;

    const formatCurrency = (value: number) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
      <View>
        <View style={styles.cardsRow}>
          <MetricCard
            icon="tag-outline"
            label="Vendido / combinado"
            value={formatCurrency(valorVendido)}
            unit=""
            color={COLORS.info}
          />
          <MetricCard
            icon="cash-check"
            label="Recebido de verdade"
            value={formatCurrency(receitaTotal)}
            unit=""
            color={COLORS.success}
          />
        </View>
        <View style={styles.cardsRow}>
          <MetricCard
            icon="cash-clock"
            label="A receber"
            value={formatCurrency(valorReceber)}
            unit=""
            color={COLORS.warning}
          />
          <MetricCard
            icon="cash-minus"
            label="Custo Total"
            value={formatCurrency(custoAcumulado)}
            unit=""
            color={COLORS.danger}
          />
        </View>
        <View
          style={[
            styles.lucroCard,
            {
              backgroundColor:
                lucro >= 0 ? COLORS.successSoft : COLORS.dangerSoft,
            },
          ]}
        >
          <Text style={styles.lucroLabel}>Resultado sobre o recebido</Text>
          <Text
            style={[
              styles.lucroValue,
              { color: lucro >= 0 ? COLORS.success : COLORS.danger },
            ]}
          >
            {lucro >= 0 ? 'Lucro de' : 'Prejuízo de'}{' '}
            {formatCurrency(Math.abs(lucro))}
          </Text>
          <Text style={styles.lucroProjection}>
            Resultado projetado: {formatCurrency(lucroProjetado)}
          </Text>
        </View>

        <View style={styles.cardsRow}>
          <MetricCard
            icon="package-variant"
            label="Volume Vendido"
            value={totalVolumeVendido.toFixed(2)}
            unit="unid"
          />
          <MetricCard
            icon="cash-100"
            label="Custo Medio"
            value={formatCurrency(custoPorUnidade)}
            unit="/ unid"
          />
        </View>
        <View style={styles.cardsRow}>
          <MetricCard
            icon="layers-outline"
            label="Produtividade"
            value={produtividadeUnM2.toFixed(2)}
            unit="unid/m²"
          />
          <MetricCard
            icon="calendar-clock"
            label="Duração do Ciclo"
            value={cicloDias}
            unit="dias"
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Análise de Ciclo</Text>
        <Text style={styles.subtitle}>
          Selecione um ciclo de produção para ver suas métricas de performance.
        </Text>
      </View>
      {isLoadingPlantios ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        renderPicker()
      )}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.info }]}
          onPress={handleExportPdf}
        >
          <MaterialCommunityIcons
            name="file-pdf-box"
            size={18}
            color={COLORS.textLight}
          />
          <Text style={styles.actionButtonText}>Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={handleExportExcel}
        >
          <MaterialCommunityIcons
            name="microsoft-excel"
            size={18}
            color={COLORS.textLight}
          />
          <Text style={styles.actionButtonText}>Excel (.xlsx)</Text>
        </TouchableOpacity>
      </View>
      {renderAnalysis()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: { marginBottom: SPACING.lg },
  title: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  pickerWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
    height: 50,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  picker: { color: COLORS.textDark },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  actionButtonText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
    fontStyle: 'italic',
  },
  cardsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
  },
  metricIcon: { marginRight: SPACING.md },
  metricLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  metricValue: { fontSize: 20, fontWeight: 'bold' },
  metricUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.textSecondary,
  },
  lucroCard: {
    backgroundColor: COLORS.infoSoft,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  lucroLabel: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  lucroValue: { fontSize: 22, fontWeight: 'bold' },
  lucroProjection: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
});

export default RelatorioOperacionalScreen;
