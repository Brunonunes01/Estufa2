import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAuditActor, resolveAuditActorName, resolveAuditActorUid } from '../src/services/auditActor.ts';

test('normalizeAuditActor sanitiza uid e nome', () => {
  assert.deepEqual(normalizeAuditActor({ uid: ' user-1 ', name: ' Maria ' }), {
    uid: 'user-1',
    name: 'Maria',
  });
  assert.equal(normalizeAuditActor({ uid: '   ' }), null);
});

test('resolveAuditActorUid usa ator real e fallback para tenant', () => {
  assert.equal(resolveAuditActorUid('tenant-1', { uid: 'user-1' }), 'user-1');
  assert.equal(resolveAuditActorUid('tenant-1', null), 'tenant-1');
  assert.equal(resolveAuditActorName({ uid: 'user-1', name: 'Ana' }), 'Ana');
  assert.equal(resolveAuditActorName({ uid: 'user-1' }), null);
});
