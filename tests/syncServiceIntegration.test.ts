import assert from 'node:assert/strict';
import test from 'node:test';

import { createOfflineSyncService } from '../src/services/offline/syncServiceCore.ts';

test('offline sync listener dispara flush ao voltar rede e publica snapshots', async () => {
  const snapshots: Array<{ syncing: boolean; queued: number; flushed: number; failed: number }> = [];
  let listener: ((net: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void) | null = null;
  let flushCalls = 0;

  const service = createOfflineSyncService({
    isOnlineNow: async () => true,
    flushOfflineQueue: async () => {
      flushCalls += 1;
      return { flushed: 2, pending: 1, failed: 0 };
    },
    getOfflineQueueSize: async () => 1,
    addNetInfoListener: (nextListener) => {
      listener = nextListener;
      return () => {
        listener = null;
      };
    },
    now: () => 55_000,
  });

  service.subscribeOfflineSyncState((snapshot) => {
    snapshots.push({
      syncing: snapshot.syncing,
      queued: snapshot.queued,
      flushed: snapshot.flushed,
      failed: snapshot.failed,
    });
  });

  const stop = service.startOfflineSyncListener();
  assert.equal(typeof stop, 'function');
  assert.equal(listener !== null, true);

  listener?.({ isConnected: false, isInternetReachable: false });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(flushCalls, 0);

  listener?.({ isConnected: true, isInternetReachable: true });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(flushCalls, 1);
  assert.equal(service.getOfflineSyncState().flushed, 2);
  assert.equal(service.getOfflineSyncState().queued, 1);
  assert.equal(
    snapshots.some((snapshot) => snapshot.syncing),
    true
  );

  stop();
  assert.equal(listener, null);
});
