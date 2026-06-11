import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';

export interface GlobalStatsResult {
  lucroTotal: number;
  totalReceita: number;
  totalCustoProd: number;
  totalDespesas: number;
  totalPlantios: number;
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

    const totalCustoProd = plantios.reduce((acc, curr: any) => {
      const custoMuda = Number(curr.custo_estimado_inicial || 0);
      const acumulado = Number(curr.custo_acumulado || curr.custo_total || 0);
      return acc + Math.max(0, acumulado - custoMuda);
    }, 0);

    const totalDespesas = despesas
      .filter((item: any) => item.tipo_gasto !== 'investimento_inicial')
      .reduce((acc, curr: any) => acc + Number(curr.valor || 0), 0);

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
