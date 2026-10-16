import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVendasStats,
  getSaleStatusBadgeLabel,
  getVendaValorRecebido,
  matchesFinanceView,
  resolveVendaDeletionTarget,
} from '../src/screens/Vendas/vendasListUtils.ts';
import {
  matchesDespesaProductionMode,
  matchesPlantioProductionMode,
  matchesVendaProductionMode,
} from '../src/services/financeProductionScope.ts';

test('venda paga mostra o metodo junto ao status principal', () => {
  assert.equal(getSaleStatusBadgeLabel('pago', 'pix'), 'PAGO • PIX');
  assert.equal(getSaleStatusBadgeLabel('pago', 'dinheiro'), 'PAGO • DINHEIRO');
  assert.equal(getSaleStatusBadgeLabel('pendente', 'cheque'), 'PENDENTE');
  assert.equal(getSaleStatusBadgeLabel('pago'), 'PAGO');
});

test('exclusao usa a colheita vinculada e aceita vendas antigas sem vinculo', () => {
  assert.deepEqual(
    resolveVendaDeletionTarget({ id: 'venda-1', colheitaId: 'colheita-1' }),
    { type: 'colheita', id: 'colheita-1' }
  );
  assert.deepEqual(resolveVendaDeletionTarget({ id: 'venda-antiga' }), {
    type: 'venda',
    id: 'venda-antiga',
  });
  assert.equal(resolveVendaDeletionTarget({}), null);
});

test('filtros financeiros separam pendencias, cheques e recebidas', () => {
  const prazo = { statusPagamento: 'pendente', metodoPagamento: 'prazo' };
  const cheque = { statusPagamento: 'pendente', metodoPagamento: 'cheque' };
  const recebida = { statusPagamento: 'pago', metodoPagamento: 'pix' };

  assert.equal(matchesFinanceView(prazo, 'receber'), true);
  assert.equal(matchesFinanceView(cheque, 'receber'), true);
  assert.equal(matchesFinanceView(cheque, 'cheques'), true);
  assert.equal(matchesFinanceView(prazo, 'cheques'), false);
  assert.equal(matchesFinanceView(recebida, 'recebidas'), true);
  assert.equal(matchesFinanceView(recebida, 'receber'), false);
  assert.equal(matchesFinanceView(prazo, 'todos'), true);
});

test('total recebido usa o valor pago sem alterar o valor combinado', () => {
  const venda = {
    statusPagamento: 'pago',
    metodoPagamento: 'pix',
    valorTotal: 150,
    valorRecebido: 135,
    quantidade: 10,
    unidade: 'un',
  };

  assert.equal(getVendaValorRecebido(venda), 135);
  assert.deepEqual(
    {
      totalVendido: buildVendasStats([venda]).totalValor,
      totalRecebido: buildVendasStats([venda]).totalRecebido,
    },
    { totalVendido: 150, totalRecebido: 135 }
  );
});

test('venda antiga sem valor pago usa o valor combinado como fallback', () => {
  assert.equal(
    getVendaValorRecebido({ statusPagamento: 'pago', valorTotal: 80 }),
    80
  );
});

test('financeiro do Campo exclui vendas de Estufa', () => {
  const campo = { talhaoId: 'talhao-1' };
  const estufa = { estufaId: 'estufa-1' };

  assert.equal(matchesVendaProductionMode(campo, 'campo'), true);
  assert.equal(matchesVendaProductionMode(estufa, 'campo'), false);
  assert.equal(matchesVendaProductionMode(estufa, 'ciclo_longo'), true);
  assert.equal(
    matchesVendaProductionMode(
      { plantioId: 'campo-antigo' },
      'campo',
      { 'campo-antigo': { talhaoId: 'talhao-1' } }
    ),
    true
  );
});

test('ciclos financeiros respeitam a origem ativa', () => {
  assert.equal(
    matchesPlantioProductionMode({ talhaoId: 'talhao-1' }, 'campo'),
    true
  );
  assert.equal(
    matchesPlantioProductionMode({ estufaId: 'estufa-1' }, 'campo'),
    false
  );
  assert.equal(
    matchesPlantioProductionMode({ estufaId: 'estufa-1' }, 'ciclo_longo'),
    true
  );
});

test('despesas de Estufa não entram no financeiro do Campo', () => {
  const plantios = {
    campo: { talhaoId: 'talhao-1' },
    estufa: { estufaId: 'estufa-1' },
  };

  assert.equal(
    matchesDespesaProductionMode({ plantioId: 'campo' }, 'campo', plantios),
    true
  );
  assert.equal(
    matchesDespesaProductionMode(
      { plantioId: 'estufa', estufaId: 'estufa-1' },
      'campo',
      plantios
    ),
    false
  );
  assert.equal(
    matchesDespesaProductionMode({ estufaId: 'estufa-1' }, 'campo', plantios),
    false
  );
  assert.equal(matchesDespesaProductionMode({}, 'campo', plantios), true);
});
