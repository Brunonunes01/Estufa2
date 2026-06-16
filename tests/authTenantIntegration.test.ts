import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthTenantBootstrapService } from '../src/services/authTenantBootstrapCore.ts';
import type { MembershipRow } from '../src/services/authTenantHelpers.ts';

test('bootstrapAuthTenantState cria tenant inicial, reidrata perfil e hidrata responsavel de tenant compartilhado', async () => {
  let membershipsCallCount = 0;
  const createdTenants: Array<{ ownerUserId: string; tenantName: string }> = [];
  const upsertedProfiles: Array<{ id: string; email: string; name: string; updated_at: string }> = [];

  const membershipsAfterCreate: MembershipRow[] = [
    {
      tenant_id: 'tenant-owner',
      role: 'admin',
      can_read: true,
      can_write: true,
      can_delete: true,
      can_manage_sharing: true,
      tenants: { id: 'tenant-owner', name: 'Minha Estufa', owner_user_id: 'user-1' },
    },
    {
      tenant_id: 'tenant-shared',
      role: 'guest',
      can_read: true,
      can_write: false,
      can_delete: false,
      can_manage_sharing: false,
      tenants: { id: 'tenant-shared', name: 'Conta Parceira', owner_user_id: 'owner-2' },
    },
  ];

  const service = createAuthTenantBootstrapService({
    ensureConfigured: () => {},
    loadProfile: async () => ({ id: 'user-1', email: null, name: null, role: null }),
    loadMemberships: async () => {
      membershipsCallCount += 1;
      return membershipsCallCount === 1 ? [] : membershipsAfterCreate;
    },
    upsertProfile: async (input) => {
      upsertedProfiles.push(input);
      return { id: input.id, email: input.email, name: input.name, role: 'operator' };
    },
    createOwnerTenant: async (ownerUserId, tenantName) => {
      createdTenants.push({ ownerUserId, tenantName });
    },
    loadProfilesByIds: async (userIds) =>
      userIds.map((id) => ({
        id,
        name: id === 'owner-2' ? 'Maria Responsavel' : 'Desconhecido',
        email: id === 'owner-2' ? 'maria@test.com' : null,
      })),
    now: () => '2026-06-15T20:00:00.000Z',
  });

  const result = await service.bootstrapAuthTenantState(
    { id: 'user-1', email: 'joao@test.com', displayName: 'Joao Silva' },
    'tenant-shared'
  );

  assert.equal(upsertedProfiles.length, 1);
  assert.equal(createdTenants.length, 1);
  assert.deepEqual(createdTenants[0], {
    ownerUserId: 'user-1',
    tenantName: 'Estufa de Joao',
  });
  assert.equal(result.resolvedTenantId, 'tenant-shared');
  assert.equal(result.user.role, 'operator');
  assert.equal(result.availableTenants.length, 2);
  assert.equal(result.availableTenants[1].ownerName, 'Maria Responsavel');
  assert.equal(result.availableTenants[1].ownerEmail, 'maria@test.com');
});
