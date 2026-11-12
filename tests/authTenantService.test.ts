import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapMembershipsToAvailableTenants,
  resolveBootstrapRole,
  resolveTenantSelection,
} from '../src/services/authTenantHelpers.ts';

test('resolveTenantSelection preserva tenant anterior valido', () => {
  const resolved = resolveTenantSelection(
    [
      { uid: 'shared-1', name: 'Compartilhada', type: 'shared' },
      { uid: 'owner-1', name: 'Minha', type: 'owner' },
    ],
    'shared-1'
  );

  assert.equal(resolved, 'shared-1');
});

test('resolveTenantSelection prioriza tenant owner quando anterior eh invalido', () => {
  const resolved = resolveTenantSelection(
    [
      { uid: 'shared-1', name: 'Compartilhada', type: 'shared' },
      { uid: 'owner-1', name: 'Minha', type: 'owner' },
    ],
    'missing'
  );

  assert.equal(resolved, 'owner-1');
});

test('resolveBootstrapRole usa role do profile e faz fallback por memberships', () => {
  assert.equal(resolveBootstrapRole('admin', []), 'admin');
  assert.equal(resolveBootstrapRole(null, [{ tenant_id: '1', role: 'operator' }]), 'operator');
  assert.equal(resolveBootstrapRole(undefined, [{ tenant_id: '1', role: 'guest' }]), 'guest');
});

test('mapMembershipsToAvailableTenants marca owner com permissao total', () => {
  const tenants = mapMembershipsToAvailableTenants(
    [
      {
        tenant_id: 'tenant-1',
        role: 'admin',
        tenants: { id: 'tenant-1', name: 'Minha Estufa', owner_user_id: 'user-1' },
      },
    ],
    { id: 'user-1', email: 'user@test.com' },
    'Usuario'
  );

  assert.equal(tenants[0].type, 'owner');
  assert.deepEqual(tenants[0].permissions, {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManageSharing: true,
  });
});

test('mapMembershipsToAvailableTenants ignora vinculos inativos, tenants ausentes e owners duplicados', () => {
  const tenants = mapMembershipsToAvailableTenants(
    [
      { tenant_id: 'owner-1', can_read: true, tenants: { id: 'owner-1', name: 'Minha Estufa', owner_user_id: 'user-1' } },
      { tenant_id: 'owner-2', can_read: true, tenants: { id: 'owner-2', name: 'Estufa duplicada', owner_user_id: 'user-1' } },
      { tenant_id: 'revoked', can_read: false, tenants: { id: 'revoked', name: 'Revogada', owner_user_id: 'owner-2' } },
      { tenant_id: 'missing', can_read: true, tenants: null },
      { tenant_id: 'shared-1', can_read: true, tenants: { id: 'shared-1', name: 'Compartilhada', owner_user_id: 'owner-2' } },
    ],
    { id: 'user-1', email: 'user@test.com' },
    'Usuario'
  );

  assert.deepEqual(tenants.map((tenant) => tenant.uid), ['owner-1', 'shared-1']);
});
