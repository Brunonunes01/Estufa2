import test from 'node:test';
import assert from 'node:assert/strict';

import { mapSessionUserToAuthBridgeUser } from '../src/services/authBridgeHelpers.ts';

test('mapSessionUserToAuthBridgeUser extrai display_name com null safety', () => {
  const user = mapSessionUserToAuthBridgeUser({
    id: 'user-1',
    email: 'user@test.com',
    user_metadata: { display_name: 'Bruno' },
  });

  assert.deepEqual(user, {
    id: 'user-1',
    email: 'user@test.com',
    displayName: 'Bruno',
  });
});

test('mapSessionUserToAuthBridgeUser retorna null sem sessao', () => {
  assert.equal(mapSessionUserToAuthBridgeUser(null), null);
});
