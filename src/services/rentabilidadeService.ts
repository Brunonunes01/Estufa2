import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';
import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';
import { computeRentabilidade, RentabilidadeResult } from './rentabilidadeCore';

export const calculateRentabilidadeByPlantio = async (
  userId: string,
  plantioId: string,
  estufaAreaM2: number
): Promise<RentabilidadeResult> => {
  const tenantId = assertTenantId(userId);

  const [plantio, vendas, despesas] = await Promise.all([
    getPlantioById(plantioId, tenantId),
    listVendasByPlantio(tenantId, plantioId),
    (async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('despesas')
        .select('valor,tipo_gasto,status_pagamento')
        .eq('tenant_id', tenantId)
        .eq('plantio_id', plantioId);
      if (error) throw new Error(`Erro ao buscar despesas do plantio. ${error.message}`);
      return (data || []).map((row: any) => ({
        valor: Number(row.valor || 0),
        tipo_gasto: row.tipo_gasto || null,
        status_pagamento: row.status_pagamento || null,
      }));
    })(),
  ]);

  if (!plantio) {
    throw new Error('Plantio não encontrado.');
  }

  return computeRentabilidade({
    plantio,
    vendas,
    despesas,
    estufaAreaM2,
  });
};
