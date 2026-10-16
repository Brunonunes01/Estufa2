import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

import {
  defaultAppSettings,
  mergeAppSettings,
  normalizeAppSettings,
} from '../src/contexts/appSettingsHelpers.ts';

test('normalizeAppSettings retorna defaults quando storage esta vazio', () => {
  assert.deepEqual(normalizeAppSettings(null), defaultAppSettings);
});

test('normalizeAppSettings desativa modos antigos de producao', () => {
  const normalized = normalizeAppSettings(
    JSON.stringify({
      darkMode: true,
      notifyCritical: 'sim',
      productionProfiles: { legacyMode: true },
      uiV2Enabled: false,
    })
  );

  assert.deepEqual(normalized, {
    ...defaultAppSettings,
    darkMode: true,
    activeProductionMode: 'ciclo_longo',
    uiV2Enabled: false,
  });
});

test('mergeAppSettings mantem somente o modo de estufas habilitado', () => {
  const merged = mergeAppSettings(defaultAppSettings, {
    activeProductionMode: 'campo',
    notifyDailySummary: false,
  });

  assert.equal(
    merged.activeProductionMode,
    defaultAppSettings.activeProductionMode
  );
  assert.equal(merged.notifyDailySummary, false);
});

test('configuracoes nao oferece mais modos alternativos de producao', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL(
        '../src/screens/Configuracoes/SettingsScreen.tsx',
        import.meta.url
      )
    ),
    'utf8'
  );

  assert.doesNotMatch(source, /activeProductionMode:\s*'campo'/);
});
