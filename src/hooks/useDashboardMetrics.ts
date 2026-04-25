import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';
import { useDashboardSummary } from './queries/useDashboardSummary';
import { evaluateEstufaHealth } from '../utils/estufaHealth';
import { Plantio } from '../types/domain';

export const useDashboardMetrics = () => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const { settings } = useAppSettings();
  const targetId = selectedTenantId || user?.uid;

  const query = useDashboardSummary(targetId);
  const estufas = query.data?.estufas || [];
  const plantios = query.data?.activePlantios || [];
  const todayTasks = query.data?.todayTasks || [];

  /**
   * Lógica aprimorada para selecionar o plantio "principal" de uma estufa:
   * 1. Prioriza plantios em fase de colheita (colheita_iniciada ou em_colheita).
   * 2. Em seguida, prioriza pelo updatedAt mais recente.
   */
  const activePlantioByEstufa = useMemo(() => {
    const map: Record<string, Plantio | null> = {};

    // Agrupa plantios ativos por estufa
    const byEstufa: Record<string, Plantio[]> = {};
    for (const plantio of plantios) {
      if (!byEstufa[plantio.estufaId]) byEstufa[plantio.estufaId] = [];
      byEstufa[plantio.estufaId].push(plantio);
    }

    // Para cada estufa, escolhe o mais relevante
    for (const estufa of estufas) {
      const candidates = byEstufa[estufa.id] || [];
      if (candidates.length === 0) {
        map[estufa.id] = null;
        continue;
      }

      const sorted = [...candidates].sort((a, b) => {
        const priority = (s: string) => (s === 'colheita_iniciada' || s === 'em_colheita' ? 2 : 1);
        const pA = priority(a.status);
        const pB = priority(b.status);

        if (pA !== pB) return pB - pA; // Prioridade por status

        const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : (a.updatedAt as any)?.seconds || 0;
        const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : (b.updatedAt as any)?.seconds || 0;
        return timeB - timeA; // Mais recente primeiro
      });

      map[estufa.id] = sorted[0];
    }

    return map;
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
    // O contador "Tarefas Hoje" deve refletir sempre a lista diária em tempo real.
    tarefasHojePendentes: todayTasks.length,
    summarySource: query.data?.summarySource,
    summaryUpdatedAt: query.data?.summaryUpdatedAt,
    loadingResumo: query.isLoading || query.isFetching,
    isError: query.isError,
    refetchResumo: query.refetch,
    activePlantioByEstufa,
    plantiosByEstufa,
    totalCiclosAtivos: plantios.length,
    healthByEstufa,
    criticalAlerts,
  };
};
