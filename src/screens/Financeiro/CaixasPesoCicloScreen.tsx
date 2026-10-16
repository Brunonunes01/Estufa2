import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { listAllPlantios } from '../../services/plantioService';
import { listAllColheitas } from '../../services/colheitaService';
import {
  exportCycleProductionExcel,
  shareCycleProductionPdf,
} from '../../services/receiptService';
import {
  getTotalPlantedUnits,
  getHarvestWeightBreakdown,
  LEGACY_BOX_NET_WEIGHT_KG,
} from '../../services/cycleProductionReportHelpers';
import { Colheita, Plantio } from '../../types/domain';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';
import {
  FinanceProductionMode,
  matchesPlantioProductionMode,
} from '../../services/financeProductionScope';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed
      : null;
  }
  if (typeof value?.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
};

const formatDate = (value?: any) => {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleDateString('pt-BR') : '-';
};

const fetchData = async (
  tenantId: string,
  productionMode: FinanceProductionMode
) => {
  const [plantios, colheitas] = await Promise.all([
    listAllPlantios(tenantId),
    listAllColheitas(tenantId),
  ]);
  const scopedPlantios = plantios.filter((plantio) =>
    matchesPlantioProductionMode(plantio, productionMode)
  );
  const scopedPlantioIds = new Set(scopedPlantios.map((plantio) => plantio.id));
  return {
    plantios: scopedPlantios,
    colheitas: colheitas.filter((colheita) =>
      scopedPlantioIds.has(colheita.plantioId)
    ),
  };
};

