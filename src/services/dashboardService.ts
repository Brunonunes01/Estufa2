import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { listEstufas } from './estufaService';
import { getVendasFinancialSummary } from './vendaService';
import { getTotalDespesasPendentes } from './despesaService';
import { listActivePlantiosByUser } from './plantioService';
import { Estufa, Plantio, TarefaAgricola } from '../types/domain';
import { db } from './firebaseConfig';
import { assertTenantId } from './tenantGuard';
import { listTarefasPendentes } from './tarefaAgricolaService';

interface DashboardFinancialSummaryDoc {
  tenantId: string;
  totalReceber: number;
  totalRecebido?: number;
  totalPagar: number;
  tarefasHojePendentes?: number;
  updatedAt?: Timestamp;
}

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
  try {
    const snap = await getDoc(doc(db, 'dashboard_summary', tenantId));
    if (!snap.exists()) return null;

    const data = snap.data() as Partial<DashboardFinancialSummaryDoc>;
    if (typeof data.totalReceber !== 'number' || typeof data.totalPagar !== 'number') {
      return null;
    }

    return {
      totalReceber: data.totalReceber,
      totalRecebido: typeof data.totalRecebido === 'number' ? data.totalRecebido : undefined,
      totalPagar: data.totalPagar,
      tarefasHojePendentes:
        typeof data.tarefasHojePendentes === 'number' ? data.tarefasHojePendentes : undefined,
      updatedAt: data.updatedAt || null,
      source: 'summary_doc' as const,
    };
  } catch (error) {
    return null;
  }
};

export const getDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const tenantId = assertTenantId(userId);

  const [estufasRes, activePlantiosRes, pendingTasksRes, summaryDocRes, vendasTotalsRes, totalPagarRes] =
    await Promise.allSettled([
    listEstufas(tenantId),
    listActivePlantiosByUser(tenantId),
    listTarefasPendentes(tenantId),
    getFinancialSummaryFromDoc(tenantId),
    getVendasFinancialSummary(tenantId),
    getTotalDespesasPendentes(tenantId),
  ]);

  const estufas = estufasRes.status === 'fulfilled' ? estufasRes.value : [];
  const activePlantios = activePlantiosRes.status === 'fulfilled' ? activePlantiosRes.value : [];
  const estufaIds = new Set(estufas.map((item) => item.id));
  const activePlantiosValidos = activePlantios.filter((item) => !!item.estufaId && estufaIds.has(item.estufaId));
  const pendingTasks = pendingTasksRes.status === 'fulfilled' ? pendingTasksRes.value : [];
  const vendasTotals =
    vendasTotalsRes.status === 'fulfilled'
      ? vendasTotalsRes.value
      : {
          totalReceber: summaryDocRes.status === 'fulfilled' ? summaryDocRes.value?.totalReceber || 0 : 0,
          totalRecebido: summaryDocRes.status === 'fulfilled' ? summaryDocRes.value?.totalRecebido || 0 : 0,
        };
  const totalPagar =
    totalPagarRes.status === 'fulfilled'
      ? totalPagarRes.value
      : summaryDocRes.status === 'fulfilled'
      ? summaryDocRes.value?.totalPagar || 0
      : 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const todayTasks = pendingTasks.filter((task) => {
    const value = task.dataPrevista as any;
    const ms =
      typeof value?.toMillis === 'function'
        ? value.toMillis()
        : typeof value?.seconds === 'number'
        ? value.seconds * 1000
        : NaN;
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
  });
  const summaryDoc = summaryDocRes.status === 'fulfilled' ? summaryDocRes.value : null;

  if (summaryDoc) {
    return {
      estufas,
      activePlantios: activePlantiosValidos,
      todayTasks,
      totalReceber: vendasTotals.totalReceber,
      totalRecebido: vendasTotals.totalRecebido,
      totalPagar,
      tarefasHojePendentes: summaryDoc.tarefasHojePendentes ?? todayTasks.length,
      summarySource: summaryDoc.source,
      summaryUpdatedAt: summaryDoc.updatedAt,
    };
  }

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
