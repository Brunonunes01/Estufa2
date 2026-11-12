import {
  enqueueOfflineAction,
  isOnlineNow,
  OfflineActionName,
  OfflineWriteOptions,
} from './offlineStorage';
import { isOfflineLikeError, shouldAllowQueue } from './offlineUtils';
import { assertActiveTenantAuthorization } from '../tenantAuthorizationState.ts';
import { createLogicalOperationId } from '../operationIdentity.ts';
import type { OperationResult } from '../operationResult.ts';
import { classifyServiceError } from '../serviceErrorClassifier.ts';

const operationForAction = (action: OfflineActionName) =>
  action.startsWith('delete') || action === 'removeVendaReceipt' ? 'delete' as const : 'write' as const;

export const buildOfflinePlaceholderId = () =>
  `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const isOfflinePlaceholderId = (value: unknown) => typeof value === 'string' && value.startsWith('offline-');

type RunOfflineWriteParams<T> = {
  action: OfflineActionName;
  payload: unknown;
  options?: OfflineWriteOptions;
  onQueuedValue: () => T;
  write: (logicalOperationId: string) => Promise<T>;
  completedSteps?: string[];
  reconciliationAction?: string;
};

export const runOfflineWriteResult = async <T>({
  action, payload, options, write, completedSteps = [], reconciliationAction = '',
}: Omit<RunOfflineWriteParams<T>, 'onQueuedValue'>): Promise<OperationResult<T>> => {
  const tenantId = payload && typeof payload === 'object' && 'userId' in payload ? String((payload as { userId?: unknown }).userId || '') : '';
  assertActiveTenantAuthorization(tenantId, operationForAction(action));
  const logicalOperationId = options?.logicalOperationId?.trim() || createLogicalOperationId();
  const allowQueue = shouldAllowQueue(options);
  if (allowQueue && !(await isOnlineNow())) {
    await enqueueOfflineAction(action, payload, logicalOperationId);
    return { status: 'pending', logicalOperationId };
  }
  try {
    return { status: 'confirmed', logicalOperationId, data: await write(logicalOperationId) };
  } catch (cause) {
    if (allowQueue && isOfflineLikeError(cause)) {
      await enqueueOfflineAction(action, payload, logicalOperationId);
      return { status: 'pending', logicalOperationId };
    }
    const error = classifyServiceError(cause, { operation: action, source: 'offlineWrite' });
    if (completedSteps.length > 0 && reconciliationAction.trim()) return { status: 'partial', logicalOperationId, completedSteps, reconciliationAction, error };
    if (error.retryability !== 'never') return { status: 'retryable', logicalOperationId, error };
    return { status: 'terminal', logicalOperationId, error };
  }
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
  const logicalOperationId = options?.logicalOperationId?.trim() || createLogicalOperationId();

  if (allowQueue) {
    const online = await isOnlineNow();
    if (!online) {
      await enqueueOfflineAction(action, payload, logicalOperationId);
      return onQueuedValue();
    }
  }

  try {
    return await write(logicalOperationId);
  } catch (error) {
    if (allowQueue && isOfflineLikeError(error)) {
      await enqueueOfflineAction(action, payload, logicalOperationId);
      return onQueuedValue();
    }
    throw error;
  }
};
