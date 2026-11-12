import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTenantOperation } from '../../src/services/tenantGuard.ts';

const owner = { canRead: true, canWrite: true, canDelete: true, canManageSharing: true };
const viewer = { canRead: true, canWrite: false, canDelete: false, canManageSharing: false };

for (const operation of ['read', 'write', 'delete', 'manageSharing'] as const) {
  test(`${operation} permits own tenant only when role grants it`, () => {
    const expected = operation === 'read';
    if (expected) assert.equal(assertTenantOperation({ expectedTenantId: 'tenant-a', receivedTenantId: 'tenant-a', access: viewer, operation }), 'tenant-a');
    else assert.throws(() => assertTenantOperation({ expectedTenantId: 'tenant-a', receivedTenantId: 'tenant-a', access: viewer, operation }), /Permissao insuficiente/i);
    assert.throws(() => assertTenantOperation({ expectedTenantId: 'tenant-a', receivedTenantId: 'tenant-b', access: owner, operation }), /Escopo de tenant divergente/i);
    assert.throws(() => assertTenantOperation({ expectedTenantId: '', receivedTenantId: 'tenant-a', access: owner, operation }), /Tenant invalido/i);
  });
}
