import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('navegação operacional inicia no fluxo de estufas', () => {
  const tabs = read('src/navigation/MainTabsNavigator.tsx');
  const stack = read('src/navigation/AppStackNavigator.tsx');
  const config = read('src/navigation/rootNavigatorConfig.ts');

  assert.match(tabs, /EstufasListScreen/);
  assert.doesNotMatch(tabs, /CampoHubScreen/);
  assert.doesNotMatch(stack, /TalhoesList|TalhaoForm|CampoVendaForm/);
  assert.doesNotMatch(config, /activeMode\s*===\s*['"]campo['"]|Campo/);
});

test('rotas removidas não são expostas mesmo quando dados históricos existem', () => {
  const types = read('src/navigation/types.ts');
  const stack = read('src/navigation/AppStackNavigator.tsx');

  assert.doesNotMatch(types, /TalhoesList|TalhaoForm|CampoVendaForm/);
  assert.doesNotMatch(stack, /TalhoesList|TalhaoForm|CampoVendaForm/);
});
