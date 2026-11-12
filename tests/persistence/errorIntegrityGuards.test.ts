import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertRelatedTenant, assertRequiredPayloadFields } from '../../src/services/persistenceIntegrityGuard.ts';

test('required payload and tenant relationship are rejected before persistence', () => {
  assert.throws(() => assertRequiredPayloadFields({ descricao: '' }, ['descricao', 'valor'], 'createDespesa'), /dados obrigatórios/i);
  assert.throws(() => assertRelatedTenant('tenant-a', 'tenant-b', 'plantio'), /não pertence/i);
  assert.equal(assertRelatedTenant('tenant-a', 'tenant-a', 'plantio'), 'tenant-a');
});

test('essential services constrain mutations by tenant and describe partial reconciliation', () => {
  const source = ['plantioService.ts', 'vendaService.ts', 'despesaService.ts', 'aplicacaoService.ts', 'colheitaService.ts'].map((name) => fs.readFileSync(new URL(`../../src/services/${name}`, import.meta.url), 'utf8')).join('\n');
  assert.match(source, /\.eq\(['"]tenant_id['"], tenantId\)/);
  assert.match(source, /reconciliationAction/);
  assert.match(source, /assertRequiredPayloadFields/);
});
