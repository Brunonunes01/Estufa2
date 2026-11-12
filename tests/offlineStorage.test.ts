import assert from 'node:assert/strict';
import test from 'node:test';

import { createOfflineQueueStorage, type OfflineQueueScope } from '../src/services/offline/offlineQueueStorage.ts';

const writePermissions = { canRead: true, canWrite: true, canDelete: true, canManageSharing: true };

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
  let activeScope: OfflineQueueScope | null = { authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions };

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
  activeScope = { authUserId: 'user-1', tenantId: 'tenant-2', permissions: writePermissions };
  await queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-2', data: { descricao: 'B' } });
  activeScope = { authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions };

  let result = await queue.flushOfflineQueue();

  assert.deepEqual(executed, ['tenant-1']);
  assert.deepEqual(result, { flushed: 1, pending: 1, failed: 0 });
  assert.equal(await queue.getOfflineQueueSize(), 1);

  activeScope = { authUserId: 'user-1', tenantId: 'tenant-2', permissions: writePermissions };
  result = await queue.flushOfflineQueue();

  assert.deepEqual(executed, ['tenant-1', 'tenant-2']);
  assert.deepEqual(result, { flushed: 1, pending: 0, failed: 0 });
  assert.equal(await queue.getOfflineQueueSize(), 0);
});

test('flushOfflineQueue preserva itens de outro usuario autenticado', async () => {
  const { storage } = createMemoryStorage();
  const executed: string[] = [];
  let activeScope: OfflineQueueScope | null = { authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions };

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

test('operação offline de estufa permanece retida até o tenant correto voltar', async () => {
  const { storage } = createMemoryStorage();
  const executed: string[] = [];
  let activeScope: OfflineQueueScope | null = { authUserId: 'user-1', tenantId: 'tenant-estufa', permissions: writePermissions };
  const queue = createOfflineQueueStorage({
    storage,
    queueKey: '@test/greenhouse-queue',
    isOnlineNow: async () => true,
    resolveActiveScope: async () => activeScope,
    executeOfflineAction: async (action, payload) => {
      executed.push(`${action}:${(payload as { userId: string }).userId}`);
    },
  });

  await queue.enqueueOfflineAction('createPlantio', {
    userId: 'tenant-estufa',
    data: { estufaId: 'estufa-1' },
  });
  activeScope = { authUserId: 'user-2', tenantId: 'tenant-estufa', permissions: writePermissions };
  assert.deepEqual(await queue.flushOfflineQueue(), { flushed: 0, pending: 1, failed: 0 });
  assert.deepEqual(executed, []);
});

test('enqueueOfflineAction rejects a divergent tenant without writing the item', async () => {
  const { storage, values } = createMemoryStorage();
  const queue = createOfflineQueueStorage({
    storage,
    queueKey: '@test/rejected-queue',
    isOnlineNow: async () => false,
    resolveActiveScope: async () => ({ authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions }),
    executeOfflineAction: async () => {},
  });

  await assert.rejects(
    queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-2', data: { descricao: 'B' } }),
    /tenant invalido/i
  );
  assert.equal(values.has('@test/rejected-queue'), false);
});

test('flushOfflineQueue does not associate a legacy item with the active tenant', async () => {
  const { storage } = createMemoryStorage();
  await storage.setItem(
    '@test/legacy-queue',
    JSON.stringify([{ id: 'legacy-1', action: 'createDespesa', payload: { userId: 'tenant-1' }, queuedAt: 1, attempts: 0 }])
  );
  let executed = 0;
  const queue = createOfflineQueueStorage({
    storage,
    queueKey: '@test/legacy-queue',
    isOnlineNow: async () => true,
    resolveActiveScope: async () => ({ authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions }),
    executeOfflineAction: async () => {
      executed += 1;
    },
  });

  assert.deepEqual(await queue.flushOfflineQueue(), { flushed: 0, pending: 1, failed: 1 });
  assert.equal(executed, 0);
});

test('offline queue deduplicates a logical operation and rejects a divergent payload', async () => {
  const { storage, values } = createMemoryStorage();
  const queue = createOfflineQueueStorage({
    storage, queueKey: '@test/idempotent-queue', isOnlineNow: async () => false,
    resolveActiveScope: async () => ({ authUserId: 'user-1', tenantId: 'tenant-1', permissions: writePermissions }),
    executeOfflineAction: async () => {},
  });
  const payload = { userId: 'tenant-1', data: { descricao: 'A', value: 1 } };
  const first = await queue.enqueueOfflineAction('createDespesa', payload, 'op-stable');
  const replay = await queue.enqueueOfflineAction('createDespesa', { data: { value: 1, descricao: 'A' }, userId: 'tenant-1' }, 'op-stable');
  assert.equal(replay, first);
  assert.equal(JSON.parse(values.get('@test/idempotent-queue') ?? '[]').length, 1);
  await assert.rejects(queue.enqueueOfflineAction('createDespesa', { userId: 'tenant-1', data: { descricao: 'B' } }, 'op-stable'), /idempotencia/i);
});
