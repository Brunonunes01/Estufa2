import test from 'node:test';
import assert from 'node:assert/strict';

import { getAccessSnapshot } from '../src/lib/accessControl.ts';

test('viewer keeps read-only access and can see dashboard', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'guest' });

  assert.equal(access.accessRole, 'viewer');
  assert.equal(access.canRead, true);
  assert.equal(access.canWrite, false);
  assert.equal(access.canViewFinancialDashboard, true);
});

test('operator can see dashboard and write but not manage sharing', () => {
  const access = getAccessSnapshot({ type: 'shared', role: 'operator' });

  assert.equal(access.isOperator, true);
  assert.equal(access.canWrite, true);
  assert.equal(access.canManageSharing, false);
  assert.equal(access.canViewFinancialDashboard, true);
});
