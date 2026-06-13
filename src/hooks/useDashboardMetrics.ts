import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';
import { useDashboardSummary } from './queries/useDashboardSummary';
import { evaluateEstufaHealth } from '../utils/estufaHealth';
import { Plantio } from '../types/domain';
import { selectPrimaryPlantioByEstufa } from './dashboardMetricsUtils';
import { useGlobalStats } from './useGlobalStats';

export const useDashboardMetrics = () => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const targetId = selectedTenantId || user?.uid;

  const query = useDashboardSummary(targetId);
  const globalStats = useGlobalStats(targetId);
  
  const estufas = query.data?.estufas || [];
  const plantios = query.data?.activePlantios || [];
  const todayTasks = query.data?.todayTasks || [];

  const activePlantioByEstufa = useMemo(() => {
    return selectPrimaryPlantioByEstufa(
      estufas.map((estufa) => estufa.id),
      plantios
    );
  }, [estufas, plantios]);

  const plantiosByEstufa = useMemo(() => {
    const grouped: Record<string, Plantio[]> = {};
    for (const plantio of plantios) {
      if (!grouped[plantio.estufaId]) grouped[plantio.estufaId] = [];
      grouped[plantio.estufaId].push(plantio);
    }
    return grouped;
  }, [plantios]);

  const healthByEstufa = useMemo(() => {
    return estufas.reduce<Record<string, ReturnType<typeof evaluateEstufaHealth>>>((acc, estufa) => {
      acc[estufa.id] = evaluateEstufaHealth(estufa, plantiosByEstufa[estufa.id] || []);
      return acc;
    }, {});
  }, [estufas, plantiosByEstufa]);

  const criticalAlerts = useMemo(() => {
    if (!settings.notifyCritical) return [];

    return estufas
      .map((estufa) => ({ estufa, health: healthByEstufa[estufa.id] }))
      .filter((item) => item.health && item.health.level !== 'ok')
      .slice(0, 4);
  }, [estufas, healthByEstufa, settings.notifyCritical]);

  return {
    user,
    selectedTenantId,
    changeTenant,
    availableTenants,
    settings,
    targetId,
    estufas,
    plantios,
    todayTasks,
    totalReceber: query.data?.totalReceber || 0,
    totalRecebido: query.data?.totalRecebido || 0,
    totalPagar: query.data?.totalPagar || 0,
    tarefasHojePendentes: todayTasks.length,
    summarySource: query.data?.summarySource,
    summaryUpdatedAt: query.data?.summaryUpdatedAt,
    loadingResumo: query.isLoading || query.isFetching || globalStats.isFetching,
    isError: query.isError || globalStats.isError,
    refetchResumo: async () => {
      await Promise.all([query.refetch(), globalStats.refetch()]);
    },
    activePlantioByEstufa,
    plantiosByEstufa,
    totalCiclosAtivos: plantios.length,
    healthByEstufa,
    criticalAlerts,
    lucroTotal: globalStats.data?.lucroTotal || 0,
    roiGeral: globalStats.data?.roiGeral || 0,
    totalReceita: globalStats.data?.totalReceita || 0,
    totalVendido: globalStats.data?.totalReceita || 0,
  };
};