const CaixasPesoCicloScreen = () => {
  const { user, selectedTenantId, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const tenantId = selectedTenantId || user?.uid;

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { data, isLoading } = useQuery<{
    plantios: Plantio[];
    colheitas: Colheita[];
  }>({
    queryKey: [
      'caixas-peso-ciclo',
      tenantId,
      settings.activeProductionMode,
    ],
    queryFn: () => fetchData(tenantId!, settings.activeProductionMode),
    enabled: !!tenantId,
  });

  const filteredColheitas = useMemo(() => {
    const colheitas = data?.colheitas || [];
    return colheitas.filter((colheita) => {
      const dataColheita = toDate(colheita.dataColheita);
      if (!dataColheita) return false;
      if (startDate && dataColheita < startOfDay(startDate)) return false;
      if (endDate && dataColheita > endOfDay(endDate)) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  const metrics = useMemo(() => {
    const plantios = data?.plantios || [];
    const grouped = new Map<string, Colheita[]>();

    filteredColheitas.forEach((colheita) => {
      const key = colheita.plantioId;
      if (!key) return;
      const current = grouped.get(key) || [];
      current.push(colheita);
      grouped.set(key, current);
    });

    const cycles = plantios
      .map((plantio) => {
        const items = grouped.get(plantio.id) || [];
        const pesos = items.map(getHarvestWeightBreakdown);
        const totalCaixas = pesos.reduce((acc, item) => acc + item.boxCount, 0);
        const pesoBrutoCaixas = pesos.reduce(
          (acc, item) => acc + item.boxGrossWeightKg,
          0
        );
        const pesoCaixas = pesos.reduce(
          (acc, item) => acc + item.boxNetWeightKg,
          0
        );
        const kiloLivre = pesos.reduce(
          (acc, item) => acc + item.looseWeightKg,
          0
        );
        const registrosPesoEstimado = pesos.filter(
          (item) => item.usesLegacyBoxEstimate
        ).length;
        const pesoTotal = pesoCaixas + kiloLivre;
        const totalPlantado = getTotalPlantedUnits(plantio);
        const caixasPorPlantado =
          totalPlantado > 0 ? totalCaixas / totalPlantado : 0;
        const ultimaColheita =
          items
            .map((item) => toDate(item.dataColheita))
            .filter((value): value is Date => !!value)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        return {
          plantio,
          totalCaixas,
          pesoBrutoCaixas,
          pesoCaixas,
          kiloLivre,
          pesoTotal,
          registrosPesoEstimado,
          totalPlantado,
          caixasPorPlantado,
          totalColheitas: items.length,
          ultimaColheita,
        };
      })
      .filter((item) => item.totalColheitas > 0)
      .sort((a, b) => {
        const aDate =
          toDate(a.plantio.dataPlantio || a.plantio.dataInicio)?.getTime() || 0;
        const bDate =
          toDate(b.plantio.dataPlantio || b.plantio.dataInicio)?.getTime() || 0;
        return bDate - aDate;
      });

    const totalCaixas = cycles.reduce((acc, item) => acc + item.totalCaixas, 0);
    const totalPesoCaixas = cycles.reduce(
      (acc, item) => acc + item.pesoCaixas,
      0
    );
    const totalPesoBrutoCaixas = cycles.reduce(
      (acc, item) => acc + item.pesoBrutoCaixas,
      0
    );
    const totalKiloLivre = cycles.reduce(
      (acc, item) => acc + item.kiloLivre,
      0
    );
    const totalPeso = cycles.reduce((acc, item) => acc + item.pesoTotal, 0);
    const totalPlantado = cycles.reduce(
      (acc, item) => acc + item.totalPlantado,
      0
    );
    const totalCiclosComMovimento = cycles.length;
    const totalRegistrosPesoEstimado = cycles.reduce(
      (acc, item) => acc + item.registrosPesoEstimado,
      0
    );

    return {
      cycles,
      totalCaixas,
      totalPesoCaixas,
      totalPesoBrutoCaixas,
      totalKiloLivre,
      totalPeso,
      totalPlantado,
      totalCiclosComMovimento,
      totalRegistrosPesoEstimado,
      mediaCaixasPorPlantado:
        totalPlantado > 0 ? totalCaixas / totalPlantado : 0,
    };
  }, [data, filteredColheitas]);

  const periodLabel = useMemo(() => {
    if (startDate && endDate)
      return `${formatDate(startDate)} a ${formatDate(endDate)}`;
    if (startDate) return `A partir de ${formatDate(startDate)}`;
    if (endDate) return `Até ${formatDate(endDate)}`;
    return 'Todo o período';
  }, [startDate, endDate]);

  const exportItems = useMemo(
    () =>
      metrics.cycles.map((item) => ({
        ciclo: item.plantio.cultura || 'Ciclo sem nome',
        lote: item.plantio.codigoLote || 'Sem lote',
        status: item.plantio.status,
        inicio: formatDate(item.plantio.dataPlantio || item.plantio.dataInicio),
        ultimaColheita: item.ultimaColheita
          ? item.ultimaColheita.toLocaleDateString('pt-BR')
          : '-',
        totalColheitas: item.totalColheitas,
        totalCaixas: item.totalCaixas,
        pesoPorCaixaKg:
          item.registrosPesoEstimado > 0 ? LEGACY_BOX_NET_WEIGHT_KG : undefined,
        pesoBrutoCaixas: item.pesoBrutoCaixas,
        pesoLiquidoCaixas: item.pesoCaixas,
        pesoCaixas: item.pesoCaixas,
        kiloLivre: item.kiloLivre,
        pesoTotal: item.pesoTotal,
        totalPlantado: item.totalPlantado,
        caixasPorPlantado: item.caixasPorPlantado,
        registrosPesoEstimado: item.registrosPesoEstimado,
        criterioPeso:
          item.registrosPesoEstimado > 0
            ? `Peso líquido informado nas colheitas; ${item.registrosPesoEstimado} registro(s) antigo(s) sem peso usam ${LEGACY_BOX_NET_WEIGHT_KG} kg por caixa.`
            : 'Pesos bruto e líquido informados nas colheitas; peso livre considera registros em kg.',
      })),
    [metrics]
  );

  const empresa =
    availableTenants.find((item) => item.uid === tenantId)?.name ||
    user?.name ||
    'Produtor';

  const handleExportPdf = async () => {
    if (exportItems.length === 0) {
      Alert.alert(
        'Atenção',
        'Não há ciclos com colheitas no período selecionado.'
      );
      return;
    }
    try {
      await shareCycleProductionPdf({
        empresa,
        periodo: periodLabel,
        itens: exportItems,
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível exportar o PDF.');
    }
  };

  const handleExportExcel = async () => {
    if (exportItems.length === 0) {
      Alert.alert(
        'Atenção',
        'Não há ciclos com colheitas no período selecionado.'
      );
      return;
    }
    try {
      await exportCycleProductionExcel({
        empresa,
        periodo: periodLabel,
        itens: exportItems,
      });
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível exportar o Excel.'
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Caixas e Peso Livre por Ciclos de Plantio
        </Text>
        <Text style={styles.subtitle}>
          Resumo agrupado por ciclo de plantio com filtro por período de
          colheita.
        </Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Período da colheita</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowStartPicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar-start"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.filterButtonText}>
              {startDate ? formatDate(startDate) : 'Data inicial'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowEndPicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar-end"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.filterButtonText}>
              {endDate ? formatDate(endDate) : 'Data final'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterFooter}>
          <Text style={styles.periodText}>{periodLabel}</Text>
          <TouchableOpacity
            onPress={() => {
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker ? (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      ) : null}

      {showEndPicker ? (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      ) : null}

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

      <View style={styles.cardsRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total de caixas</Text>
          <Text style={styles.kpiValue}>{metrics.totalCaixas.toFixed(2)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Peso total</Text>
          <Text style={styles.kpiValue}>{metrics.totalPeso.toFixed(2)} kg</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Ciclos com movimento</Text>
          <Text style={styles.kpiValue}>{metrics.totalCiclosComMovimento}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Peso líquido das caixas</Text>
          <Text style={styles.kpiValue}>
            {metrics.totalPesoCaixas.toFixed(2)} kg
          </Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Peso livre total</Text>
          <Text style={styles.kpiValue}>
            {metrics.totalKiloLivre.toFixed(2)} kg
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Caixas por pé plantado</Text>
          <Text style={styles.kpiValue}>
            {metrics.mediaCaixasPorPlantado.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Peso bruto informado</Text>
          <Text style={styles.kpiValue}>
            {metrics.totalPesoBrutoCaixas.toFixed(2)} kg
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Pesos antigos estimados</Text>
          <Text style={styles.kpiValue}>
            {metrics.totalRegistrosPesoEstimado}
          </Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total plantado</Text>
          <Text style={styles.kpiValue}>
            {metrics.totalPlantado.toFixed(0)}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Período aplicado</Text>
          <Text style={styles.kpiValueSmall}>{periodLabel}</Text>
        </View>
      </View>

      {metrics.cycles.length === 0 ? (
        <EmptyState
          icon="archive-outline"
          title="Sem colheitas no período"
          description="Ajuste o período ou registre colheitas para acompanhar caixas e peso livre por ciclo."
        />
      ) : (
        metrics.cycles.map(
          ({
            plantio,
            totalCaixas,
            pesoBrutoCaixas,
            pesoCaixas,
            kiloLivre,
            pesoTotal,
            registrosPesoEstimado,
            totalPlantado,
            caixasPorPlantado,
            totalColheitas,
            ultimaColheita,
          }) => (
            <View key={plantio.id} style={styles.cycleCard}>
              <View style={styles.cycleHeader}>
                <View style={styles.cycleInfo}>
                  <Text style={styles.cycleTitle}>
                    {plantio.cultura || 'Ciclo sem nome'}
                  </Text>
                  <Text style={styles.cycleMeta}>
                    Lote: {plantio.codigoLote || 'Sem lote'} • Status:{' '}
                    {plantio.status}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalColheitas} colheita(s)
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Caixas</Text>
                  <Text style={styles.metricBoxValue}>
                    {totalCaixas.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Peso líquido caixas</Text>
                  <Text style={styles.metricBoxValue}>
                    {pesoCaixas.toFixed(2)} kg
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Peso livre</Text>
                  <Text style={styles.metricBoxValue}>
                    {kiloLivre.toFixed(2)} kg
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Peso bruto caixas</Text>
                  <Text style={styles.metricBoxValue}>
                    {pesoBrutoCaixas.toFixed(2)} kg
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Peso total</Text>
                  <Text style={styles.metricBoxValue}>
                    {pesoTotal.toFixed(2)} kg
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>
                    Caixas por pé plantado
                  </Text>
                  <Text style={styles.metricBoxValue}>
                    {caixasPorPlantado.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Total plantado</Text>
                  <Text style={styles.metricBoxValue}>
                    {totalPlantado.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>Pesos estimados</Text>
                  <Text style={styles.metricBoxValue}>
                    {registrosPesoEstimado}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>
                  Inicio do ciclo:{' '}
                  {formatDate(plantio.dataPlantio || plantio.dataInicio)}
                </Text>
                <Text style={styles.footerText}>
                  Ultima colheita:{' '}
                  {ultimaColheita
                    ? ultimaColheita.toLocaleDateString('pt-BR')
                    : '-'}
                </Text>
              </View>
            </View>
          )
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 48 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900', color: COLORS.textDark },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  filterRow: { flexDirection: 'row', gap: SPACING.md },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  filterButtonText: { color: COLORS.textDark, fontWeight: '700', fontSize: 13 },
  filterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  periodText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  clearText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  actionButtonText: {
    color: COLORS.textLight,
    fontWeight: '800',
    fontSize: 13,
  },
  cardsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
  },
  kpiValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  kpiValueSmall: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  cycleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cycleInfo: { flex: 1 },
  cycleTitle: { fontSize: 17, fontWeight: '900', color: COLORS.textDark },
  cycleMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  badge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  metricGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  metricBoxLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricBoxValue: { fontSize: 16, color: COLORS.textDark, fontWeight: '900' },
  footerRow: { gap: 4 },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
});

export default CaixasPesoCicloScreen;
