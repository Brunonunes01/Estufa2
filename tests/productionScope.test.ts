import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('modo produtivo ativo permanece restrito a estufas convencionais', () => {
  const settings = read('src/contexts/appSettingsHelpers.ts');
  const navigation = read('src/navigation/rootNavigatorConfig.ts');

  assert.match(settings, /ENABLED_PRODUCTION_MODE\s*=\s*'ciclo_longo'/);
  assert.doesNotMatch(settings, /activeProductionMode:\s*'campo'/);
  assert.doesNotMatch(navigation, /activeMode\s*===\s*'campo'/);
});

test('superfície ativa não oferece referências operacionais de campo ou hidroponia', () => {
  const mainTabs = read('src/navigation/MainTabsNavigator.tsx');
  const appStack = read('src/navigation/AppStackNavigator.tsx');
  const rootConfig = read('src/navigation/rootNavigatorConfig.ts');

  assert.doesNotMatch(mainTabs, /CampoHubScreen/);
  assert.doesNotMatch(appStack, /TalhoesList|TalhaoForm|CampoVendaForm/);
  assert.doesNotMatch(rootConfig, /qa-talhao|hidro|Campo/);
});

test('falhas reproduzíveis de origem removida são bloqueadas em novas escritas', () => {
  const guard = read('src/services/productionOriginGuard.ts');
  assert.match(guard, /assertGreenhouseProductionOrigin/);
  assert.match(guard, /não pode ser criado/);
});
