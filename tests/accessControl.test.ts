import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

import {
  assertTenantPermission,
  getAccessSnapshot,
  getDefaultTenantPermissions,
  hasTenantPermission,
  resolveAccessRole,
  resolveSharedTenantRole,
  resolveTenantPermissions,
} from '../src/lib/accessControl.ts';

test('viewer keeps read-only access and can see all read-only dashboards', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'guest' });

  assert.equal(access.accessRole, 'viewer');
  assert.equal(access.canRead, true);
  assert.equal(access.canWrite, false);
  assert.equal(access.canDelete, false);
  assert.equal(access.canManageSharing, false);
  assert.equal(access.canViewFinancialDashboard, true);
  assert.equal(access.canViewCash, true);
});

test('greenhouse operations follow the active tenant permissions', () => {
  const viewer = getAccessSnapshot({ type: 'shared', role: 'guest' });
  const operator = getAccessSnapshot({ type: 'shared', role: 'operator' });

  assert.equal(hasTenantPermission(viewer, 'read'), true);
  assert.equal(hasTenantPermission(viewer, 'write'), false);
  assert.equal(hasTenantPermission(operator, 'write'), true);
  assert.equal(hasTenantPermission(operator, 'delete'), false);
  assert.throws(() => assertTenantPermission(viewer, 'write'), /Permissao insuficiente/i);
});

test('operation matrix keeps sharing and deletion independent from write access', () => {
  const operator = getAccessSnapshot({ type: 'shared', role: 'operator' });
  const manager = getAccessSnapshot({ type: 'shared', role: 'admin' });

  assert.equal(hasTenantPermission(operator, 'read'), true);
  assert.equal(hasTenantPermission(operator, 'write'), true);
  assert.equal(hasTenantPermission(operator, 'delete'), false);
  assert.equal(hasTenantPermission(operator, 'manageSharing'), false);
  assert.equal(hasTenantPermission(manager, 'manageSharing'), true);
  assert.throws(() => assertTenantPermission(operator, 'manageSharing'), /Permissao insuficiente/i);
});

test('operator can see dashboard and write but not manage sharing', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'operator' });

  assert.equal(access.isOperator, true);
  assert.equal(access.canWrite, true);
  assert.equal(access.canManageSharing, false);
  assert.equal(access.canViewFinancialDashboard, true);
});

test('owner keeps full access including owner-only actions', () => {
  const access = getAccessSnapshot({ type: 'owner' });

  assert.equal(access.accessRole, 'owner');
  assert.equal(access.isOwner, true);
  assert.equal(access.canRead, true);
  assert.equal(access.canWrite, true);
  assert.equal(access.canDelete, true);
  assert.equal(access.canManageSharing, true);
  assert.equal(access.canManageSecurity, true);
  assert.equal(access.canDeleteEstufa, true);
  assert.equal(access.canInviteManager, true);
  assert.equal(access.canRemoveManager, true);
  assert.equal(access.canViewCash, true);
});

test('shared admin keeps manager role but not owner-only actions', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'admin' });

  assert.equal(access.accessRole, 'manager');
  assert.equal(access.isManager, true);
  assert.equal(access.isOwner, false);
  assert.equal(access.canManageSecurity, true);
  assert.equal(access.canDeleteEstufa, false);
  assert.equal(access.canInviteManager, false);
  assert.equal(access.canRemoveManager, false);
  assert.equal(access.canViewCash, true);
});

test('custom shared permissions override default write/delete flags', () => {
  const permissions = resolveTenantPermissions({
    type: 'shared',
    role: 'operator',
    permissions: {
      canRead: true,
      canWrite: false,
      canDelete: true,
      canManageSharing: false,
    },
  });

  assert.deepEqual(permissions, {
    canRead: true,
    canWrite: false,
    canDelete: true,
    canManageSharing: false,
  });
});

test('invalid shared role falls back safely to guest access', () => {
  assert.equal(resolveSharedTenantRole('invalid-role'), 'guest');
  assert.equal(resolveAccessRole({ type: 'shared', role: 'invalid-role' as never }), 'viewer');

  const access = getAccessSnapshot({ type: 'shared', role: 'invalid-role' as never });
  assert.equal(access.sharedRole, 'guest');
  assert.equal(access.canWrite, false);
  assert.equal(access.canDelete, false);
});

test('default tenant permissions stay aligned with expected roles', () => {
  assert.deepEqual(getDefaultTenantPermissions('admin'), {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManageSharing: true,
  });
  assert.deepEqual(getDefaultTenantPermissions('guest'), {
    canRead: true,
    canWrite: false,
    canDelete: false,
    canManageSharing: false,
  });
});
test('controle de acesso não libera rotas removidas', () => {
  const source = readFileSync('src/navigation/AppStackNavigator.tsx', 'utf8');
  assert.doesNotMatch(source, /TalhoesList|TalhaoForm|CampoVendaForm/);
});
