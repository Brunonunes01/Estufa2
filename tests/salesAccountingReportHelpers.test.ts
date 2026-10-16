import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSalesAccountingClientSummaries,
  buildSalesAccountingInsights,
  getAccountingStatusLabel,
} from '../src/services/salesAccountingReportHelpers.ts';

test('relatório contábil separa combinado, recebido real e pendências', () => {
  const insights = buildSalesAccountingInsights({
    itens: [
      {
        cliente: 'Mercado A',
        status: 'PAGO',
        valorTotal: 150,
        valorRecebido: 140,
      },
      { cliente: 'Mercado A', status: 'PENDENTE', valorTotal: 80 },
      { cliente: 'Mercado B', status: 'CANCELADO', valorTotal: 200 },
    ],
  });

  assert.equal(insights.totalGeral, 230);
  assert.equal(insights.totalPago, 140);
  assert.equal(insights.totalPendente, 80);
  assert.equal(insights.totalCancelado, 200);
  assert.equal(insights.ajusteRecebimentos, -10);
  assert.equal(insights.totalClientes, 2);
});

test('conciliação contábil agrupa os valores por cliente', () => {
  const groups = buildSalesAccountingClientSummaries([
    {
      cliente: 'Mercado A',
      status: 'PAGO',
      valorTotal: 100,
      valorRecebido: 95,
    },
    { cliente: 'Mercado A', status: 'PENDENTE', valorTotal: 40 },
    { cliente: 'Mercado B', status: 'PAGO', valorTotal: 60 },
  ]);

  assert.deepEqual(groups[0], {
    cliente: 'Mercado A',
    registros: 2,
    cancelados: 0,
    totalVendido: 140,
    totalRecebido: 95,
    totalPendente: 40,
    ajusteRecebimentos: -5,
  });
  assert.equal(groups[1].cliente, 'Mercado B');
});

test('cheque pendente mostra aguardando compensação antes da data prevista', () => {
  assert.equal(
    getAccountingStatusLabel(
      {
        status: 'PENDENTE',
        metodoPagamento: 'CHEQUE',
        dataCompensacaoCheque: new Date('2026-08-10T12:00:00-03:00'),
      },
      new Date('2026-08-05T12:00:00-03:00')
    ),
    'AGUARDANDO COMPENSAÇÃO'
  );
});

test('cheque não baixado mostra compensação atrasada depois da previsão', () => {
  assert.equal(
    getAccountingStatusLabel(
      {
        status: 'PENDENTE',
        metodoPagamento: 'cheque',
        dataCompensacaoCheque: new Date('2026-08-10T12:00:00-03:00'),
      },
      new Date('2026-08-11T12:00:00-03:00')
    ),
    'COMPENSAÇÃO ATRASADA'
  );
});

test('cheque baixado aparece como compensado', () => {
  assert.equal(
    getAccountingStatusLabel({
      status: 'PAGO',
      metodoPagamento: 'cheque',
      dataCompensacaoCheque: new Date('2026-08-10T12:00:00-03:00'),
    }),
    'COMPENSADO'
  );
});

test('cheque em mãos aparece separado sem virar recebido real', () => {
  const item = {
    status: 'PENDENTE',
    metodoPagamento: 'cheque',
    formaPagamento: 'cheque_em_maos',
    valorTotal: 120,
    valorRecebido: 120,
    valorChequeEmMaos: 120,
  };

  assert.equal(getAccountingStatusLabel(item), 'CHEQUE EM MÃOS');

  const insights = buildSalesAccountingInsights({ itens: [item] });
  assert.equal(insights.totalPago, 0);
  assert.equal(insights.totalPendente, 120);
  assert.equal(insights.totalChequeEmMaos, 120);
});
