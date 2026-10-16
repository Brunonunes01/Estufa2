import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCaixaMovimentos,
  filterCaixaMovimentos,
  summarizeCaixaMovimentos,
  summarizeCaixaPorPessoa,
} from '../src/services/caixaServiceHelpers.ts';

const from = new Date('2026-07-01T00:00:00.000Z');
const to = new Date('2026-07-31T23:59:59.999Z');

test('buildCaixaMovimentos detalha compras e vincula entrada ao caixa da pessoa', () => {
  const movimentos = buildCaixaMovimentos({
    vendas: [
      {
        id: 'venda-1',
        statusPagamento: 'pago',
        dataVenda: new Date('2026-07-10T12:00:00.000Z'),
        dataRecebimento: new Date('2026-07-20T15:30:00.000Z'),
        pagamentoPara: 'pessoa-1',
        clienteId: 'cliente-1',
        valorTotal: 75,
        valorRecebido: 70,
        metodoPagamento: 'pix',
        itens: [
          {
            descricao: 'Alface',
            quantidade: 10,
            unidade: 'un',
            valorUnitario: 5,
          },
          {
            descricao: 'Rucula',
            quantidade: 5,
            unidade: 'maco',
            valorUnitario: 5,
          },
        ],
      },
      {
        id: 'venda-pendente',
        statusPagamento: 'pendente',
        dataVenda: new Date('2026-07-11T12:00:00.000Z'),
        valorTotal: 100,
      },
    ],
    despesas: [],
    pessoas: [{ id: 'pessoa-1', nome: 'Maria' }],
    clientes: [{ id: 'cliente-1', nome: 'Mercado Central' }],
    from,
    to,
  });

  assert.equal(movimentos.length, 1);
  assert.equal(movimentos[0].caixaPessoaNome, 'Maria');
  assert.equal(movimentos[0].clienteNome, 'Mercado Central');
  assert.equal(movimentos[0].valor, 70);
  assert.equal(movimentos[0].data.toISOString(), '2026-07-20T15:30:00.000Z');
  assert.equal(
    movimentos[0].dataVenda?.toISOString(),
    '2026-07-10T12:00:00.000Z'
  );
  assert.equal(
    movimentos[0].dataRecebimento?.toISOString(),
    '2026-07-20T15:30:00.000Z'
  );
  assert.equal(movimentos[0].valorCombinado, 75);
  assert.equal(movimentos[0].valorRecebido, 70);
  assert.equal(movimentos[0].origemProducao, 'Estufa');
  assert.equal(movimentos[0].itens.length, 2);
  assert.deepEqual(movimentos[0].itens[0], {
    descricao: 'Alface',
    quantidade: 10,
    unidade: 'un',
    valorUnitario: 5,
    valorTotal: 50,
  });
});

test('resumos do caixa contam compras, saidas, saldo e ticket medio por pessoa', () => {
  const movimentos = buildCaixaMovimentos({
    vendas: [
      {
        id: 'venda-1',
        statusPagamento: 'pago',
        dataVenda: new Date('2026-07-10T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        valorTotal: 60,
      },
      {
        id: 'venda-2',
        statusPagamento: 'pago',
        dataVenda: new Date('2026-07-11T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        valorTotal: 40,
      },
    ],
    despesas: [
      {
        id: 'despesa-1',
        statusPagamento: 'pago',
        dataDespesa: new Date('2026-06-12T12:00:00.000Z'),
        dataPagamento: new Date('2026-07-12T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        descricao: 'Combustivel',
        valor: 25,
      },
    ],
    pessoas: [{ id: 'pessoa-1', nome: 'Maria' }],
    clientes: [],
    from,
    to,
  });

  assert.deepEqual(summarizeCaixaMovimentos(movimentos), {
    entradas: 100,
    saidas: 25,
    saldo: 75,
    quantidadeEntradas: 2,
    quantidadeSaidas: 1,
    entradasPrevistas: 0,
    quantidadeEntradasPrevistas: 0,
  });

  const [maria] = summarizeCaixaPorPessoa(movimentos);
  assert.equal(maria.quantidadeEntradas, 2);
  assert.equal(maria.quantidadeSaidas, 1);
  assert.equal(maria.ticketMedioEntradas, 50);
  assert.equal(maria.saldo, 75);
  const saida = movimentos.find((movimento) => movimento.tipo === 'saida');
  assert.equal(saida?.data.toISOString(), '2026-07-12T12:00:00.000Z');
});

test('filterCaixaMovimentos encontra compra pelo nome de qualquer item', () => {
  const movimentos = buildCaixaMovimentos({
    vendas: [
      {
        id: 'venda-1',
        statusPagamento: 'pago',
        dataVenda: new Date('2026-07-10T12:00:00.000Z'),
        pagamentoPara: 'pessoa-1',
        valorTotal: 75,
        itens: [
          {
            descricao: 'Alface',
            quantidade: 10,
            unidade: 'un',
            valorUnitario: 5,
          },
          {
            descricao: 'Rucula',
            quantidade: 5,
            unidade: 'maco',
            valorUnitario: 5,
          },
        ],
      },
    ],
    despesas: [],
    pessoas: [{ id: 'pessoa-1', nome: 'Maria' }],
    clientes: [],
    from,
    to,
  });

  assert.equal(
    filterCaixaMovimentos(movimentos, { busca: 'rucula' }).length,
    1
  );
  assert.equal(
    filterCaixaMovimentos(movimentos, { busca: 'tomate' }).length,
    0
  );
  assert.equal(
    filterCaixaMovimentos(movimentos, { caixaPessoaId: 'outra-pessoa' }).length,
    0
  );
});

test('cheque pendente aparece como previsto sem aumentar o saldo do caixa', () => {
  const movimentos = buildCaixaMovimentos({
    vendas: [
      {
        id: 'cheque-1',
        statusPagamento: 'pendente',
        metodoPagamento: 'cheque',
        dataVenda: new Date('2026-07-10T12:00:00.000Z'),
        dataCompensacaoCheque: new Date('2026-08-05T12:00:00.000Z'),
        clienteId: 'cliente-1',
        valorTotal: 250,
      },
    ],
    despesas: [],
    pessoas: [],
    clientes: [{ id: 'cliente-1', nome: 'Mercado Central' }],
    from,
    to,
    includePendingOutsideRange: true,
  });

  assert.equal(movimentos.length, 1);
  assert.equal(movimentos[0].status, 'previsto');
  assert.equal(movimentos[0].statusFinanceiro, 'aguardando_compensacao');
  assert.equal(
    movimentos[0].dataCompensacaoCheque?.toISOString(),
    '2026-08-05T12:00:00.000Z'
  );
  assert.equal(movimentos[0].dentroDoPeriodo, false);
  assert.equal(movimentos[0].data.toISOString(), '2026-08-05T12:00:00.000Z');
  assert.deepEqual(summarizeCaixaMovimentos(movimentos), {
    entradas: 0,
    saidas: 0,
    saldo: 0,
    quantidadeEntradas: 0,
    quantidadeSaidas: 0,
    entradasPrevistas: 250,
    quantidadeEntradasPrevistas: 1,
  });
  assert.deepEqual(summarizeCaixaPorPessoa(movimentos), []);
});
