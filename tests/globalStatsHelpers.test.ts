import test from 'node:test';
import assert from 'node:assert/strict';

import { computeGlobalStats } from '../src/services/globalStatsHelpers.ts';

test('computeGlobalStats calcula lucro, roi e ticket medio', () => {
  const result = computeGlobalStats(
    [
      { custo_estimado_inicial: 100, custo_acumulado: 400 },
      { custo_estimado_inicial: 50, custo_total: 150 },
    ],
    [{ valor_total: 1000 }, { valor_total: 500 }],
    [{ valor: 200, tipo_gasto: 'operacional' }]
  );

  assert.equal(result.totalReceita, 1500);
  assert.equal(result.totalCustoProd, 400);
  assert.equal(result.totalDespesas, 200);
  assert.equal(result.lucroTotal, 900);
  assert.equal(result.totalPlantios, 2);
  assert.equal(result.ticketMedioVenda, 750);
  assert.equal(result.roiGeral, 150);
});

test('computeGlobalStats ignora investimento inicial e valores invalidos', () => {
  const result = computeGlobalStats(
    [{ custo_estimado_inicial: 100, custo_acumulado: 'abc' }],
    [{ valor_total: 'abc' }],
    [
      { valor: 300, tipo_gasto: 'investimento_inicial' },
      { valor: '50', tipo_gasto: 'operacional' },
    ]
  );

  assert.equal(result.totalReceita, 0);
  assert.equal(result.totalCustoProd, 0);
  assert.equal(result.totalDespesas, 50);
  assert.equal(result.lucroTotal, -50);
  assert.equal(result.roiGeral, -100);
});
