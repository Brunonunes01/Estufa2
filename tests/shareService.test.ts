import test from 'node:test';
import assert from 'node:assert/strict';

import { mapSharedTenantRows, mapTenantMembers } from '../src/services/shareServiceHelpers.ts';

test('mapSharedTenantRows remove tenant do proprio owner e monta permissoes', () => {
  const rows = [
    {
      tenant_id: 'tenant-owner',
      role: 'admin' as const,
      tenants: { name: 'Minha', owner_user_id: 'user-1' },
    },
    {
      tenant_id: 'tenant-shared',
      role: 'operator' as const,
      can_read: true,
      can_write: true,
      can_delete: false,
      can_manage_sharing: false,
      created_at: '2026-06-14T10:00:00.000Z',
      tenants: { name: 'Parceira', owner_user_id: 'owner-2' },
    },
  ];

  const tenants = mapSharedTenantRows(
    rows,
    'user-1',
    new Map([['owner-2', 'Maria']]),
    new Map([['owner-2', 'maria@test.com']])
  );

  assert.equal(tenants.length, 1);
  assert.equal(tenants[0].uid, 'tenant-shared');
  assert.equal(tenants[0].sharedBy, 'Maria');
  assert.equal(tenants[0].permissions?.canWrite, true);
});

test('mapSharedTenantRows ignora acessos revogados, tenants ausentes e duplicados', () => {
  const tenants = mapSharedTenantRows(
    [
      { tenant_id: 'shared-1', can_read: true, tenants: { name: 'Parceira', owner_user_id: 'owner-2' } },
      { tenant_id: 'shared-1', can_read: true, tenants: { name: 'Duplicada', owner_user_id: 'owner-2' } },
      { tenant_id: 'revoked', can_read: false, tenants: { name: 'Revogada', owner_user_id: 'owner-3' } },
      { tenant_id: 'missing', can_read: true, tenants: null },
    ],
    'user-1',
    new Map(),
    new Map()
  );

  assert.deepEqual(tenants.map((tenant) => tenant.uid), ['shared-1']);
});

test('mapTenantMembers usa fallback de perfil quando profile nao existe', () => {
  const members = mapTenantMembers(
    [
      {
        user_id: 'user-2',
        role: 'guest',
        can_read: true,
        can_write: false,
        can_delete: false,
        can_manage_sharing: false,
        created_at: '2026-06-14T10:00:00.000Z',
      },
    ],
    new Map()
  );

  assert.equal(members[0].name, 'Usuario');
  assert.equal(members[0].role, 'guest');
  assert.equal(members[0].canRead, true);
});
