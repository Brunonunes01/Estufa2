import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFlushResultToSyncState,
  isNetworkReadyForSync,
  toOfflineSyncErrorMessage,
} from '../src/services/offline/syncServiceHelpers.ts';

test('isNetworkReadyForSync exige conexao e internet alcançavel', () => {
  assert.equal(isNetworkReadyForSync({ isConnected: true, isInternetReachable: true }), true);
  assert.equal(isNetworkReadyForSync({ isConnected: true, isInternetReachable: false }), false);
  assert.equal(isNetworkReadyForSync({ isConnected: false, isInternetReachable: true }), false);
});

test('applyFlushResultToSyncState atualiza snapshot de sync', () => {
  const next = applyFlushResultToSyncState(
    {
      syncing: true,
      lastSyncAt: null,
      lastError: 'erro antigo',
      queued: 4,
      flushed: 0,
      failed: 0,
    },
    { flushed: 3, pending: 1, failed: 0 },
    123456
  );

  assert.deepEqual(next, {
    syncing: true,
    lastSyncAt: 123456,
    lastError: null,
    queued: 1,
    flushed: 3,
    failed: 0,
  });
});

test('toOfflineSyncErrorMessage usa fallback seguro', () => {
  assert.equal(toOfflineSyncErrorMessage({ message: 'falhou' }), 'falhou');
  assert.equal(toOfflineSyncErrorMessage(null), 'Falha ao sincronizar dados pendentes.');
});
