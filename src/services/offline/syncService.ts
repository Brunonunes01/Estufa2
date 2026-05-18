import NetInfo from '@react-native-community/netinfo';
import { waitForPendingWrites } from '../../compat/firestore';
import { db } from '../firebaseConfig';
import { flushOfflineQueue, getOfflineQueueSize, isOnlineNow } from './offlineStorage';
import { isSupabaseBackend } from '../backendConfig';

export type OfflineSyncState = {
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
  queued: number;
  flushed: number;
  failed: number;
};

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
  state.queued = await getOfflineQueueSize();
  notify();
};

const syncInternal = async () => {
  if (state.syncing) return { ...state };

  state.syncing = true;
  state.lastError = null;
  notify();

  try {
    const online = await isOnlineNow();
    if (!online) {
      await refreshQueuedCount();
      return { ...state };
    }

    const flushResult = await flushOfflineQueue();
    state.flushed = flushResult.flushed;
    state.failed = flushResult.failed;
    state.queued = flushResult.pending;

    // Em Firebase aguardamos pendências internas do cache local.
    if (!isSupabaseBackend()) {
      await waitForPendingWrites(db);
    }

    state.lastSyncAt = Date.now();
    state.lastError = null;
  } catch (error: any) {
    state.lastError = String(error?.message || 'Falha ao sincronizar dados pendentes.');
  } finally {
    state.syncing = false;
    await refreshQueuedCount();
  }

  return { ...state };
};

export const syncPendingDataNow = async () => syncInternal();

export const getOfflineSyncState = () => ({ ...state });

export const subscribeOfflineSyncState = (listener: (snapshot: OfflineSyncState) => void) => {
  subscribers.add(listener);
  listener({ ...state });
  return () => {
    subscribers.delete(listener);
  };
};

export const startOfflineSyncListener = () => {
  if (stopListener) return stopListener;

  const unsubscribe = NetInfo.addEventListener((net) => {
    if (net.isConnected && net.isInternetReachable !== false) {
      void syncInternal();
    }
  });

  stopListener = () => {
    unsubscribe();
    stopListener = null;
  };

  void refreshQueuedCount();
  return stopListener;
};
