import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Despesa, Plantio, Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';

export interface GlobalStatsResult {
  lucroTotal: number;
  totalReceita: number;
  totalCustoProd: number;
  totalDespesas: number;
  totalPlantios: number;
}

const mergeDocsById = <T>(snaps: Awaited<ReturnType<typeof getDocs>>[]): T[] => {
  const merged = new Map<string, T>();
  snaps.forEach((snap) => {
    snap.docs.forEach((document) => {
      const data = document.data() as Record<string, unknown>;
      merged.set(document.id, { ...data, id: document.id } as T);
    });
  });
  return Array.from(merged.values());
};

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
  const tenantId = assertTenantId(userId);
  try {
    const [
      plantiosTenantSnap,
      plantiosLegacySnap,
      vendasTenantSnap,
      vendasLegacySnap,
      despesasTenantSnap,
      despesasLegacySnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'plantios'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'plantios'), where('userId', '==', tenantId))),
      getDocs(query(collection(db, 'vendas'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'vendas'), where('userId', '==', tenantId))),
      getDocs(query(collection(db, 'despesas'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'despesas'), where('userId', '==', tenantId))),
    ]);

    const plantios = mergeDocsById<Plantio>([plantiosTenantSnap, plantiosLegacySnap]);
    const vendas = mergeDocsById<Venda>([vendasTenantSnap, vendasLegacySnap]);
    const despesas = mergeDocsById<Despesa>([despesasTenantSnap, despesasLegacySnap]);

    const totalReceita = vendas.reduce((acc, curr) => acc + Number(curr.valorTotal || 0), 0);
    const totalCustoProd = plantios.reduce(
      (acc, curr) => acc + Number(curr.custoAcumulado || curr.custoTotal || 0),
      0
    );
    const totalDespesas = despesas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    return {
      lucroTotal: totalReceita - totalCustoProd - totalDespesas,
      totalReceita,
      totalCustoProd,
      totalDespesas,
      totalPlantios: plantios.length,
    };
  } catch (error) {
    console.error('Erro ao calcular stats:', error);
    return { lucroTotal: 0, totalReceita: 0, totalCustoProd: 0, totalDespesas: 0, totalPlantios: 0 };
  }
};
