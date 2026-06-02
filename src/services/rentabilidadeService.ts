import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';
import { collection, getDocs, query, where } from '../compat/legacyDataApi';
import { db } from './removedBackend';
import { Despesa } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

export interface RentabilidadeResult {
  receitaTotal: number;
  custoInsumos: number;
  custoDespesas: number;
  custoMuda: number; // Novo campo para informar o valor das mudas
  custoTotal: number;
  lucroBruto: number;
  areaM2: number;
  rendimentoM2: number;
}

const isInitialInvestmentExpense = (row: any) => {
  const tipo = String(row?.tipo_gasto ?? row?.tipoGasto ?? '').toLowerCase().trim();
  return tipo === 'investimento_inicial';
};

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
          .select('valor,tipo_gasto,status_pagamento')
          .eq('tenant_id', tenantId)
          .eq('plantio_id', plantioId);
        if (error) throw new Error(`Erro ao buscar despesas do plantio. ${error.message}`);
        return (data || []).map((row: any) => ({
          valor: Number(row.valor || 0),
          tipo_gasto: row.tipo_gasto || null,
          status_pagamento: row.status_pagamento || null,
        }));
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

  const receitaTotal = vendas.reduce((total, venda) => {
    if (String(venda.statusPagamento || '').toLowerCase() === 'cancelado') return total;
    const item = venda.itens?.[0];
    const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0);
    return total + Number(venda.valorTotal || fallbackTotal || 0);
  }, 0);
  
  const custoMuda = Number(plantio.custoEstimadoInicial || 0);
  // O custoAcumulado ja inclui o custo inicial. Subtraimos para ter apenas insumos/aplicacoes
  const custoInsumos = Math.max(0, Number(plantio.custoAcumulado || 0) - custoMuda);
  
  // Despesas operacionais do ciclo (excluindo investimento inicial que sao as mudas)
  const custoDespesas = despesas
    .filter((d: any) => !isInitialInvestmentExpense(d))
    .reduce((total, d: any) => total + Number(d.valor || 0), 0);
  
  // Custo Total agora EXCLUI as mudas conforme solicitado para o financeiro
  const custoTotal = custoInsumos + custoDespesas;
  const lucroBruto = receitaTotal - custoTotal;

  // Se o plantio tiver ocupacaoEstimada, usa a área proporcional para o rendimento/m2
  const areaProporcional = estufaAreaM2 * (Number(plantio.ocupacaoEstimada || 100) / 100);
  const rendimentoM2 = areaProporcional > 0 ? receitaTotal / areaProporcional : 0;

  return {
    receitaTotal,
    custoInsumos,
    custoDespesas,
    custoMuda,
    custoTotal,
    lucroBruto,
    areaM2: areaProporcional,
    rendimentoM2,
  };
};
