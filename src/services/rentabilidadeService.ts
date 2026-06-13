import { getPlantioById } from './plantioService';
import { listVendasByPlantio } from './vendaService';
import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';

export interface RentabilidadeResult {
  receitaTotal: number;
  custoInsumos: number;
  custoDespesas: number;
  custoMuda: number;
  custoTotal: number;
  lucroBruto: number;
  areaM2: number;
  rendimentoM2: number;
}

const isInitialInvestmentExpense = (row: any) => {
  const tipo = String(row?.tipo_gasto ?? row?.tipoGasto ?? '').toLowerCase().trim();
  return tipo === 'investimento_inicial';
};

export interface RentabilidadeInput {
  plantio: any;
  vendas: any[];
  despesas: any[];
  estufaAreaM2: number;
}

export const computeRentabilidade = (input: RentabilidadeInput): RentabilidadeResult => {
  const { plantio, vendas, despesas, estufaAreaM2 } = input;

  const receitaTotal = vendas.reduce((total, venda) => {
    if (String(venda.statusPagamento || venda.status_pagamento || '').toLowerCase() === 'cancelado') return total;
    const item = venda.itens?.[0] || venda.venda_itens?.[0];
    const fallbackTotal = Number(item?.quantidade || 0) * Number(item?.valorUnitario || item?.valor_unitario || 0);
    return total + Number(venda.valorTotal || venda.valor_total || fallbackTotal || 0);
  }, 0);

  const custoMuda = Number(plantio.custoEstimadoInicial || plantio.custo_estimado_inicial || 0);
  const custoInsumos = Math.max(0, Number(plantio.custoAcumulado || plantio.custo_total || 0) - custoMuda);

  const custoDespesas = despesas
    .filter((despesa: any) => !isInitialInvestmentExpense(despesa))
    .reduce((total, despesa: any) => total + Number(despesa.valor || 0), 0);

  const custoTotal = custoInsumos + custoDespesas;
  const lucroBruto = receitaTotal - custoTotal;

  const areaProporcional = estufaAreaM2 * (Number(plantio.ocupacaoEstimada || plantio.ocupacao_estimada || 100) / 100);
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
