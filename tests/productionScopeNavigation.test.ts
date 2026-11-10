import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('navigation remains limited to the approved production surface', () => {
  const source = readFileSync('src/navigation/AppStackNavigator.tsx', 'utf8');
  assert.doesNotMatch(source, /Campo|Talh[aã]o|Hidroponia|CampoVendaForm/i);
});
