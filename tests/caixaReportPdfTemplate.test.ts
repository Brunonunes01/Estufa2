import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const servicePath = fileURLToPath(
  new URL('../src/services/pdfService.ts', import.meta.url),
);
const source = readFileSync(servicePath, 'utf8');
const reportStart = source.indexOf('export const buildRelatorioCaixaHtml =');
const reportEnd = source.indexOf('export const gerarRelatorioCaixaPDF =');
const reportTemplate = source.slice(reportStart, reportEnd);

test('PDF detalhado do caixa inclui filtros e todas as informações das vendas', () => {
  assert.ok(reportStart >= 0);
  assert.ok(reportEnd > reportStart);
  assert.match(reportTemplate, /Relatório detalhado do caixa/);
  assert.match(reportTemplate, /Responsável do caixa/);
  assert.match(reportTemplate, /Produtos, caixas e valores unitários/);
  assert.match(reportTemplate, /valorCombinado/);
  assert.match(reportTemplate, /valorRecebido/);
  assert.match(reportTemplate, /clienteNome/);
});

test('PDF do caixa mostra data de compensação e estado do cheque', () => {
  assert.match(reportTemplate, /dataCompensacaoCheque/);
  assert.match(reportTemplate, /Compensação:/);
  assert.match(source, /AGUARDANDO COMPENSAÇÃO/);
});
