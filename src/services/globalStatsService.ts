import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';
import { computeGlobalStats } from './globalStatsHelpers.ts';

export interface GlobalStatsResult {
  lucroTotal: number;
  totalReceita: number;
  totalCustoProd: number;
  totalDespesas: number;
  totalPlantios: number;
  roiGeral: number;
  ticketMedioVenda: number;
}

export const getGlobalStats = async (userId: string): Promise<GlobalStatsResult> => {
  const tenantId = assertTenantId(userId);

  try {
    const supabase = getSupabaseClient();
    const [plantiosRes, vendasRes, despesasRes] = await Promise.all([
      supabase
        .from('plantios')
        .select('id, custo_acumulado, custo_total, custo_estimado_inicial')
        .eq('tenant_id', tenantId),
      supabase.from('vendas').select('id, valor_total').eq('tenant_id', tenantId).neq('status_pagamento', 'cancelado'),
      supabase.from('despesas').select('id, valor, tipo_gasto').eq('tenant_id', tenantId),
    ]);

    if (plantiosRes.error) throw plantiosRes.error;
    if (vendasRes.error) throw vendasRes.error;
    if (despesasRes.error) throw despesasRes.error;

    const plantios = plantiosRes.data || [];
    const vendas = vendasRes.data || [];
    const despesas = despesasRes.data || [];

    return computeGlobalStats(plantios, vendas, despesas);
  } catch (error: unknown) {
    console.error('Erro ao calcular stats:', error);
    return {
      lucroTotal: 0,
      totalReceita: 0,
      totalCustoProd: 0,
      totalDespesas: 0,
      totalPlantios: 0,
      roiGeral: 0,
      ticketMedioVenda: 0,
    };
  }
};
