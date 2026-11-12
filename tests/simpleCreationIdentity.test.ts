import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('simple agricultural and commercial creations propagate stable logical ids', () => {
  const files = ['estufaService.ts', 'plantioService.ts', 'insumoService.ts', 'manejoService.ts', 'tarefaAgricolaService.ts', 'clienteService.ts', 'fornecedorService.ts', 'despesaService.ts', 'caixaPessoaService.ts'];
  for (const file of files) {
    const source = fs.readFileSync(new URL(`../src/services/${file}`, import.meta.url), 'utf8');
    assert.match(source, /logicalOperationId/, file);
    assert.match(source, /id:\s*logicalOperationId/, file);
  }
});
