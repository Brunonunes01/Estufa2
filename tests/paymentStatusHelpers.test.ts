import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

import {
  CHEQUE_EM_MAOS_PAYMENT_MARKER,
  canConfirmVendaReceipt,
  deriveVendaPaymentStatus,
  isChequeEmMaosPayment,
  resolveVendaPaymentStatusForWrite,
} from '../src/services/paymentStatusHelpers.ts';

test('nova venda deriva pendência do método de pagamento', () => {
  assert.equal(deriveVendaPaymentStatus('cheque'), 'pendente');
  assert.equal(deriveVendaPaymentStatus(CHEQUE_EM_MAOS_PAYMENT_MARKER), 'pendente');
  assert.equal(deriveVendaPaymentStatus('prazo'), 'pendente');
  assert.equal(deriveVendaPaymentStatus('pix'), 'pago');
});

test('identifica cheque em mãos como marcador financeiro separado', () => {
  assert.equal(isChequeEmMaosPayment('cheque_em_maos'), true);
  assert.equal(isChequeEmMaosPayment('CHEQUE_EM_MAOS'), true);
  assert.equal(isChequeEmMaosPayment('cheque'), false);
});

test('edição preserva cheque já compensado como pago', () => {
  assert.equal(resolveVendaPaymentStatusForWrite('cheque', 'pago'), 'pago');
  assert.equal(
    resolveVendaPaymentStatusForWrite('prazo', 'atrasado'),
    'atrasado'
  );
});

test('baixa só pode partir de pendente ou atrasado', () => {
  assert.equal(canConfirmVendaReceipt('pendente'), true);
  assert.equal(canConfirmVendaReceipt('atrasado'), true);
  assert.equal(canConfirmVendaReceipt('pago'), false);
  assert.equal(canConfirmVendaReceipt('cancelado'), false);
});

test('serviço aplica guarda otimista na confirmação concorrente', () => {
  const servicePath = fileURLToPath(
    new URL('../src/services/vendaService.ts', import.meta.url)
  );
  const source = readFileSync(servicePath, 'utf8');
  assert.match(
    source,
    /\.in\('status_pagamento',\s*\['pendente',\s*'atrasado'\]\)[\s\S]+\.maybeSingle\(\)/
  );
});

test('serviço permite corrigir dados financeiros sem reabrir venda paga', () => {
  const servicePath = fileURLToPath(
    new URL('../src/services/vendaService.ts', import.meta.url)
  );
  const source = readFileSync(servicePath, 'utf8');
  assert.match(source, /export const updateVendaReceipt/);
  assert.match(
    source,
    /updateVendaReceipt[\s\S]+status_pagamento:\s*'pago'[\s\S]+metodo_pagamento:\s*metodoRecebimento[\s\S]+data_recebimento:\s*dataRecebimento/
  );
  assert.match(
    source,
    /updateVendaReceipt[\s\S]+\.eq\('status_pagamento',\s*'pago'\)/
  );
});

test('serviço remove recebimento e reabre a venda como pendente', () => {
  const servicePath = fileURLToPath(
    new URL('../src/services/vendaService.ts', import.meta.url)
  );
  const source = readFileSync(servicePath, 'utf8');
  assert.match(source, /export const removeVendaReceipt/);
  assert.match(
    source,
    /removeVendaReceipt[\s\S]+status_pagamento:\s*'pendente'[\s\S]+forma_pagamento:\s*null[\s\S]+metodo_pagamento:\s*null[\s\S]+data_recebimento:\s*null[\s\S]+data_compensacao_cheque:\s*null[\s\S]+valor_recebido:\s*null/
  );
  assert.match(
    source,
    /removeVendaReceipt[\s\S]+\.eq\('status_pagamento',\s*'pago'\)/
  );
});

test('serviço registra cheque em mãos sem dar baixa no caixa', () => {
  const servicePath = fileURLToPath(
    new URL('../src/services/vendaService.ts', import.meta.url)
  );
  const source = readFileSync(servicePath, 'utf8');
  assert.match(source, /export const markVendaChequeEmMaos/);
  assert.match(
    source,
    /markVendaChequeEmMaos[\s\S]+status_pagamento:\s*'pendente'[\s\S]+forma_pagamento:\s*CHEQUE_EM_MAOS_PAYMENT_MARKER[\s\S]+metodo_pagamento:\s*'cheque'[\s\S]+pagamento_para:\s*null/
  );
  assert.match(
    source,
    /markVendaChequeEmMaos[\s\S]+\.in\('status_pagamento',\s*\['pendente',\s*'atrasado'\]\)/
  );
});
