import {
  enqueueOfflineAction,
  isOnlineNow,
  OfflineActionName,
  OfflineWriteOptions,
} from './offlineStorage';
import { isOfflineLikeError, shouldAllowQueue } from './offlineUtils';
import { assertActiveTenantAuthorization } from '../tenantAuthorizationState.ts';

const operationForAction = (action: OfflineActionName) =>
  action.startsWith('delete') || action === 'removeVendaReceipt' ? 'delete' as const : 'write' as const;

export const buildOfflinePlaceholderId = () =>
  `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type RunOfflineWriteParams<T> = {
  action: OfflineActionName;
  payload: unknown;
  options?: OfflineWriteOptions;
  onQueuedValue: () => T;
  write: () => Promise<T>;
};

export const runOfflineWrite = async <T>({
  action,
  payload,
  options,
  onQueuedValue,
  write,
}: RunOfflineWriteParams<T>): Promise<T> => {
  const tenantId = payload && typeof payload === 'object' && 'userId' in payload
    ? String((payload as { userId?: unknown }).userId || '')
    : '';
  assertActiveTenantAuthorization(tenantId, operationForAction(action));
  const allowQueue = shouldAllowQueue(options);

  if (allowQueue) {
    const online = await isOnlineNow();
    if (!online) {
      await enqueueOfflineAction(action, payload);
      return onQueuedValue();
    }
  }

  try {
    return await write();
  } catch (error) {
    if (allowQueue && isOfflineLikeError(error)) {
      await enqueueOfflineAction(action, payload);
      return onQueuedValue();
    }
    throw error;
  }
};
