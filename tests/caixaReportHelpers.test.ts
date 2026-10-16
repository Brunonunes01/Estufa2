import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeCaixaReport } from '../src/services/caixaReportHelpers.ts';
import { buildCaixaMovimentos } from '../src/services/caixaServiceHelpers.ts';

test('relatório do caixa soma caixas e separa recebimentos de cheques previstos', () => {
  const movimentos = buildCaixaMovimentos({
    vendas: [
      {
        id: 'venda-pix',
        statusPagamento: 'pago',
        dataVenda: new Date('2026-07-05T12:00:00.000Z'),
        dataRecebimento: new Date('2026-07-06T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        metodoPagamento: 'pix',
        valorTotal: 200,
        valorRecebido: 195,
        itens: [
          {
            descricao: 'Alface',
            quantidade: 10,
            unidade: 'caixas',
            valorUnitario: 20,
          },
        ],
      },
      {
        id: 'venda-cheque',
        statusPagamento: 'pendente',
        dataVenda: new Date('2026-07-08T12:00:00.000Z'),
        dataCompensacaoCheque: new Date('2026-07-20T12:00:00.000Z'),
        metodoPagamento: 'cheque',
        valorTotal: 150,
        itens: [
          {
            descricao: 'Rúcula',
            quantidade: 5,
            unidade: 'cx',
            valorUnitario: 30,
          },
        ],
      },
    ],
    despesas: [
      {
        id: 'despesa-1',
        statusPagamento: 'pago',
        dataDespesa: new Date('2026-07-10T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        descricao: 'Combustível',
        valor: 40,
      },
    ],
    pessoas: [{ id: 'pessoa-1', nome: 'Maria' }],
    clientes: [],
    from: new Date('2026-07-01T00:00:00.000Z'),
    to: new Date('2026-07-31T23:59:59.999Z'),
  });

  const stats = summarizeCaixaReport(movimentos);

  assert.equal(stats.vendasConfirmadas, 1);
  assert.equal(stats.vendasPrevistas, 1);
  assert.equal(stats.despesasConfirmadas, 1);
  assert.equal(stats.totalCaixas, 15);
  assert.deepEqual(stats.quantidadesPorUnidade, [
    { unidade: 'caixas', quantidade: 15 },
  ]);
  assert.deepEqual(stats.pagamentos, [
    { metodo: 'CHEQUE', quantidade: 1, confirmado: 0, previsto: 150 },
    { metodo: 'PIX', quantidade: 1, confirmado: 195, previsto: 0 },
  ]);
});
