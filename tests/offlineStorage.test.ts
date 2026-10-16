import assert from 'node:assert/strict';
import test from 'node:test';

import { createOfflineQueueStorage, type OfflineQueueScope } from '../src/services/offline/offlineQueueStorage.ts';

const createMemoryStorage = () => {
  const values = new Map<string, string>();

  return {
    values,
    storage: {
      getItem: async (key: string) => values.get(key) || null,
      setItem: async (key: string, value: string) => {
        values.set(key, value);
      },
    },
  };
};

test('flushOfflineQueue executa apenas itens do usuario e tenant ativos', async () => {
  const { storage } = createMemoryStorage();
  const executed: string[] = [];
  let activeScope: OfflineQueueScope | null = { authUserId: 'user-1', tenantId: 'tenant-1' };

  const queue = createOfflineQueueStorage({
    storage,
    queueKey: '@test/offline-queue',
    isOnlineNow: async () => true,
    resolveActiveScope: async () => activeScope,
    executeOfflineAction: async (_action, payload) => {
      executed.push(String((payload as { userId?: string }).userId || ''));
    },
  });

  await queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-1', data: { descricao: 'A' } });
  await queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-2', data: { descricao: 'B' } });

  let result = await queue.flushOfflineQueue();

  assert.deepEqual(executed, ['tenant-1']);
  assert.deepEqual(result, { flushed: 1, pending: 1, failed: 0 });
  assert.equal(await queue.getOfflineQueueSize(), 1);

  activeScope = { authUserId: 'user-1', tenantId: 'tenant-2' };
  result = await queue.flushOfflineQueue();

  assert.deepEqual(executed, ['tenant-1', 'tenant-2']);
  assert.deepEqual(result, { flushed: 1, pending: 0, failed: 0 });
  assert.equal(await queue.getOfflineQueueSize(), 0);
});

test('flushOfflineQueue preserva itens de outro usuario autenticado', async () => {
  const { storage } = createMemoryStorage();
  const executed: string[] = [];
  let activeScope: OfflineQueueScope | null = { authUserId: 'user-1', tenantId: 'tenant-1' };

  const queue = createOfflineQueueStorage({
    storage,
    queueKey: '@test/offline-queue',
    isOnlineNow: async () => true,
    resolveActiveScope: async () => activeScope,
    executeOfflineAction: async (_action, payload) => {
      executed.push(String((payload as { userId?: string }).userId || ''));
    },
  });

  await queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-1', data: { descricao: 'A' } });

  activeScope = { authUserId: 'user-2', tenantId: 'tenant-1' };
  const result = await queue.flushOfflineQueue();

  assert.deepEqual(executed, []);
  assert.deepEqual(result, { flushed: 0, pending: 1, failed: 0 });
  assert.equal(await queue.getOfflineQueueSize(), 1);
});
