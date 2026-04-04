import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { listEstufas } from './estufaService';
import { getTotalContasAReceber } from './colheitaService';
import { getTotalDespesasPendentes } from './despesaService';
import { listActivePlantiosByUser } from './plantioService';
import { Estufa, Plantio } from '../types/domain';
import { db } from './firebaseConfig';
import { assertTenantId } from './tenantGuard';

interface DashboardFinancialSummaryDoc {
  tenantId: string;
  totalReceber: number;
  totalPagar: number;
  updatedAt?: Timestamp;
}

export interface DashboardSummary {
  estufas: Estufa[];
  activePlantios: Plantio[];
  totalReceber: number;
  totalPagar: number;
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
      updatedAt: data.updatedAt || null,
      source: 'summary_doc' as const,
    };
  } catch (error) {
    return null;
  }
};

export const getDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const tenantId = assertTenantId(userId);

  const [estufas, activePlantios, summaryDoc] = await Promise.all([
    listEstufas(tenantId),
    listActivePlantiosByUser(tenantId),
    getFinancialSummaryFromDoc(tenantId),
  ]);

  if (summaryDoc) {
    return {
      estufas,
      activePlantios,
      totalReceber: summaryDoc.totalReceber,
      totalPagar: summaryDoc.totalPagar,
      summarySource: summaryDoc.source,
      summaryUpdatedAt: summaryDoc.updatedAt,
    };
  }

  const [totalReceber, totalPagar] = await Promise.all([
    getTotalContasAReceber(tenantId),
    getTotalDespesasPendentes(tenantId),
  ]);

  return {
    estufas,
    activePlantios,
    totalReceber,
    totalPagar,
    summarySource: 'aggregate',
    summaryUpdatedAt: null,
  };
};
