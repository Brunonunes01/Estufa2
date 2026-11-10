import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('módulos compartilhados continuam tenant-scoped e offline-capable', () => {
  const files = [
    'src/services/insumoService.ts',
    'src/services/aplicacaoService.ts',
    'src/services/manejoService.ts',
    'src/services/clienteService.ts',
    'src/services/fornecedorService.ts',
    'src/services/despesaService.ts',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /tenant_id|assertTenantId/);
    assert.match(source, /runOfflineWrite/);
  }
});

test('financeiro compartilhado classifica novos movimentos como estufa', () => {
  const source = read('src/services/caixaServiceHelpers.ts');
  assert.match(source, /return 'Estufa'/);
  assert.doesNotMatch(source, /return 'Campo'/);
});
