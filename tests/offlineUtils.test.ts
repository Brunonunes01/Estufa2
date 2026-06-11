import test from 'node:test';
import assert from 'node:assert/strict';

import { isOfflineLikeError, shouldAllowQueue } from '../src/services/offline/offlineUtils.ts';

test('isOfflineLikeError detects network failures', () => {
  assert.equal(isOfflineLikeError({ message: 'Network request failed' }), true);
  assert.equal(isOfflineLikeError({ message: 'Validation error' }), false);
});

test('shouldAllowQueue respects online_only mode', () => {
  assert.equal(shouldAllowQueue(), true);
  assert.equal(shouldAllowQueue({ syncMode: 'online_only' }), false);
});
