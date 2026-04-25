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

  const { data: plantios, isLoading: isLoadingPlantios } = useQuery<Plantio[]>(
    ['allPlantios', tenantId],
    () => listAllPlantios(tenantId!),
    { enabled: !!tenantId }
  );

  const selectedPlantio = useMemo(() => {
    return plantios?.find(p => p.id === selectedPlantioId) || null;
  }, [plantios, selectedPlantioId]);

  const { data: analysisData, isLoading: isLoadingAnalysis } = useQuery(
    ['cycleAnalysis', selectedPlantioId],
    () => fetchCycleAnalysisData(selectedPlantio!, tenantId!),
    { enabled: !!selectedPlantio && !!tenantId && !!selectedPlantio.estufaId }
  );

  const calculatedMetrics = useMemo(() => {
    if (!selectedPlantio || !analysisData || !analysisData.estufa) {
      return null;
    }

    const { vendas, estufa } = analysisData;
    const { custoAcumulado = 0, dataInicio } = selectedPlantio;
    const estufaArea = estufa.area || 0;

    const totalKgVendidos = vendas.reduce((acc, v) => acc + (v.quantidade || 0), 0);
    const receitaTotal = vendas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    
    const custoPorKg = totalKgVendidos > 0 ? custoAcumulado / totalKgVendidos : 0;
    const produtividadeKgM2 = estufaArea > 0 ? totalKgVendidos / estufaArea : 0;
    
    let cicloDias = 0;
    if (dataInicio?.seconds) {
      const dataFim = vendas.length > 0
        ? vendas.reduce((latest, v) => Math.max(latest, v.dataVenda.seconds), 0)
        : Date.now() / 1000;
      cicloDias = Math.floor((dataFim - dataInicio.seconds) / (60 * 60 * 24));
    }
    
    const lucro = receitaTotal - custoAcumulado;

    return { totalKgVendidos, receitaTotal, custoPorKg, produtividadeKgM2, cicloDias, lucro, custoAcumulado };
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
            label={`${p.cultura} (${p.codigoLote}) - ${p.status}`} 
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

    const { totalKgVendidos, receitaTotal, custoPorKg, produtividadeKgM2, cicloDias, lucro, custoAcumulado } = calculatedMetrics;

    return (
      <View>
        <View style={styles.cardsRow}>
          <MetricCard icon="cash" label="Receita Total" value={`R$ ${receitaTotal.toFixed(2)}`} unit="" color={COLORS.success} />
          <MetricCard icon="cash-minus" label="Custo Total" value={`R$ ${custoAcumulado.toFixed(2)}`} unit="" color={COLORS.danger} />
        </View>
        <View style={[styles.lucroCard, { backgroundColor: lucro >= 0 ? COLORS.successSoft : COLORS.dangerSoft }]}>
            <Text style={styles.lucroLabel}>Resultado do Ciclo</Text>
            <Text style={[styles.lucroValue, { color: lucro >= 0 ? COLORS.success : COLORS.danger }]}>
              {lucro >= 0 ? 'Lucro de' : 'Prejuízo de'} R$ {Math.abs(lucro).toFixed(2)}
            </Text>
        </View>

        <View style={styles.cardsRow}>
          <MetricCard icon="weight-kilogram" label="Total Vendido" value={totalKgVendidos.toFixed(2)} unit="kg" />
          <MetricCard icon="cash-100" label="Custo / kg" value={`R$ ${custoPorKg.toFixed(2)}`} unit="" />
        </View>
        <View style={styles.cardsRow}>
          <MetricCard icon="layers-outline" label="Produtividade" value={produtividadeKgM2.toFixed(2)} unit="kg/m²" />
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
