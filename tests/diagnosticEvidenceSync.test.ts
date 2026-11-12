import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineSyncService } from '../src/services/offline/syncServiceCore.ts';

test('diagnostic sync failure never changes successful business flush result', async () => {
  const service = createOfflineSyncService({
    isOnlineNow: async () => true,
    flushOfflineQueue: async () => ({ flushed: 2, pending: 0, failed: 0 }),
    getOfflineQueueSize: async () => 0,
    flushDiagnosticEvidence: async () => { throw new Error('diagnostic unavailable'); },
    addNetInfoListener: () => () => {},
    now: () => 123,
  });
  const result = await service.syncPendingDataNow();
  assert.equal(result.flushed, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.lastError, null);
});
