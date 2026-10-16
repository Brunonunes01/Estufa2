import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const readProjectFile = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

test('venda agricola oferece caixa, kg, unidade e demais unidades', () => {
  const source = readProjectFile(
    '../src/screens/Colheitas/colheitaFormUtils.ts'
  );
  for (const unit of [
    'caixas',
    'kg',
    'un',
    'ma.os',
    'sacas',
    'duzias',
    'ton',
  ]) {
    assert.match(source, new RegExp(`value: '${unit}'`));
  }
});

test('servico de venda nao mantem guarda especial de unidade hidroponica', () => {
  const source = readProjectFile('../src/services/vendaService.ts');
  assert.doesNotMatch(source, /isHydroSale/);
  assert.doesNotMatch(source, /previousUnidade/);
});
