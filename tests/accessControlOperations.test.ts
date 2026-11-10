import assert from 'node:assert/strict';
import test from 'node:test';

import { getAccessSnapshot, hasTenantPermission } from '../src/lib/accessControl.ts';

test('read-only members cannot write or delete active records', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'guest' });
  assert.equal(hasTenantPermission(access, 'read'), true);
  assert.equal(hasTenantPermission(access, 'write'), false);
  assert.equal(hasTenantPermission(access, 'delete'), false);
});

test('operators can write but cannot delete or manage sharing', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'operator' });
  assert.equal(hasTenantPermission(access, 'write'), true);
  assert.equal(hasTenantPermission(access, 'delete'), false);
  assert.equal(hasTenantPermission(access, 'manageSharing'), false);
});
