import assert from 'node:assert/strict';
import test from 'node:test';

import { createShareService } from '../src/services/shareServiceCore.ts';
import type { SharedTenantMembershipRow, TenantMembershipRow } from '../src/services/shareServiceHelpers.ts';

test('shareService lista membros com permissao de leitura e mapeia perfis', async () => {
  let readPermissionChecks = 0;
  const service = createShareService({
    storage: {
      getItem: async () => null,
      setItem: async () => {},
    },
    now: () => 1_000,
    generateShareCodeValue: () => 'CODE12345678901234567890',
    getAuthenticatedUserId: async () => 'viewer-1',
    ensureSharePermission: async () => {},
    ensureTenantReadPermission: async () => {
      readPermissionChecks += 1;
    },
    getTenantOwnerId: async () => 'owner-1',
    insertShareCodeRecord: async () => ({ duplicate: false }),
    getShareCodeTenantId: async () => 'tenant-1',
    redeemShareCodeRpc: async () => true,
    listSharedMemberships: async () => [] as SharedTenantMembershipRow[],
    loadProfilesByIds: async (userIds) =>
      userIds.map((id) => ({
        id,
        name: id === 'user-2' ? 'Operador 2' : 'Viewer 1',
        email: `${id}@test.com`,
      })),
    listTenantMemberships: async () =>
      [
        {
          user_id: 'viewer-1',
          role: 'guest',
          can_read: true,
          can_write: false,
          can_delete: false,
          can_manage_sharing: false,
          created_at: '2026-06-15T20:00:00.000Z',
        },
        {
          user_id: 'user-2',
          role: 'operator',
          can_read: true,
          can_write: true,
          can_delete: false,
          can_manage_sharing: false,
          created_at: '2026-06-15T20:00:00.000Z',
        },
      ] as TenantMembershipRow[],
    getMembershipRole: async () => 'guest',
    updateMembership: async () => {},
    deleteMembership: async () => {},
  });

  const members = await service.listTenantMembers('tenant-1', 'viewer-1');

  assert.equal(readPermissionChecks, 1);
  assert.equal(members.length, 2);
  assert.equal(members[1].name, 'Operador 2');
  assert.equal(members[1].canWrite, true);
});

test('shareService resgata convite, persiste janela de rate-limit e retorna tenant', async () => {
  const writes: string[] = [];
  const service = createShareService({
    storage: {
      getItem: async () => null,
      setItem: async (key, value) => {
        writes.push(`${key}:${value}`);
      },
    },
    now: () => 10_000,
    generateShareCodeValue: () => 'CODE12345678901234567890',
    getAuthenticatedUserId: async () => 'user-1',
    ensureSharePermission: async () => {},
    ensureTenantReadPermission: async () => {},
    getTenantOwnerId: async () => 'owner-1',
    insertShareCodeRecord: async () => ({ duplicate: false }),
    getShareCodeTenantId: async (code) => (code === 'ABC12345678901234567' ? 'tenant-9' : null),
    redeemShareCodeRpc: async () => true,
    listSharedMemberships: async () => [] as SharedTenantMembershipRow[],
    loadProfilesByIds: async () => [],
    listTenantMemberships: async () => [] as TenantMembershipRow[],
    getMembershipRole: async () => 'guest',
    updateMembership: async () => {},
    deleteMembership: async () => {},
  });

  const tenantId = await service.redeemShareCode(' abc12345678901234567 ', 'user-1');

  assert.equal(tenantId, 'tenant-9');
  assert.equal(writes.length >= 1, true);
  assert.equal(writes.at(-1)?.includes('"attempts":0'), true);
});

test('shareService bloqueia gerente comum de remover outro gerente', async () => {
  const removed: string[] = [];
  const service = createShareService({
    storage: {
      getItem: async () => null,
      setItem: async () => {},
    },
    now: () => 10_000,
    generateShareCodeValue: () => 'CODE12345678901234567890',
    getAuthenticatedUserId: async () => 'manager-1',
    ensureSharePermission: async () => {},
    ensureTenantReadPermission: async () => {},
    getTenantOwnerId: async () => 'owner-1',
    insertShareCodeRecord: async () => ({ duplicate: false }),
    getShareCodeTenantId: async () => null,
    redeemShareCodeRpc: async () => false,
    listSharedMemberships: async () => [] as SharedTenantMembershipRow[],
    loadProfilesByIds: async () => [],
    listTenantMemberships: async () => [] as TenantMembershipRow[],
    getMembershipRole: async (_tenantId, userId) => (userId === 'manager-1' ? 'admin' : 'admin'),
    updateMembership: async () => {},
    deleteMembership: async (_tenantId, userId) => {
      removed.push(userId);
    },
  });

  await assert.rejects(
    service.removeTenantMember('tenant-1', 'manager-2', 'manager-1'),
    /Somente o proprietario pode remover um gerente/
  );
  assert.equal(removed.length, 0);
});
