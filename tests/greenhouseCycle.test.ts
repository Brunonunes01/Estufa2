import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('ciclo de estufa mantém vínculos de estufa e tenant', () => {
  for (const source of ['src/services/plantioService.ts', 'src/services/colheitaService.ts', 'src/services/vendaService.ts'].map(read)) {
    assert.match(source, /tenant_id/); assert.match(source, /estufa/); assert.match(source, /assertGreenhouseProductionOrigin/);
  }
});

test('o formulário de plantio não oferece seleção de talhão', () => {
  const source = read('src/screens/Plantios/PlantioFormScreen.tsx');
  assert.doesNotMatch(source, /selectedTalhao|Talhão do ciclo|Novo talhão/);
  assert.match(source, /Estufa selecionada/);
});
