import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';
import { useDashboardSummary } from './queries/useDashboardSummary';
import { evaluateEstufaHealth } from '../utils/estufaHealth';

export const useDashboardMetrics = () => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const targetId = selectedTenantId || user?.uid;

  const query = useDashboardSummary(targetId);
  const estufas = query.data?.estufas || [];
  const plantios = query.data?.activePlantios || [];
  const todayTasks = query.data?.todayTasks || [];

  const activePlantioByEstufa = useMemo(() => {
    const map: Record<string, (typeof plantios)[number] | null> = {};
    for (const plantio of plantios) {
      if (!map[plantio.estufaId]) map[plantio.estufaId] = plantio;
    }
    for (const estufa of estufas) {
      if (!(estufa.id in map)) map[estufa.id] = null;
    }
    return map;
  }, [estufas, plantios]);

  const plantiosByEstufa = useMemo(() => {
    const grouped: Record<string, typeof plantios> = {};
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
    totalPagar: query.data?.totalPagar || 0,
    tarefasHojePendentes: query.data?.tarefasHojePendentes || todayTasks.length,
    summarySource: query.data?.summarySource,
    summaryUpdatedAt: query.data?.summaryUpdatedAt,
    loadingResumo: query.isLoading || query.isFetching,
    isError: query.isError,
    activePlantioByEstufa,
    plantiosByEstufa,
    totalCiclosAtivos: plantios.length,
    healthByEstufa,
    criticalAlerts,
  };
};
