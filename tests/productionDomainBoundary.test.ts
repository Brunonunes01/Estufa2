import assert from 'node:assert/strict';
import test from 'node:test';
import { assertProductionOrigin, assertSameProductionScope, assertTenantScope } from '../src/lib/productionDomainRules.ts';

test('fronteira produtiva exige estufa e rejeita origem mista', () => {
  assert.doesNotThrow(() => assertProductionOrigin({ estufaId: 'e-1' }, 'Plantio'));
  assert.throws(() => assertProductionOrigin({ talhaoId: 't-1' }, 'Plantio'), /estufa|talhão/i);
  assert.throws(() => assertProductionOrigin({ estufaId: 'e-1', talhaoId: 't-1' }), /Campo e à Estufa/);
});

test('fronteira produtiva mantém tenant único', () => {
  assert.doesNotThrow(() => assertTenantScope('tenant-1', 'tenant-1'));
  assert.throws(() => assertTenantScope('tenant-2', 'tenant-1'), /tenant inválido/);
  assert.equal(assertSameProductionScope([{ tenantId: 'tenant-1' }, { tenantId: 'tenant-1' }]), 'tenant-1');
  assert.throws(() => assertSameProductionScope([{ tenantId: 'tenant-1' }, { tenantId: 'tenant-2' }]), /incompatíveis/);
});
