import { applyFlushResultToSyncState, isNetworkReadyForSync, toOfflineSyncErrorMessage } from './syncServiceHelpers.ts';

export type OfflineSyncState = {
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
  queued: number;
  flushed: number;
  failed: number;
};

export type SyncServiceDeps = {
  isOnlineNow(): Promise<boolean>;
  flushOfflineQueue(): Promise<{ flushed: number; pending: number; failed: number }>;
  getOfflineQueueSize(): Promise<number>;
  addNetInfoListener(listener: (net: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void): () => void;
  now(): number;
};

export const createOfflineSyncService = (deps: SyncServiceDeps) => {
  const state: OfflineSyncState = {
    syncing: false,
    lastSyncAt: null,
    lastError: null,
    queued: 0,
    flushed: 0,
    failed: 0,
  };
  const subscribers = new Set<(snapshot: OfflineSyncState) => void>();
  let stopListener: (() => void) | null = null;

  const notify = () => {
    const snapshot = { ...state };
    subscribers.forEach((listener) => listener(snapshot));
  };

  const refreshQueuedCount = async () => {
    state.queued = await deps.getOfflineQueueSize();
    notify();
  };

  const syncPendingDataNow = async () => {
    if (state.syncing) return { ...state };

    state.syncing = true;
    state.lastError = null;
    notify();

    try {
      const online = await deps.isOnlineNow();
      if (!online) {
        await refreshQueuedCount();
        return { ...state };
      }

      const flushResult = await deps.flushOfflineQueue();
      Object.assign(state, applyFlushResultToSyncState(state, flushResult, deps.now()));
    } catch (error) {
      state.lastError = toOfflineSyncErrorMessage(error);
    } finally {
      state.syncing = false;
      await refreshQueuedCount();
    }

    return { ...state };
  };

  const getOfflineSyncState = () => ({ ...state });

  const subscribeOfflineSyncState = (listener: (snapshot: OfflineSyncState) => void) => {
    subscribers.add(listener);
    listener({ ...state });
    return () => {
      subscribers.delete(listener);
    };
  };

  const startOfflineSyncListener = () => {
    if (stopListener) return stopListener;

    const unsubscribe = deps.addNetInfoListener((net) => {
      if (isNetworkReadyForSync(net)) {
        void syncPendingDataNow();
      }
    });

    stopListener = () => {
      unsubscribe();
      stopListener = null;
    };

    void refreshQueuedCount();
    return stopListener;
  };

  return {
    syncPendingDataNow,
    getOfflineSyncState,
    subscribeOfflineSyncState,
    startOfflineSyncListener,
  };
};
