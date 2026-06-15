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

export interface RentabilidadeInput {
  plantio: {
    custoEstimadoInicial?: number | null;
    custo_estimado_inicial?: number | null;
    custoAcumulado?: number | null;
    custo_total?: number | null;
    ocupacaoEstimada?: number | null;
    ocupacao_estimada?: number | null;
  };
  vendas: Array<{
    statusPagamento?: string | null;
    status_pagamento?: string | null;
    valorTotal?: number | null;
    valor_total?: number | null;
    itens?: Array<{
      quantidade?: number | null;
      valorUnitario?: number | null;
      valor_unitario?: number | null;
    }> | null;
    venda_itens?: Array<{
      quantidade?: number | null;
      valorUnitario?: number | null;
      valor_unitario?: number | null;
    }> | null;
  }>;
  despesas: Array<{
    valor?: number | null;
    tipo_gasto?: string | null;
    tipoGasto?: string | null;
  }>;
  estufaAreaM2: number;
}

const isInitialInvestmentExpense = (row: RentabilidadeInput['despesas'][number]) => {
  const tipo = String(row?.tipo_gasto ?? row?.tipoGasto ?? '').toLowerCase().trim();
  return tipo === 'investimento_inicial';
};

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
    .filter((despesa) => !isInitialInvestmentExpense(despesa))
    .reduce((total, despesa) => total + Number(despesa.valor || 0), 0);

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
