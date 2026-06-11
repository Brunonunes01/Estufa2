import test from 'node:test';
import assert from 'node:assert/strict';

import { assertTenantId } from '../src/services/tenantGuard.ts';

test('assertTenantId trims valid ids', () => {
  assert.equal(assertTenantId(' tenant-1 '), 'tenant-1');
});

test('assertTenantId rejects empty ids', () => {
  assert.throws(() => assertTenantId('  '), /Tenant inv/i);
});
