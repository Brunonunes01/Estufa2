import { Timestamp } from '../lib/timestamp';
import { listEstufas } from './estufaService';
import { getVendasFinancialSummary } from './vendaService';
import { getTotalDespesasPendentes } from './despesaService';
import { listActivePlantiosByUser } from './plantioService';
import { Estufa, Plantio, TarefaAgricola } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { listTodayPendingTasks } from './tarefaAgricolaService';
import { getSupabaseClient } from './supabaseClient';
import { filterPlantiosByKnownEstufas, normalizeDashboardSummaryDoc } from './dashboardSummaryHelpers.ts';

export interface DashboardSummary {
  estufas: Estufa[];
  activePlantios: Plantio[];
  todayTasks: TarefaAgricola[];
  totalReceber: number;
  totalRecebido: number;
  totalPagar: number;
  tarefasHojePendentes: number;
  summarySource: 'summary_doc' | 'aggregate';
  summaryUpdatedAt?: Timestamp | null;
}

const getFinancialSummaryFromDoc = async (tenantId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dashboard_summary')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeDashboardSummaryDoc(data);
};

export const getDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const tenantId = assertTenantId(userId);

  const [estufasRes, activePlantiosRes, todayTasksRes, summaryDocRes] = await Promise.allSettled([
    listEstufas(tenantId),
    listActivePlantiosByUser(tenantId),
    listTodayPendingTasks(tenantId),
    getFinancialSummaryFromDoc(tenantId),
  ]);

  const estufas = estufasRes.status === 'fulfilled' ? estufasRes.value : [];
  const activePlantios = activePlantiosRes.status === 'fulfilled' ? activePlantiosRes.value : [];
  const activePlantiosValidos = filterPlantiosByKnownEstufas(
    estufas.map((item) => item.id),
    activePlantios
  );
  const todayTasks = todayTasksRes.status === 'fulfilled' ? todayTasksRes.value : [];
  const summaryDoc = summaryDocRes.status === 'fulfilled' ? summaryDocRes.value : null;

  if (summaryDoc) {
    return {
      estufas,
      activePlantios: activePlantiosValidos,
      todayTasks,
      totalReceber: summaryDoc.totalReceber,
      totalRecebido: summaryDoc.totalRecebido ?? 0,
      totalPagar: summaryDoc.totalPagar,
      tarefasHojePendentes: summaryDoc.tarefasHojePendentes ?? todayTasks.length,
      summarySource: summaryDoc.source,
      summaryUpdatedAt: summaryDoc.updatedAt,
    };
  }

  const [vendasTotalsRes, totalPagarRes] = await Promise.allSettled([
    getVendasFinancialSummary(tenantId),
    getTotalDespesasPendentes(tenantId),
  ]);

  const vendasTotals =
    vendasTotalsRes.status === 'fulfilled'
      ? vendasTotalsRes.value
      : {
          totalReceber: 0,
          totalRecebido: 0,
        };
  const totalPagar = totalPagarRes.status === 'fulfilled' ? totalPagarRes.value : 0;

  return {
    estufas,
    activePlantios: activePlantiosValidos,
    todayTasks,
    totalReceber: vendasTotals.totalReceber,
    totalRecebido: vendasTotals.totalRecebido,
    totalPagar,
    tarefasHojePendentes: todayTasks.length,
    summarySource: 'aggregate',
    summaryUpdatedAt: null,
  };
};

