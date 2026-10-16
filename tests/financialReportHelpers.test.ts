import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFinancialReportStats,
  getSaleReceivedValue,
} from '../src/services/financialReportHelpers.ts';

test('relatório separa vendido, recebido real e a receber', () => {
  const stats = buildFinancialReportStats(
    [
      {
        statusPagamento: 'pago',
        valorTotal: 150,
        valorRecebido: 135,
      },
      { statusPagamento: 'pendente', valorTotal: 80 },
      { statusPagamento: 'cancelado', valorTotal: 50 },
    ],
    [
      { statusPagamento: 'pago', valor: 40 },
      { statusPagamento: 'pendente', valor: 25 },
      {
        statusPagamento: 'pago',
        valor: 500,
        tipoGasto: 'investimento_inicial',
      },
    ]
  );

  assert.equal(stats.totalVendido, 230);
  assert.equal(stats.totalRecebido, 135);
  assert.equal(stats.totalReceber, 80);
  assert.equal(stats.ajusteRecebimentos, -15);
  assert.equal(stats.despesaPaga, 40);
  assert.equal(stats.despesaComprometida, 65);
  assert.equal(stats.resultadoRealizado, 95);
  assert.equal(stats.resultadoProjetado, 165);
});

test('venda antiga paga usa o valor combinado como recebido', () => {
  assert.equal(
    getSaleReceivedValue({ statusPagamento: 'pago', valorTotal: 90 }),
    90
  );
});

test('fechamento mensal pode receber vendas de outro período', () => {
  const stats = buildFinancialReportStats(
    [
      { statusPagamento: 'pendente', valorTotal: 120 },
      { statusPagamento: 'pago', valorTotal: 80, valorRecebido: 75 },
    ],
    [],
    [
      {
        statusPagamento: 'pago',
        valorTotal: 200,
        valorRecebido: 190,
      },
    ]
  );

  assert.equal(stats.totalVendido, 200);
  assert.equal(stats.totalReceber, 120);
  assert.equal(stats.totalRecebido, 190);
  assert.equal(stats.ajusteRecebimentos, -10);
});

test('fechamento mensal separa despesas lançadas de pagamentos efetuados', () => {
  const stats = buildFinancialReportStats(
    [],
    [
      { statusPagamento: 'pendente', valor: 120 },
      { statusPagamento: 'pago', valor: 80 },
    ],
    [],
    [{ statusPagamento: 'pago', valor: 45 }]
  );

  assert.equal(stats.despesaComprometida, 200);
  assert.equal(stats.despesaPaga, 45);
  assert.equal(stats.resultadoRealizado, -45);
});
