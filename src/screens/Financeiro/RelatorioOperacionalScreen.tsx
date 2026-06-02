import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';

import { useAuth } from '../../hooks/useAuth';
import { listAllPlantios } from '../../services/plantioService';
import { listVendasByPlantio } from '../../services/vendaService';
import { getEstufaById } from '../../services/estufaService';
import { Plantio, Venda, Estufa } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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
  const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
  return Number(venda.valorTotal || fallbackTotal || 0);
};

const fetchCycleAnalysisData = async (plantio: Plantio, tenantId: string) => {
  if (!plantio.estufaId) {
    throw new Error('Este plantio não está associado a uma estufa.');
  }
  const [vendas, estufa] = await Promise.all([
    listVendasByPlantio(tenantId, plantio.id),
    getEstufaById(plantio.estufaId, tenantId),
  ]);
  return { vendas, estufa };
};

const RelatorioOperacionalScreen = () => {
  const { user, selectedTenantId } = useAuth();
  const tenantId = selectedTenantId || user?.uid;

  const [selectedPlantioId, setSelectedPlantioId] = useState<string | null>(null);

  const { data: plantios, isLoading: isLoadingPlantios } = useQuery<Plantio[]>({
    queryKey: ['allPlantios', tenantId],
    queryFn: () => listAllPlantios(tenantId!),
    enabled: !!tenantId,
  });

  const selectedPlantio = useMemo(() => {
    return plantios?.find(p => p.id === selectedPlantioId) || null;
  }, [plantios, selectedPlantioId]);

  const { data: analysisData, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['cycleAnalysis', selectedPlantioId],
    queryFn: () => fetchCycleAnalysisData(selectedPlantio!, tenantId!),
    enabled: !!selectedPlantio && !!tenantId && !!selectedPlantio.estufaId,
  });

  const calculatedMetrics = useMemo(() => {
    if (!selectedPlantio || !analysisData || !analysisData.estufa) {
      return null;
    }

    const { vendas, estufa } = analysisData;
    const custoMuda = Number(selectedPlantio.custoEstimadoInicial || 0);
    const custoAcumulado = Math.max(0, Number(selectedPlantio.custoAcumulado || 0) - custoMuda);
    const estufaArea = estufa.area || 0;

    const totalVolumeVendido = vendas.reduce((acc, v) => acc + getVendaQuantidade(v), 0);
    const receitaTotal = vendas.reduce((acc, v) => {
      const status = String(v.statusPagamento || '').toLowerCase().trim();
      if (status === 'cancelado') return acc;
      return acc + getVendaTotal(v);
    }, 0);
    
    const custoPorUnidade = totalVolumeVendido > 0 ? custoAcumulado / totalVolumeVendido : 0;
    const produtividadeUnM2 = estufaArea > 0 ? totalVolumeVendido / estufaArea : 0;
    
    let cicloDias = 0;
    const inicioCiclo = toDate(selectedPlantio.dataPlantio || selectedPlantio.dataInicio);
    if (inicioCiclo) {
      const datasVenda = vendas
        .map((v) => toDate(v.dataVenda))
        .filter((d): d is Date => !!d);
      const fimCiclo = datasVenda.length > 0 ? new Date(Math.max(...datasVenda.map((d) => d.getTime()))) : new Date();
      cicloDias = Math.floor((fimCiclo.getTime() - inicioCiclo.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const lucro = receitaTotal - custoAcumulado;

    return { totalVolumeVendido, receitaTotal, custoPorUnidade, produtividadeUnM2, cicloDias, lucro, custoAcumulado };
  }, [selectedPlantio, analysisData]);

  const renderPicker = () => (
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedPlantioId}
        onValueChange={(itemValue) => setSelectedPlantioId(itemValue)}
        style={styles.picker}
        prompt="Selecione um Ciclo de Produção"
      >
        <Picker.Item label="-- Selecione um Ciclo --" value={null} />
        {plantios?.map(p => (
          <Picker.Item 
            key={p.id} 
            label={`${p.cultura} (${p.codigoLote || 'sem lote'}) - ${p.status}`} 
            value={p.id} 
          />
        ))}
      </Picker>
    </View>
  );

  const MetricCard = ({ icon, label, value, unit, color = COLORS.primary }: any) => (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={32} color={color} style={styles.metricIcon} />
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value} <Text style={styles.metricUnit}>{unit}</Text></Text>
      </View>
    </View>
  );

  const renderAnalysis = () => {
    if (isLoadingAnalysis) {
      return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }}/>;
    }
    if (!calculatedMetrics) {
      return <Text style={styles.emptyText}>Selecione um ciclo para ver a análise.</Text>;
    }

    const { totalVolumeVendido, receitaTotal, custoPorUnidade, produtividadeUnM2, cicloDias, lucro, custoAcumulado } = calculatedMetrics;

    const formatCurrency = (value: number) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
      <View>
        <View style={styles.cardsRow}>
          <MetricCard icon="cash" label="Receita Total" value={formatCurrency(receitaTotal)} unit="" color={COLORS.success} />
          <MetricCard icon="cash-minus" label="Custo Total" value={formatCurrency(custoAcumulado)} unit="" color={COLORS.danger} />
        </View>
        <View style={[styles.lucroCard, { backgroundColor: lucro >= 0 ? COLORS.successSoft : COLORS.dangerSoft }]}>
            <Text style={styles.lucroLabel}>Resultado do Ciclo</Text>
            <Text style={[styles.lucroValue, { color: lucro >= 0 ? COLORS.success : COLORS.danger }]}> 
              {lucro >= 0 ? 'Lucro de' : 'Prejuízo de'} {formatCurrency(Math.abs(lucro))}
            </Text>
        </View>

        <View style={styles.cardsRow}>
          <MetricCard icon="package-variant" label="Volume Vendido" value={totalVolumeVendido.toFixed(2)} unit="unid" />
          <MetricCard icon="cash-100" label="Custo Medio" value={formatCurrency(custoPorUnidade)} unit="/ unid" />
        </View>
        <View style={styles.cardsRow}>
          <MetricCard icon="layers-outline" label="Produtividade" value={produtividadeUnM2.toFixed(2)} unit="unid/m²" />
          <MetricCard icon="calendar-clock" label="Duração do Ciclo" value={cicloDias} unit="dias" />
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Análise de Ciclo</Text>
        <Text style={styles.subtitle}>Selecione um ciclo de produção para ver suas métricas de performance.</Text>
      </View>
      {isLoadingPlantios ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        renderPicker()
      )}
      {renderAnalysis()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  header: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4 },
  pickerWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
    height: 50,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  picker: { color: COLORS.textDark },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontStyle: 'italic' },
  cardsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.card
  },
  metricIcon: { marginRight: SPACING.md },
  metricLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  metricValue: { fontSize: 20, fontWeight: 'bold' },
  metricUnit: { fontSize: 14, fontWeight: 'normal', color: COLORS.textSecondary },
  lucroCard: {
    backgroundColor: COLORS.infoSoft,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  lucroLabel: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  lucroValue: { fontSize: 22, fontWeight: 'bold' },
});

export default RelatorioOperacionalScreen;
