import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('telas operacionais preservadas não expõem campo, talhão ou hidroponia', () => {
  const files = [
    'src/screens/Estufas/EstufasListScreen.tsx',
    'src/screens/Plantios/PlantioFormScreen.tsx',
    'src/screens/Colheitas/ColheitaFormScreen.tsx',
    'src/screens/Vendas/VendasListScreen.tsx',
    'src/screens/Financeiro/RelatoriosScreen.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /\bCampo\b|\bTalhão\b|hidroponia/i, file);
  }
});

test('contratos históricos permanecem fora da superfície operacional', () => {
  const domain = read('src/types/domain.ts');
  const supabase = read('src/types/supabase.ts');
  assert.match(domain, /Talhao|talhaoId/);
  assert.match(supabase, /talhoes|hidro_/);
});
