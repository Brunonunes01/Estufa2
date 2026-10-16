import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const servicePath = fileURLToPath(
  new URL('../src/services/receiptService.ts', import.meta.url)
);
const source = readFileSync(servicePath, 'utf8');
const modernStart = source.indexOf('export const shareSalesAccountingPdf =');
const modernEnd = source.indexOf(
  'export const shareCustomerSalesStatement',
  modernStart
);
const modernImplementation = source.slice(modernStart, modernEnd);
const customerStatementStart = source.indexOf(
  'export const shareCustomerSalesStatement'
);
const customerStatementEnd = source.indexOf(
  'export const shareCycleProductionPdf',
  customerStatementStart
);
const customerStatementImplementation = source.slice(
  customerStatementStart,
  customerStatementEnd
);

test('PDF contábil usa o gerador visual compartilhado dos relatórios atuais', () => {
  assert.ok(modernStart >= 0);
  assert.ok(modernEnd > modernStart);
  assert.match(modernImplementation, /wrapHtmlDocument\(/);
  assert.match(modernImplementation, /Conciliação por cliente/);
  assert.doesNotMatch(modernImplementation, /ESTUFA VERDE VIVO/);
});

test('PDF contábil exibe valores combinados, recebidos e pendentes', () => {
  assert.match(modernImplementation, /Vendido \/ combinado/);
  assert.match(modernImplementation, /Recebido de verdade/);
  assert.match(modernImplementation, /Cheque em mãos/);
  assert.match(modernImplementation, /valorChequeEmMaos/);
  assert.match(modernImplementation, /A receber/);
  assert.match(modernImplementation, /Diferença nas baixas/);
});

test('PDF contábil identifica a compensação prevista e o status do cheque', () => {
  assert.match(modernImplementation, /Compensação prevista/);
  assert.match(modernImplementation, /statusContabil/);
  assert.match(modernImplementation, /dataRecebimento/);
});

test('extrato do cliente não expõe dados internos do pagamento e local', () => {
  assert.ok(customerStatementStart >= 0);
  assert.ok(customerStatementEnd > customerStatementStart);
  assert.doesNotMatch(customerStatementImplementation, /RECEBIDO POR/);
  assert.doesNotMatch(customerStatementImplementation, /recebidoPor/);
  assert.doesNotMatch(customerStatementImplementation, />LOCAL</);
  assert.doesNotMatch(customerStatementImplementation, /v\.estufa/);
  assert.match(customerStatementImplementation, /VALOR\/CX/);
  assert.match(customerStatementImplementation, /v\.precoUnitario/);
});
