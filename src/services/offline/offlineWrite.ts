import {
  enqueueOfflineAction,
  isOfflineLikeError,
  OfflineActionName,
  OfflineWriteOptions,
  shouldAllowQueue,
} from './offlineStorage';

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
  const allowQueue = shouldAllowQueue(options);

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
