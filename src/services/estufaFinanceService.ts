import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';
import { calculateRentabilidadeByPlantio } from './rentabilidadeService';

export interface EstufaPerformance {
  estufaId: string;
  nome: string;
  receitaTotal: number;
  custoTotal: number;
  lucroAcumulado: number;
  roi: number;
  plantiosContagem: number;
}

export const getEstufaPerformanceSummary = async (
  userId: string,
  estufaId: string
): Promise<EstufaPerformance> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();

  // 1. Buscar a estufa
  const { data: estufa, error: estufaError } = await supabase
    .from('estufas')
    .select('nome, area_m2')
    .eq('id', estufaId)
    .eq('tenant_id', tenantId)
    .single();

  if (estufaError || !estufa) throw new Error('Estufa não encontrada.');

  // 2. Buscar todos os plantios desta estufa
  const { data: plantios, error: plantiosError } = await supabase
    .from('plantios')
    .select('id')
    .eq('estufa_id', estufaId)
    .eq('tenant_id', tenantId);

  if (plantiosError) throw new Error('Erro ao buscar plantios da estufa.');

  let receitaTotal = 0;
  let custoTotal = 0;

  // 3. Calcular rentabilidade de cada plantio
  // Nota: Para grandes volumes, isso deve ser otimizado com uma query agregada ou tabela de resumo.
  const rentabilidades = await Promise.all(
    (plantios || []).map((p) =>
      calculateRentabilidadeByPlantio(userId, p.id, Number(estufa.area_m2 || 0))
    )
  );

  rentabilidades.forEach((r) => {
    receitaTotal += r.receitaTotal;
    custoTotal += r.custoTotal;
  });

  // 4. Rateio de Custos Fixos (Despesas sem estufa_id vinculada)
  // Buscamos todas as despesas globais e aplicamos o percentual desta estufa na área total
  const { data: totalAreaRes } = await supabase
    .from('estufas')
    .select('area_m2')
    .eq('tenant_id', tenantId);
  
  const areaTotalPropriedade = (totalAreaRes || []).reduce((acc, curr) => acc + Number(curr.area_m2 || 0), 0);
  const pesoEstufa = areaTotalPropriedade > 0 ? Number(estufa.area_m2 || 0) / areaTotalPropriedade : 0;

  const { data: despesasFixas } = await supabase
    .from('despesas')
    .select('valor')
    .eq('tenant_id', tenantId)
    .is('estufa_id', null)
    .is('plantio_id', null)
    .neq('tipo_gasto', 'investimento_inicial');

  const custoFixoRateado = (despesasFixas || []).reduce((acc, curr) => acc + (Number(curr.valor || 0) * pesoEstufa), 0);
  custoTotal += custoFixoRateado;

  const lucroAcumulado = receitaTotal - custoTotal;
  const roi = custoTotal > 0 ? (lucroAcumulado / custoTotal) * 100 : 0;

  return {
    estufaId,
    nome: estufa.nome,
    receitaTotal,
    custoTotal,
    lucroAcumulado,
    roi,
    plantiosContagem: (plantios || []).length,
  };
};

export const listAllEstufasPerformance = async (userId: string): Promise<EstufaPerformance[]> => {
  const tenantId = assertTenantId(userId);
  const supabase = getSupabaseClient();

  const { data: estufas, error } = await supabase
    .from('estufas')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  if (error) throw new Error('Erro ao listar estufas.');

  return Promise.all(estufas.map((e) => getEstufaPerformanceSummary(userId, e.id)));
};
