type PlantioStatsRow = {
  custo_acumulado?: unknown;
  custo_total?: unknown;
  custo_estimado_inicial?: unknown;
};

type VendaStatsRow = {
  valor_total?: unknown;
};

type DespesaStatsRow = {
  valor?: unknown;
  tipo_gasto?: unknown;
};

const toSafeNumber = (value: unknown) => {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) ? normalized : 0;
};

export const computeGlobalStats = (
  plantios: PlantioStatsRow[],
  vendas: VendaStatsRow[],
  despesas: DespesaStatsRow[]
) => {
  const totalReceita = vendas.reduce((acc, curr) => acc + toSafeNumber(curr.valor_total), 0);

  const totalCustoProd = plantios.reduce((acc, curr) => {
    const custoMuda = toSafeNumber(curr.custo_estimado_inicial);
    const acumulado = toSafeNumber(curr.custo_acumulado || curr.custo_total);
    return acc + Math.max(0, acumulado - custoMuda);
  }, 0);

  const totalDespesas = despesas
    .filter((item) => item.tipo_gasto !== 'investimento_inicial')
    .reduce((acc, curr) => acc + toSafeNumber(curr.valor), 0);

  const lucroTotal = totalReceita - totalCustoProd - totalDespesas;
  const custoTotal = totalCustoProd + totalDespesas;
  const roiGeral = custoTotal > 0 ? (lucroTotal / custoTotal) * 100 : 0;
  const ticketMedioVenda = vendas.length > 0 ? totalReceita / vendas.length : 0;

  return {
    lucroTotal,
    totalReceita,
    totalCustoProd,
    totalDespesas,
    totalPlantios: plantios.length,
    roiGeral,
    ticketMedioVenda,
  };
};
