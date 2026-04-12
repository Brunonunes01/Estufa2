import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { listEstufas } from './estufaService';
import { getTotalContasAReceber } from './vendaService';
import { getTotalDespesasPendentes } from './despesaService';
import { listActivePlantiosByUser } from './plantioService';
import { Estufa, Plantio, TarefaAgricola } from '../types/domain';
import { db } from './firebaseConfig';
import { assertTenantId } from './tenantGuard';
import { listTodayPendingTasks } from './tarefaAgricolaService';

interface DashboardFinancialSummaryDoc {
  tenantId: string;
  totalReceber: number;
  totalPagar: number;
  tarefasHojePendentes?: number;
  updatedAt?: Timestamp;
}

export interface DashboardSummary {
  estufas: Estufa[];
  activePlantios: Plantio[];
  todayTasks: TarefaAgricola[];
  totalReceber: number;
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

  const [estufasRes, activePlantiosRes, todayTasksRes, summaryDocRes] = await Promise.allSettled([
    listEstufas(tenantId),
    listActivePlantiosByUser(tenantId),
    listTodayPendingTasks(tenantId),
    getFinancialSummaryFromDoc(tenantId),
  ]);

  const estufas = estufasRes.status === 'fulfilled' ? estufasRes.value : [];
  const activePlantios = activePlantiosRes.status === 'fulfilled' ? activePlantiosRes.value : [];
  const todayTasks = todayTasksRes.status === 'fulfilled' ? todayTasksRes.value : [];
  const summaryDoc = summaryDocRes.status === 'fulfilled' ? summaryDocRes.value : null;

  if (summaryDoc) {
    return {
      estufas,
      activePlantios,
      todayTasks,
      totalReceber: summaryDoc.totalReceber,
      totalPagar: summaryDoc.totalPagar,
      tarefasHojePendentes: summaryDoc.tarefasHojePendentes ?? todayTasks.length,
      summarySource: summaryDoc.source,
      summaryUpdatedAt: summaryDoc.updatedAt,
    };
  }

  const [totalReceberRes, totalPagarRes] = await Promise.allSettled([
    getTotalContasAReceber(tenantId),
    getTotalDespesasPendentes(tenantId),
  ]);

  const totalReceber = totalReceberRes.status === 'fulfilled' ? totalReceberRes.value : 0;
  const totalPagar = totalPagarRes.status === 'fulfilled' ? totalPagarRes.value : 0;

  return {
    estufas,
    activePlantios,
    todayTasks,
    totalReceber,
    totalPagar,
    tarefasHojePendentes: todayTasks.length,
    summarySource: 'aggregate',
    summaryUpdatedAt: null,
  };
};
