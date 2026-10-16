import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { useAuth } from '../../hooks/useAuth';
import {
  getPlantioById,
  updatePlantioStatus,
} from '../../services/plantioService';
import { calculateRentabilidadeByPlantio } from '../../services/rentabilidadeService';
import { getEstufaById } from '../../services/estufaService';
import { listTalhoes } from '../../services/talhaoService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listVendasByPlantio } from '../../services/vendaService';
import { buildCycleProductionSummary } from '../../services/cycleProductionReportHelpers';
import { Plantio } from '../../types/domain';
import { formatDateSafe } from '../../utils/date';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/theme';

type ProductionSummary = ReturnType<typeof buildCycleProductionSummary>;

type CycleLocation = {
  name: string;
  areaM2: number;
  areaLabel: string;
};

const formatNumber = (value: number, digits = 2) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const toDate = (value?: any): Date | null => {
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

const getElapsedDays = (plantio: Plantio) => {
  const startedAt = toDate(plantio.dataPlantio || plantio.dataInicio);
  if (!startedAt) return 0;
  const endedAt = toDate(plantio.dataEncerramento) || new Date();
  return Math.max(
    0,
    Math.floor((endedAt.getTime() - startedAt.getTime()) / 86_400_000)
  );
};

const MetricTile = ({
  icon,
  label,
  value,
  tone = COLORS.primary,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  tone?: string;
}) => (
  <View style={styles.metricTile}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
      <MaterialCommunityIcons name={icon} size={18} color={tone} />
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { canWrite, isOwner, user, selectedTenantId } = useAuth();
  const plantioId = route?.params?.plantioId;
  const isFocused = useIsFocused();

  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [financeiro, setFinanceiro] = useState<any>(null);
  const [production, setProduction] = useState<ProductionSummary | null>(null);
  const [location, setLocation] = useState<CycleLocation | null>(null);
  const [lastHarvestAt, setLastHarvestAt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!plantioId) {
        setLoading(false);
        return;
      }

      const targetId = selectedTenantId || user?.uid;
      if (!targetId) {
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError('');

      try {
        const currentPlantio = await getPlantioById(plantioId, targetId);
        if (!currentPlantio) {
          setPlantio(null);
          setLoadError('O ciclo não foi encontrado ou não está mais disponível.');
          return;
        }

        setPlantio(currentPlantio);

        const [colheitas, vendas, cycleLocation] = await Promise.all([
          listColheitasByPlantio(targetId, plantioId),
          listVendasByPlantio(targetId, plantioId),
          (async (): Promise<CycleLocation> => {
            if (currentPlantio.talhaoId) {
              const talhoes = await listTalhoes(targetId);
              const talhao = talhoes.find(
                (item) => item.id === currentPlantio.talhaoId
              );
              const areaHectares = Number(
                talhao?.areaCalculadaHectares || talhao?.areaHectares || 0
              );
              return {
                name: talhao?.nome || 'Talhão não identificado',
                areaM2: areaHectares * 10_000,
                areaLabel:
                  areaHectares > 0
                    ? `${formatNumber(areaHectares, 4)} ha`
                    : 'Não informada',
              };
            }

            if (currentPlantio.estufaId) {
              const estufa = await getEstufaById(
                currentPlantio.estufaId,
                targetId
              );
              const areaM2 = Number(estufa?.areaM2 || 0);
              return {
                name: estufa?.nome || 'Estufa não identificada',
                areaM2,
                areaLabel:
                  areaM2 > 0 ? `${formatNumber(areaM2)} m²` : 'Não informada',
              };
            }

            return {
              name: 'Local não informado',
              areaM2: 0,
              areaLabel: 'Não informada',
            };
          })(),
        ]);

        setLocation(cycleLocation);
        setProduction(
          buildCycleProductionSummary({
            plantio: currentPlantio,
            colheitas,
            vendas,
          })
        );
        setLastHarvestAt(colheitas[0]?.dataColheita || null);

        const rentabilidade = await calculateRentabilidadeByPlantio(
          targetId,
          plantioId,
          cycleLocation.areaM2
        );
        setFinanceiro(rentabilidade);
      } catch (error: any) {
        console.error(error);
        setLoadError(
          error?.message || 'Não foi possível carregar os dados deste ciclo.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [plantioId, selectedTenantId, user?.uid]
  );

  useEffect(() => {
    navigation.setOptions({ title: 'Sobre o ciclo' });
  }, [navigation]);

  useEffect(() => {
    if (isFocused) void loadData(false);
  }, [isFocused, loadData]);

  const handleFinalizar = () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !plantioId || finalizing) return;

    Alert.alert('Finalizar ciclo', 'Deseja encerrar este ciclo de produção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sim, finalizar',
        onPress: async () => {
          setFinalizing(true);
          try {
            await updatePlantioStatus(plantioId, 'finalizado', targetId);
            navigation.goBack();
          } catch (error: any) {
            Alert.alert(
              'Erro',
              error?.message || 'Não foi possível finalizar o ciclo.'
            );
          } finally {
            setFinalizing(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Calculando os dados do ciclo...</Text>
      </View>
    );
  }

  if (!plantioId || !plantio) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={COLORS.danger}
        />
        <Text style={styles.errorTitle}>Não foi possível abrir o ciclo</Text>
        <Text style={styles.errorText}>
          {loadError || 'Verifique sua conexão e tente novamente.'}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFieldCycle = !!plantio.talhaoId;
  const isPlantioInactive =
    plantio.status === 'finalizado' || plantio.status === 'cancelado';
  const statusLabel =
    plantio.status === 'cancelado'
      ? 'Cancelado'
      : plantio.status === 'finalizado'
        ? 'Finalizado'
        : plantio.status === 'em_colheita' ||
            plantio.status === 'colheita_iniciada'
          ? 'Em colheita'
          : 'Em andamento';
  const plantedUnit = plantio.unidadeQuantidade || 'pés/mudas';
  const startDate = plantio.dataPlantio || plantio.dataInicio;
  const forecastDate = plantio.dataPrevisaoColheita || plantio.previsaoColheita;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadData(true)}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.pulseStrip}>
        <MaterialCommunityIcons
          name="chart-timeline-variant-shimmer"
          size={18}
          color={COLORS.textLight}
        />
        <Text style={styles.pulseStripText}>
          Produção, rendimento, vendas e resultado em um só lugar
        </Text>
      </View>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{plantio.cultura}</Text>
          <Text style={styles.subTitle}>
            {plantio.variedade || 'Variedade não informada'}
          </Text>
          <View style={styles.loteBadge}>
            <MaterialCommunityIcons
              name="barcode-scan"
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.loteText}>
              Lote {plantio.codigoLote || 'não informado'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            isPlantioInactive ? styles.badgeInactive : styles.badgeActive,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isPlantioInactive
                ? styles.badgeTextInactive
                : styles.badgeTextActive,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {loadError ? (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={18}
            color={COLORS.warning}
          />
          <Text style={styles.warningText}>{loadError}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>VISÃO GERAL</Text>
            <Text style={styles.sectionTitle}>Dados do ciclo</Text>
          </View>
          <MaterialCommunityIcons
            name={isFieldCycle ? 'map-marker-radius-outline' : 'greenhouse'}
            size={25}
            color={COLORS.primary}
          />
        </View>
        <InfoRow label={isFieldCycle ? 'Talhão' : 'Estufa'} value={location?.name || '-'} />
        <InfoRow label="Área" value={location?.areaLabel || 'Não informada'} />
        <InfoRow label="Início" value={formatDateSafe(startDate)} />
        <InfoRow label="Previsão de colheita" value={formatDateSafe(forecastDate)} />
        <InfoRow label="Última colheita" value={formatDateSafe(lastHarvestAt)} />
        <InfoRow label="Dias de ciclo" value={`${getElapsedDays(plantio)} dias`} />
        <InfoRow
          label="Quantidade plantada"
          value={
            (production?.totalPlanted || 0) > 0
              ? `${formatNumber(production?.totalPlanted || 0, 0)} ${plantedUnit}`
              : 'Não informada'
          }
        />
      </View>

      <View style={styles.productionCard}>
        <View style={styles.productionHeroHeader}>
          <View>
            <Text style={styles.productionEyebrow}>PRODUÇÃO LÍQUIDA</Text>
            <Text style={styles.productionHeroValue}>
              {formatNumber(production?.totalNetWeightKg || 0)} kg
            </Text>
          </View>
          <MaterialCommunityIcons
            name="scale-balance"
            size={34}
            color={COLORS.textLight}
          />
        </View>
        <Text style={styles.productionHeroHint}>
          Produto após descontar a tara das caixas, somado aos quilos vendidos
          sem caixa.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>COLHEITA E PESO</Text>
            <Text style={styles.sectionTitle}>Rendimento produtivo</Text>
          </View>
          <MaterialCommunityIcons
            name="sprout-outline"
            size={25}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.metricsGrid}>
          <MetricTile
            icon="basket-outline"
            label="Colheitas"
            value={formatNumber(production?.totalHarvests || 0, 0)}
          />
          <MetricTile
            icon="package-variant-closed"
            label="Total de caixas"
            value={formatNumber(production?.totalBoxes || 0)}
          />
          <MetricTile
            icon="weight-kilogram"
            label="Peso bruto das caixas"
            value={`${formatNumber(production?.boxGrossWeightKg || 0)} kg`}
            tone={COLORS.info}
          />
          <MetricTile
            icon="package-variant-remove"
            label="Tara descontada"
            value={`${formatNumber(production?.boxTareWeightKg || 0)} kg`}
            tone={COLORS.warning}
          />
          <MetricTile
            icon="scale"
            label="Líquido nas caixas"
            value={`${formatNumber(production?.boxNetWeightKg || 0)} kg`}
          />
          <MetricTile
            icon="weight"
            label="Quilos sem caixa"
            value={`${formatNumber(production?.looseWeightKg || 0)} kg`}
          />
          <MetricTile
            icon="sprout"
            label="Quilos por pé/muda"
            value={
              (production?.totalPlanted || 0) > 0
                ? `${formatNumber(production?.kgPerPlanted || 0, 3)} kg`
                : '-'
            }
            tone={COLORS.success}
          />
          <MetricTile
            icon="chart-box-outline"
            label="Caixas por pé/muda"
            value={
              (production?.totalPlanted || 0) > 0
                ? formatNumber(production?.boxesPerPlanted || 0, 3)
                : '-'
            }
            tone={COLORS.success}
          />
          <MetricTile
            icon="package-variant"
            label="Média líquida por caixa"
            value={`${formatNumber(production?.averageNetWeightPerBox || 0)} kg`}
            tone={COLORS.info}
          />
          <MetricTile
            icon="database-clock-outline"
            label="Pesos estimados"
            value={formatNumber(production?.estimatedWeightRecords || 0, 0)}
            tone={
              (production?.estimatedWeightRecords || 0) > 0
                ? COLORS.warning
                : COLORS.success
            }
          />
        </View>

        {(production?.estimatedWeightRecords || 0) > 0 ? (
          <View style={styles.estimateNote}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={COLORS.warning}
            />
            <Text style={styles.estimateText}>
              {production?.estimatedWeightRecords} registro(s) antigo(s) não
              têm peso líquido informado; nesses casos foi usada a estimativa
              de 22 kg por caixa.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>COMERCIAL</Text>
            <Text style={styles.sectionTitle}>Vendas do ciclo</Text>
          </View>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={25}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.metricsGrid}>
          <MetricTile
            icon="receipt-text-outline"
            label="Quantidade de vendas"
            value={formatNumber(production?.totalSales || 0, 0)}
          />
          <MetricTile
            icon="package-variant"
            label="Preço médio por caixa"
            value={
              (production?.averageBoxSalePrice || 0) > 0
                ? formatCurrency(production?.averageBoxSalePrice || 0)
                : '-'
            }
          />
          <MetricTile
            icon="cash-sync"
            label="Receita por kg produzido"
            value={formatCurrency(production?.averageRevenuePerKg || 0)}
            tone={COLORS.info}
          />
          <MetricTile
            icon="cart-outline"
            label="Ticket médio"
            value={formatCurrency(production?.averageTicket || 0)}
            tone={COLORS.info}
          />
        </View>
        <View style={styles.commercialSummary}>
          <InfoRow
            label="Receita total"
            value={formatCurrency(production?.totalRevenue || 0)}
          />
          <InfoRow
            label="Já recebido"
            value={formatCurrency(production?.totalReceived || 0)}
          />
          <InfoRow
            label="Pendente"
            value={formatCurrency(production?.totalPending || 0)}
          />
        </View>
      </View>

      {financeiro ? (
        <View style={styles.financeCard}>
          <View style={styles.financeHeader}>
            <View>
              <Text style={styles.financeEyebrow}>RESULTADO DO CICLO</Text>
              <Text style={styles.financeTitle}>
                {financeiro.lucroBruto >= 0 ? 'Lucro bruto' : 'Prejuízo'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={
                financeiro.lucroBruto >= 0
                  ? 'trending-up'
                  : 'trending-down'
              }
              size={27}
              color={
                financeiro.lucroBruto >= 0
                  ? COLORS.success
                  : COLORS.danger
              }
            />
          </View>
          <Text
            style={[
              styles.profitValue,
              {
                color:
                  financeiro.lucroBruto >= 0
                    ? COLORS.c6EE7B7
                    : COLORS.cFCA5A5,
              },
            ]}
          >
            {formatCurrency(financeiro.lucroBruto)}
          </Text>
          <View style={styles.financeDivider} />
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Receita das vendas</Text>
            <Text style={styles.financePositive}>
              + {formatCurrency(financeiro.receitaTotal)}
            </Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Custos totais</Text>
            <Text style={styles.financeNegative}>
              - {formatCurrency(financeiro.custoTotal)}
            </Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Insumos</Text>
            <Text style={styles.financeNumber}>
              {formatCurrency(financeiro.custoInsumos)}
            </Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Outras despesas</Text>
            <Text style={styles.financeNumber}>
              {formatCurrency(financeiro.custoDespesas)}
            </Text>
          </View>
          {location?.areaM2 ? (
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Receita por m²</Text>
              <Text style={styles.financeNumber}>
                {formatCurrency(financeiro.rendimentoM2)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>AÇÕES</Text>
            <Text style={styles.sectionTitle}>Operação do ciclo</Text>
          </View>
        </View>
        <View style={styles.gridBtns}>
          {canWrite ? (
            <TouchableOpacity
              style={[styles.btnAction, { borderColor: COLORS.primary }]}
              onPress={() =>
                navigation.navigate(
                  isFieldCycle ? 'CampoVendaForm' : 'ColheitaForm',
                  {
                    plantioId: plantio.id,
                    estufaId: plantio.estufaId,
                  }
                )
              }
            >
              <MaterialCommunityIcons
                name="basket-plus"
                size={25}
                color={COLORS.primary}
              />
              <Text style={[styles.btnText, { color: COLORS.primary }]}>Vender</Text>
            </TouchableOpacity>
          ) : null}

          {canWrite ? (
            <TouchableOpacity
              style={[styles.btnAction, { borderColor: COLORS.info }]}
              onPress={() =>
                navigation.navigate('AplicacaoForm', {
                  plantioId: plantio.id,
                  estufaId: plantio.estufaId,
                })
              }
            >
              <MaterialCommunityIcons
                name="flask-plus"
                size={25}
                color={COLORS.info}
              />
              <Text style={[styles.btnText, { color: COLORS.info }]}>Aplicar</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.btnAction, { borderColor: COLORS.warning }]}
            onPress={() =>
              navigation.navigate('ManejosHistory', {
                plantioId: plantio.id,
                estufaId: plantio.estufaId,
              })
            }
          >
            <MaterialCommunityIcons
              name="notebook-outline"
              size={25}
              color={COLORS.warning}
            />
            <Text style={[styles.btnText, { color: COLORS.warning }]}>Diário</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryActions}>
          {canWrite ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() =>
                navigation.navigate('PlantioForm', {
                  plantioId: plantio.id,
                  estufaId: plantio.estufaId,
                  talhaoId: plantio.talhaoId,
                })
              }
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.secondaryBtnText}>Editar ciclo</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate('PlantioHistory', {
                plantioId: plantio.id,
                estufaId: plantio.estufaId,
              })
            }
          >
            <MaterialCommunityIcons
              name="history"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.secondaryBtnText}>Histórico completo</Text>
          </TouchableOpacity>
          {canWrite ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('ContasReceber')}
            >
              <MaterialCommunityIcons
                name="hand-coin-outline"
                size={16}
                color={COLORS.warning}
              />
              <Text style={styles.secondaryBtnText}>Contas a receber</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'FinanceiroTab' })
            }
          >
            <MaterialCommunityIcons
              name="file-chart-outline"
              size={16}
              color={COLORS.info}
            />
            <Text style={styles.secondaryBtnText}>Relatórios</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isOwner && canWrite && !isPlantioInactive ? (
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleFinalizar}
          disabled={finalizing}
        >
          {finalizing ? (
            <ActivityIndicator color={COLORS.danger} />
          ) : (
            <Text style={styles.dangerText}>Finalizar este ciclo</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 48 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
  errorTitle: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.danger,
  },
  errorText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: { color: COLORS.textLight, fontWeight: '800' },
  pulseStrip: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  pulseStripText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '900', color: COLORS.textDark },
  subTitle: { fontSize: TYPOGRAPHY.body, color: COLORS.textGray },
  loteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    marginTop: 7,
  },
  loteText: { fontSize: 11, fontWeight: '800', color: COLORS.primaryDark },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill },
  badgeActive: { backgroundColor: COLORS.successSoft },
  badgeInactive: { backgroundColor: COLORS.surfaceMuted },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextActive: { color: COLORS.primaryDark },
  badgeTextInactive: { color: COLORS.textMuted },
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  warningText: { flex: 1, color: COLORS.alertText, fontSize: 12 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionEyebrow: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    marginTop: 2,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.title,
    fontWeight: '900',
  },
  infoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  infoLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  infoValue: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  productionCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  productionHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productionEyebrow: {
    color: COLORS.cA7F3D0,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  productionHeroValue: {
    color: COLORS.textLight,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 3,
  },
  productionHeroHint: {
    marginTop: SPACING.sm,
    color: COLORS.whiteAlpha80,
    fontSize: 12,
    lineHeight: 17,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metricTile: {
    width: '48%',
    minHeight: 112,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  metricLabel: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 15 },
  metricValue: {
    marginTop: 3,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  estimateNote: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warningSoft,
  },
  estimateText: { flex: 1, color: COLORS.alertText, fontSize: 11, lineHeight: 16 },
  commercialSummary: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
  },
  financeCard: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  financeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeEyebrow: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  financeTitle: { color: COLORS.textLight, fontSize: 16, fontWeight: '800' },
  profitValue: { marginTop: SPACING.sm, fontSize: 31, fontWeight: '900' },
  financeDivider: {
    height: 1,
    backgroundColor: COLORS.c374151,
    marginVertical: SPACING.md,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 8,
  },
  financeLabel: { flex: 1, color: COLORS.cD1D5DB, fontSize: 13 },
  financeNumber: { color: COLORS.textLight, fontWeight: '800', fontSize: 13 },
  financePositive: { color: COLORS.c6EE7B7, fontWeight: '800', fontSize: 13 },
  financeNegative: { color: COLORS.cFCA5A5, fontWeight: '800', fontSize: 13 },
  gridBtns: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  btnAction: {
    flex: 1,
    minHeight: 78,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  btnText: { fontWeight: '800', fontSize: 12, marginTop: 6 },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  secondaryBtn: {
    width: '48%',
    minHeight: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  dangerBtn: {
    minHeight: 48,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: COLORS.danger, fontWeight: '800' },
});

export default PlantioDetailScreen;
