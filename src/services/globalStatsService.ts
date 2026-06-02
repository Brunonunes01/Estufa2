import { collection, getDocs, query, where } from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { Despesa, Plantio, Venda } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

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
    if (isSupabaseBackend()) {
      const supabase = getSupabaseClient();
      const [plantiosRes, vendasRes, despesasRes] = await Promise.all([
        supabase.from('plantios').select('id, custo_acumulado, custo_total, custo_estimado_inicial').eq('tenant_id', tenantId),
        supabase.from('vendas').select('id, valor_total').eq('tenant_id', tenantId),
        supabase.from('despesas').select('id, valor, tipo_gasto').eq('tenant_id', tenantId),
      ]);

      if (plantiosRes.error) throw plantiosRes.error;
      if (vendasRes.error) throw vendasRes.error;
      if (despesasRes.error) throw despesasRes.error;

      const plantios = plantiosRes.data || [];
      const vendas = vendasRes.data || [];
      const despesas = despesasRes.data || [];

      const totalReceita = vendas.reduce((acc, curr: any) => acc + Number(curr.valor_total || 0), 0);
      
      // Excluir custo de mudas do custo de produção conforme solicitado
      const totalCustoProd = plantios.reduce(
        (acc, curr: any) => {
            const custoMuda = Number(curr.custo_estimado_inicial || 0);
            const acumulado = Number(curr.custo_acumulado || curr.custo_total || 0);
            return acc + Math.max(0, acumulado - custoMuda);
        },
        0
      );

      // Excluir investimento inicial das despesas
      const totalDespesas = despesas
        .filter((d: any) => d.tipo_gasto !== 'investimento_inicial')
        .reduce((acc, curr: any) => acc + Number(curr.valor || 0), 0);

      return {
        lucroTotal: totalReceita - totalCustoProd - totalDespesas,
        totalReceita,
        totalCustoProd,
        totalDespesas,
        totalPlantios: plantios.length,
      };
    }

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
    
    // Excluir custo de mudas do custo de produção (Legacy)
    const totalCustoProd = plantios.reduce(
      (acc, curr) => {
          const custoMuda = Number(curr.custoEstimadoInicial || 0);
          const acumulado = Number(curr.custoAcumulado || curr.custoTotal || 0);
          return acc + Math.max(0, acumulado - custoMuda);
      },
      0
    );

    // Excluir investimento inicial das despesas (Legacy)
    const totalDespesas = despesas
      .filter(d => d.tipoGasto !== 'investimento_inicial')
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

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
