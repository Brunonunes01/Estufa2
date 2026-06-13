import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRentabilidade } from '../src/services/rentabilidadeService.ts';

test('computeRentabilidade - lucro positivo com todos os campos', () => {
  const result = computeRentabilidade({
    plantio: {
      custo_estimado_inicial: 50,
      custo_total: 150, // 50 muda + 100 insumos
      ocupacao_estimada: 100
    },
    vendas: [
      { valor_total: 500, status_pagamento: 'pago' }
    ],
    despesas: [
      { valor: 50, tipo_gasto: 'energia' }
    ],
    estufaAreaM2: 100
  });

  assert.equal(result.receitaTotal, 500);
  assert.equal(result.custoMuda, 50);
  assert.equal(result.custoInsumos, 100);
  assert.equal(result.custoDespesas, 50);
  assert.equal(result.custoTotal, 150); // Insumos (100) + Despesas (50)
  assert.equal(result.lucroBruto, 350); // 500 - 150
  assert.equal(result.areaM2, 100);
  assert.equal(result.rendimentoM2, 5); // 500 / 100
});

test('computeRentabilidade - ignora vendas canceladas', () => {
  const result = computeRentabilidade({
    plantio: { custo_total: 0, ocupacao_estimada: 100 },
    vendas: [
      { valor_total: 500, status_pagamento: 'cancelado' },
      { valor_total: 200, status_pagamento: 'pago' }
    ],
    despesas: [],
    estufaAreaM2: 100
  });

  assert.equal(result.receitaTotal, 200);
});

test('computeRentabilidade - lucro negativo (prejuízo)', () => {
  const result = computeRentabilidade({
    plantio: { custo_total: 1000, ocupacao_estimada: 100 },
    vendas: [{ valor_total: 500, status_pagamento: 'pago' }],
    despesas: [],
    estufaAreaM2: 100
  });

  assert.equal(result.lucroBruto, -500);
});

test('computeRentabilidade - rendimento por m2 proporcional', () => {
  const result = computeRentabilidade({
    plantio: { custo_total: 0, ocupacao_estimada: 50 }, // Usa apenas metade da estufa
    vendas: [{ valor_total: 1000, status_pagamento: 'pago' }],
    despesas: [],
    estufaAreaM2: 100
  });

  assert.equal(result.areaM2, 50);
  assert.equal(result.rendimentoM2, 20); // 1000 / 50
});
