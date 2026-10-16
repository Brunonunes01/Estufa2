import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient.ts';
import { loadPersistedTenantSelection } from '../tenantSelectionStorage.ts';
import {
  createOfflineQueueStorage,
  type OfflineQueueScope,
} from './offlineQueueStorage.ts';

const OFFLINE_QUEUE_KEY = '@sge/offline_queue_v1';

export type OfflineSyncMode = 'allow_queue' | 'online_only';
export type OfflineWriteOptions = { syncMode?: OfflineSyncMode };
export type { OfflineActionName, OfflineQueueItem, OfflineQueueScope } from './offlineQueueStorage.ts';

export const isOnlineNow = async () => {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true;
  }
};

export const resolveActiveOfflineQueueScope = async (): Promise<OfflineQueueScope | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;

    const authUserId = String(data.session?.user?.id || '').trim();
    if (!authUserId) return null;

    const persistedTenantId = (await loadPersistedTenantSelection(authUserId)).trim();
    return {
      authUserId,
      tenantId: persistedTenantId || authUserId,
    };
  } catch {
    return null;
  }
};

const defaultOfflineQueueStorage = createOfflineQueueStorage({
  storage: AsyncStorage,
  queueKey: OFFLINE_QUEUE_KEY,
  isOnlineNow,
  resolveActiveScope: resolveActiveOfflineQueueScope,
  executeOfflineAction: async (action, payload) => {
    // Import dinamico para evitar ciclos no load inicial.
    const { executeOfflineAction } = await import('./offlineStorageHandlers.ts');
    await executeOfflineAction(action, payload);
  },
});

export const enqueueOfflineAction = defaultOfflineQueueStorage.enqueueOfflineAction;
export const getOfflineQueueSize = defaultOfflineQueueStorage.getOfflineQueueSize;
export const flushOfflineQueue = defaultOfflineQueueStorage.flushOfflineQueue;
