import {
  deserializeOfflinePayload,
  serializeOfflinePayload,
} from './offlinePayloadCodec.ts';
import type { JsonValue } from './offlinePayloadCodec.ts';
import { isOfflineLikeError } from './offlineUtils.ts';

export type OfflineActionName =
  | 'createEstufa'
  | 'updateEstufa'
  | 'deleteEstufa'
  | 'createPlantio'
  | 'updatePlantio'
  | 'updatePlantioStatus'
  | 'createInsumo'
  | 'updateInsumo'
  | 'deleteInsumo'
  | 'addEstoqueToInsumo'
  | 'createDespesa'
  | 'updateDespesaStatus'
  | 'deleteDespesa'
  | 'createCliente'
  | 'updateCliente'
  | 'deleteCliente'
  | 'createFornecedor'
  | 'updateFornecedor'
  | 'deleteFornecedor'
  | 'createManejo'
  | 'createAplicacao'
  | 'createColheita'
  | 'updateColheita'
  | 'deleteColheita'
  | 'createVenda'
  | 'updateVenda'
  | 'deleteVenda'
  | 'receberVenda'
  | 'markVendaChequeEmMaos'
  | 'updateVendaReceipt'
  | 'removeVendaReceipt';

export type OfflineQueueScope = {
  authUserId: string;
  tenantId: string;
};

export type OfflineQueueItem = {
  id: string;
  action: OfflineActionName;
  payload: JsonValue;
  queuedAt: number;
  attempts: number;
  scope?: OfflineQueueScope;
};

type FlushResult = {
  flushed: number;
  pending: number;
  failed: number;
};

type OfflineQueueStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type OfflineQueueStorageDeps = {
  storage: OfflineQueueStorageLike;
  queueKey: string;
  isOnlineNow(): Promise<boolean>;
  resolveActiveScope(): Promise<OfflineQueueScope | null>;
  executeOfflineAction(
    action: OfflineActionName,
    payload: unknown
  ): Promise<void>;
};

const extractTenantIdFromPayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return '';
  const candidate = (payload as { userId?: unknown }).userId;
  return typeof candidate === 'string' ? candidate.trim() : '';
};

const isQueueItemScopedToActiveSession = (
  item: OfflineQueueItem,
  activeScope: OfflineQueueScope | null
) => {
  if (!item.scope) return activeScope !== null;
  if (!activeScope) return false;

  return (
    item.scope.authUserId === activeScope.authUserId &&
    item.scope.tenantId === activeScope.tenantId
  );
};

export const createOfflineQueueStorage = ({
  storage,
  queueKey,
  isOnlineNow,
  resolveActiveScope,
  executeOfflineAction,
}: OfflineQueueStorageDeps) => {
  const readQueue = async (): Promise<OfflineQueueItem[]> => {
    try {
      const raw = await storage.getItem(queueKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OfflineQueueItem[]) : [];
    } catch {
      return [];
    }
  };

  const writeQueue = async (queue: OfflineQueueItem[]) => {
    await storage.setItem(queueKey, JSON.stringify(queue));
  };

  const stampLegacyQueueItems = async (
    queue: OfflineQueueItem[],
    activeScope: OfflineQueueScope | null
  ) => {
    if (!activeScope) return queue;

    let changed = false;
    const migrated = queue.map((item) => {
      if (item.scope) return item;
      changed = true;
      return {
        ...item,
        scope: activeScope,
      };
    });

    if (changed) {
      await writeQueue(migrated);
    }

    return migrated;
  };

  const enqueueOfflineAction = async (
    action: OfflineActionName,
    payload: unknown
  ) => {
    const queue = await readQueue();
    const activeScope = await resolveActiveScope();
    const tenantId = extractTenantIdFromPayload(payload);
    const nextItem: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      action,
      payload: serializeOfflinePayload(payload),
      queuedAt: Date.now(),
      attempts: 0,
      scope:
        activeScope && tenantId
          ? {
              authUserId: activeScope.authUserId,
              tenantId,
            }
          : undefined,
    };
    queue.push(nextItem);
    await writeQueue(queue);
    return nextItem.id;
  };

  const getOfflineQueueSize = async () => {
    const queue = await readQueue();
    return queue.length;
  };

  const flushOfflineQueue = async (): Promise<FlushResult> => {
    const online = await isOnlineNow();
    if (!online) {
      const queue = await readQueue();
      return { flushed: 0, pending: queue.length, failed: 0 };
    }

    const activeScope = await resolveActiveScope();
    const storedQueue = await readQueue();
    const queue = await stampLegacyQueueItems(storedQueue, activeScope);
    if (queue.length === 0) return { flushed: 0, pending: 0, failed: 0 };

    const remaining: OfflineQueueItem[] = [];
    let flushed = 0;
    let failed = 0;

    for (const item of queue) {
      if (!isQueueItemScopedToActiveSession(item, activeScope)) {
        remaining.push(item);
        continue;
      }

      try {
        await executeOfflineAction(
          item.action,
          deserializeOfflinePayload(item.payload)
        );
        flushed += 1;
      } catch (error) {
        failed += 1;
        if (isOfflineLikeError(error)) {
          remaining.push({ ...item, attempts: item.attempts + 1 });
          const startIndex = queue.findIndex((q) => q.id === item.id) + 1;
          remaining.push(...queue.slice(startIndex));
          break;
        }
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }

    await writeQueue(remaining);
    return { flushed, pending: remaining.length, failed };
  };

  return {
    enqueueOfflineAction,
    getOfflineQueueSize,
    flushOfflineQueue,
  };
};
