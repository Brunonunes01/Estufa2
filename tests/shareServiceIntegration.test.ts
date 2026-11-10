import assert from 'node:assert/strict';
import test from 'node:test';

import { createShareService } from '../src/services/shareServiceCore.ts';
import type { SharedTenantMembershipRow, TenantMembershipRow } from '../src/services/shareServiceHelpers.ts';

const deps = (overrides: Record<string, unknown> = {}) => ({
  storage: { getItem: async () => null, setItem: async () => {} }, now: () => 1_000,
  generateShareCodeValue: () => 'CODE12345678901234567890', getAuthenticatedUserId: async () => 'viewer-1',
  ensureSharePermission: async () => {}, ensureTenantReadPermission: async () => {}, getTenantOwnerId: async () => 'owner-1',
  insertShareCodeRecord: async () => ({ duplicate: false }), getShareCodeTenantId: async () => null, redeemShareCodeRpc: async () => false,
  listSharedMemberships: async () => [] as SharedTenantMembershipRow[], loadProfilesByIds: async () => [],
  listTenantMemberships: async () => [] as TenantMembershipRow[], getMembershipRole: async () => 'guest' as const,
  updateMembership: async () => {}, deleteMembership: async () => {}, ...overrides,
});

test('shareService lista membros com permissao de leitura e mapeia perfis', async () => {
  let checks = 0;
  const service = createShareService(deps({
    ensureTenantReadPermission: async () => { checks += 1; },
    listTenantMemberships: async () => [
      { user_id: 'viewer-1', role: 'guest', can_read: true, can_write: false, can_delete: false, can_manage_sharing: false, created_at: '2026-06-15' },
      { user_id: 'user-2', role: 'operator', can_read: true, can_write: true, can_delete: false, can_manage_sharing: false, created_at: '2026-06-15' },
    ] as TenantMembershipRow[],
    loadProfilesByIds: async (ids: string[]) => ids.map((id) => ({ id, name: id === 'user-2' ? 'Operador 2' : 'Viewer 1', email: `${id}@test.com` })),
  }));
  const members = await service.listTenantMembers('tenant-1', 'viewer-1');
  assert.equal(checks, 1); assert.equal(members.length, 2); assert.equal(members[1].canWrite, true);
});

test('shareService resgata convite e persiste rate-limit', async () => {
  const writes: string[] = [];
  const service = createShareService(deps({
    getAuthenticatedUserId: async () => 'user-1',
    storage: { getItem: async () => null, setItem: async (key: string, value: string) => writes.push(`${key}:${value}`) },
    getShareCodeTenantId: async () => 'tenant-9', redeemShareCodeRpc: async () => true,
  }));
  assert.equal(await service.redeemShareCode(' abc12345678901234567 ', 'user-1'), 'tenant-9');
  assert.equal(writes.at(-1)?.includes('"attempts":0'), true);
});

test('shareService bloqueia gerente comum de remover outro gerente', async () => {
  const service = createShareService(deps({
    getAuthenticatedUserId: async () => 'manager-1',
    getTenantOwnerId: async () => 'owner-1',
    getMembershipRole: async (_tenantId: string, userId: string) => userId === 'manager-1' || userId === 'manager-2' ? 'admin' : 'guest',
  }));
  await assert.rejects(service.removeTenantMember('tenant-1', 'manager-2', 'manager-1'), /Somente o proprietario pode remover um gerente/);
});

test('sharing operations stop before mutation when permission is denied', async () => {
  let mutations = 0;
  const service = createShareService(deps({
    ensureSharePermission: async () => { throw new Error('Permissao insuficiente para compartilhar.'); },
    insertShareCodeRecord: async () => { mutations += 1; return { duplicate: false }; },
    updateMembership: async () => { mutations += 1; }, deleteMembership: async () => { mutations += 1; },
  }));
  await assert.rejects(() => service.generateShareCode('tenant-1', 'Tenant', 'Owner'), /Permissao insuficiente/);
  await assert.rejects(() => service.removeTenantMember('tenant-1', 'member-2', 'viewer-1'), /Permissao insuficiente/);
  assert.equal(mutations, 0);
});
