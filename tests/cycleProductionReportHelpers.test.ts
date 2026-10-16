import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCycleProductionSummary,
  getTotalPlantedUnits,
  getHarvestWeightBreakdown,
  LEGACY_BOX_NET_WEIGHT_KG,
} from '../src/services/cycleProductionReportHelpers.ts';

test('relatório usa os pesos bruto e líquido registrados na colheita', () => {
  const result = getHarvestWeightBreakdown({
    quantidade: 10,
    unidadeMedida: 'caixas',
    pesoBruto: 230,
    pesoLiquido: 208,
  });

  assert.equal(result.boxCount, 10);
  assert.equal(result.boxGrossWeightKg, 230);
  assert.equal(result.boxNetWeightKg, 208);
  assert.equal(result.totalNetWeightKg, 208);
  assert.equal(result.usesLegacyBoxEstimate, false);
});

test('colheita antiga sem peso líquido mantém estimativa compatível', () => {
  const result = getHarvestWeightBreakdown({
    quantidade: 3,
    unidade: 'cx',
  });

  assert.equal(result.boxNetWeightKg, 3 * LEGACY_BOX_NET_WEIGHT_KG);
  assert.equal(result.usesLegacyBoxEstimate, true);
});

test('peso livre considera colheita registrada diretamente em kg', () => {
  const result = getHarvestWeightBreakdown({
    quantidade: 18.5,
    unidadeMedida: 'kg',
  });

  assert.equal(result.boxCount, 0);
  assert.equal(result.looseWeightKg, 18.5);
  assert.equal(result.totalNetWeightKg, 18.5);
});

test('resumo do ciclo desconta a tara e calcula produtividade por pé', () => {
  const result = buildCycleProductionSummary({
    plantio: { quantidadePlantada: 100 },
    colheitas: [
      {
        quantidade: 10,
        unidadeMedida: 'caixas',
        pesoBruto: 230,
        pesoLiquido: 208,
      },
      { quantidade: 12, unidadeMedida: 'kg' },
    ],
    vendas: [
      {
        statusPagamento: 'pago',
        valorTotal: 300,
        itens: [{ quantidade: 10, unidade: 'caixas', valorUnitario: 30 }],
      },
    ],
  });

  assert.equal(result.totalHarvests, 2);
  assert.equal(result.totalBoxes, 10);
  assert.equal(result.boxGrossWeightKg, 230);
  assert.equal(result.boxTareWeightKg, 22);
  assert.equal(result.boxNetWeightKg, 208);
  assert.equal(result.totalNetWeightKg, 220);
  assert.equal(result.kgPerPlanted, 2.2);
  assert.equal(result.boxesPerPlanted, 0.1);
  assert.equal(result.averageNetWeightPerBox, 20.8);
  assert.equal(result.averageBoxSalePrice, 30);
  assert.equal(result.totalReceived, 300);
});

test('resumo ignora venda cancelada e usa bandejas como total plantado', () => {
  const result = buildCycleProductionSummary({
    plantio: { quantidadeBandejas: 4, mudasPorBandeja: 25 },
    colheitas: [{ quantidade: 50, unidadeMedida: 'kg' }],
    vendas: [
      { status_pagamento: 'cancelado', valor_total: 900 },
      { status_pagamento: 'pendente', valor_total: 250 },
    ],
  });

  assert.equal(getTotalPlantedUnits({ quantidadeBandejas: 4, mudasPorBandeja: 25 }), 100);
  assert.equal(result.totalPlanted, 100);
  assert.equal(result.kgPerPlanted, 0.5);
  assert.equal(result.totalSales, 1);
  assert.equal(result.totalRevenue, 250);
  assert.equal(result.totalReceived, 0);
  assert.equal(result.totalPending, 250);
});
