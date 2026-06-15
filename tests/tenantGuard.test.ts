import test from 'node:test';
import assert from 'node:assert/strict';

import { assertSameTenantScope, assertTenantId, isTenantIdValid } from '../src/services/tenantGuard.ts';

test('assertTenantId trims valid ids', () => {
  assert.equal(assertTenantId(' tenant-1 '), 'tenant-1');
});

test('assertTenantId rejects empty ids', () => {
  assert.throws(() => assertTenantId('  '), /Tenant inv/i);
});

test('isTenantIdValid reconhece tenant valido', () => {
  assert.equal(isTenantIdValid(' tenant-1 '), true);
  assert.equal(isTenantIdValid('  '), false);
});

test('assertSameTenantScope aceita ids equivalentes e rejeita divergencia', () => {
  assert.equal(assertSameTenantScope(' tenant-1 ', 'tenant-1'), 'tenant-1');
  assert.throws(() => assertSameTenantScope('tenant-1', 'tenant-2'), /Escopo de tenant divergente/i);
});
