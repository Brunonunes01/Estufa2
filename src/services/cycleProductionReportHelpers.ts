export const LEGACY_BOX_NET_WEIGHT_KG = 22;

type HarvestWeightInput = {
  quantidade?: number | null;
  unidadeMedida?: string | null;
  unidade?: string | null;
  pesoBruto?: number | null;
  pesoLiquido?: number | null;
};

type PlantingInput = {
  quantidadePlantada?: number | null;
  quantidadeBandejas?: number | null;
  mudasPorBandeja?: number | null;
};

type SaleItemInput = {
  quantidade?: number | null;
  unidade?: string | null;
  valorUnitario?: number | null;
  valor_unitario?: number | null;
};

type SaleInput = {
  statusPagamento?: string | null;
  status_pagamento?: string | null;
  valorTotal?: number | null;
  valor_total?: number | null;
  valorRecebido?: number | null;
  valor_recebido?: number | null;
  itens?: SaleItemInput[] | null;
  venda_itens?: SaleItemInput[] | null;
};

const toNonNegativeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeUnit = (harvest: HarvestWeightInput) =>
  String(harvest.unidadeMedida || harvest.unidade || '')
    .trim()
    .toLowerCase();

export const isBoxHarvest = (harvest: HarvestWeightInput) =>
  ['caixas', 'caixa', 'cx'].includes(normalizeUnit(harvest));

export const isLooseKgHarvest = (harvest: HarvestWeightInput) =>
  ['kg', 'quilo', 'quilos'].includes(normalizeUnit(harvest));

export const getHarvestWeightBreakdown = (harvest: HarvestWeightInput) => {
  const quantity = toNonNegativeNumber(harvest.quantidade);
  const boxHarvest = isBoxHarvest(harvest);
  const boxCount = boxHarvest ? quantity : 0;
  const informedGrossWeight = boxHarvest
    ? toNonNegativeNumber(harvest.pesoBruto)
    : 0;
  const informedNetWeight = boxHarvest
    ? toNonNegativeNumber(harvest.pesoLiquido)
    : 0;
  const usesLegacyBoxEstimate =
    boxHarvest && boxCount > 0 && informedNetWeight <= 0;
  const boxNetWeightKg = usesLegacyBoxEstimate
    ? boxCount * LEGACY_BOX_NET_WEIGHT_KG
    : informedNetWeight;
  const looseWeightKg = isLooseKgHarvest(harvest) ? quantity : 0;

  return {
    boxCount,
    boxGrossWeightKg: informedGrossWeight,
    boxNetWeightKg,
    looseWeightKg,
    totalNetWeightKg: boxNetWeightKg + looseWeightKg,
    usesLegacyBoxEstimate,
  };
};

export const getTotalPlantedUnits = (planting: PlantingInput) => {
  const planted = toNonNegativeNumber(planting.quantidadePlantada);
  if (planted > 0) return planted;

  const trays = toNonNegativeNumber(planting.quantidadeBandejas);
  const plantsPerTray = toNonNegativeNumber(planting.mudasPorBandeja);
  return trays > 0 && plantsPerTray > 0 ? trays * plantsPerTray : 0;
};

const normalizeSaleUnit = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isBoxSaleUnit = (value?: string | null) =>
  ['caixa', 'caixas', 'cx'].includes(normalizeSaleUnit(value));

const getSaleItems = (sale: SaleInput) =>
  Array.isArray(sale.itens)
    ? sale.itens
    : Array.isArray(sale.venda_itens)
      ? sale.venda_itens
      : [];

const getSaleTotal = (sale: SaleInput) => {
  const informedTotal = toNonNegativeNumber(
    sale.valorTotal ?? sale.valor_total
  );
  if (informedTotal > 0) return informedTotal;

  return getSaleItems(sale).reduce(
    (total, item) =>
      total +
      toNonNegativeNumber(item.quantidade) *
        toNonNegativeNumber(item.valorUnitario ?? item.valor_unitario),
    0
  );
};

export const buildCycleProductionSummary = ({
  plantio,
  colheitas,
  vendas,
}: {
  plantio: PlantingInput;
  colheitas: HarvestWeightInput[];
  vendas: SaleInput[];
}) => {
  const harvestWeights = colheitas.map(getHarvestWeightBreakdown);
  const totalBoxes = harvestWeights.reduce(
    (total, item) => total + item.boxCount,
    0
  );
  const boxGrossWeightKg = harvestWeights.reduce(
    (total, item) => total + item.boxGrossWeightKg,
    0
  );
  const boxNetWeightKg = harvestWeights.reduce(
    (total, item) => total + item.boxNetWeightKg,
    0
  );
  const boxTareWeightKg = harvestWeights.reduce(
    (total, item) =>
      total +
      Math.max(0, item.boxGrossWeightKg - item.boxNetWeightKg),
    0
  );
  const looseWeightKg = harvestWeights.reduce(
    (total, item) => total + item.looseWeightKg,
    0
  );
  const totalNetWeightKg = boxNetWeightKg + looseWeightKg;
  const totalPlanted = getTotalPlantedUnits(plantio);
  const estimatedWeightRecords = harvestWeights.filter(
    (item) => item.usesLegacyBoxEstimate
  ).length;

  const validSales = vendas.filter(
    (sale) =>
      String(sale.statusPagamento ?? sale.status_pagamento ?? '')
        .trim()
        .toLowerCase() !== 'cancelado'
  );
  const totalRevenue = validSales.reduce(
    (total, sale) => total + getSaleTotal(sale),
    0
  );
  const totalReceived = validSales.reduce((total, sale) => {
    const received = toNonNegativeNumber(
      sale.valorRecebido ?? sale.valor_recebido
    );
    if (received > 0) return total + received;

    const status = String(
      sale.statusPagamento ?? sale.status_pagamento ?? ''
    )
      .trim()
      .toLowerCase();
    return status === 'pago' ? total + getSaleTotal(sale) : total;
  }, 0);

  let soldBoxes = 0;
  let boxSalesRevenue = 0;
  validSales.forEach((sale) => {
    getSaleItems(sale).forEach((item) => {
      if (!isBoxSaleUnit(item.unidade)) return;
      const quantity = toNonNegativeNumber(item.quantidade);
      soldBoxes += quantity;
      boxSalesRevenue +=
        quantity *
        toNonNegativeNumber(item.valorUnitario ?? item.valor_unitario);
    });
  });

  return {
    totalHarvests: colheitas.length,
    totalBoxes,
    boxGrossWeightKg,
    boxNetWeightKg,
    boxTareWeightKg,
    looseWeightKg,
    totalNetWeightKg,
    totalPlanted,
    boxesPerPlanted: totalPlanted > 0 ? totalBoxes / totalPlanted : 0,
    kgPerPlanted: totalPlanted > 0 ? totalNetWeightKg / totalPlanted : 0,
    averageNetWeightPerBox:
      totalBoxes > 0 ? boxNetWeightKg / totalBoxes : 0,
    estimatedWeightRecords,
    totalSales: validSales.length,
    totalRevenue,
    totalReceived,
    totalPending: Math.max(0, totalRevenue - totalReceived),
    averageTicket:
      validSales.length > 0 ? totalRevenue / validSales.length : 0,
    averageRevenuePerKg:
      totalNetWeightKg > 0 ? totalRevenue / totalNetWeightKg : 0,
    averageBoxSalePrice: soldBoxes > 0 ? boxSalesRevenue / soldBoxes : 0,
  };
};
