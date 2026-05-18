import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';
import { collection, getDocs, query, where } from '../compat/firestore';
import { db } from './firebaseConfig';
import { Despesa } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

export interface RentabilidadeResult {
  receitaTotal: number;
  custoInsumos: number;
  custoDespesas: number;
  custoTotal: number;
  lucroBruto: number;
  areaM2: number;
  rendimentoM2: number;
}

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
      if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('despesas')
          .select('valor')
          .eq('tenant_id', tenantId)
          .eq('plantio_id', plantioId);
        if (error) throw new Error(`Erro ao buscar despesas do plantio. ${error.message}`);
        return (data || []).map((row: any) => ({ valor: Number(row.valor || 0) }));
      }

      const despesasSnap = await getDocs(
        query(
          collection(db, 'despesas'),
          where('tenantId', '==', tenantId),
          where('plantioId', '==', plantioId)
        )
      );
      return despesasSnap.docs.map((d) => d.data() as Despesa);
    })(),
  ]);

  if (!plantio) {
    throw new Error('Plantio não encontrado.');
  }

  const receitaTotal = vendas.reduce((total, venda) => total + Number(venda.valorTotal || 0), 0);
  
  const custoInsumos = Number(plantio.custoAcumulado || 0);
  const custoDespesas = despesas.reduce((total, d: any) => total + Number(d.valor || 0), 0);
  
  const custoTotal = custoInsumos + custoDespesas;
  const lucroBruto = receitaTotal - custoTotal;

  // Se o plantio tiver ocupacaoEstimada, usa a área proporcional para o rendimento/m2
  const areaProporcional = estufaAreaM2 * (Number(plantio.ocupacaoEstimada || 100) / 100);
  const rendimentoM2 = areaProporcional > 0 ? receitaTotal / areaProporcional : 0;

  return {
    receitaTotal,
    custoInsumos,
    custoDespesas,
    custoTotal,
    lucroBruto,
    areaM2: areaProporcional,
    rendimentoM2,
  };
};
