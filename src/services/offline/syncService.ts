import NetInfo from '@react-native-community/netinfo';

import { flushOfflineQueue, getOfflineQueueSize, isOnlineNow, resolveActiveOfflineQueueScope } from './offlineStorage.ts';
import { createOfflineSyncService } from './syncServiceCore.ts';
import { syncDiagnosticEvidence } from '../diagnosticEvidenceSync.ts';

export { createOfflineSyncService, type OfflineSyncState } from './syncServiceCore.ts';

const defaultOfflineSyncService = createOfflineSyncService({
  isOnlineNow,
  flushOfflineQueue,
  getOfflineQueueSize,
  flushDiagnosticEvidence: async () => {
    const scope = await resolveActiveOfflineQueueScope();
    if (scope) await syncDiagnosticEvidence(scope);
  },
  addNetInfoListener: (listener) => NetInfo.addEventListener(listener),
  now: () => Date.now(),
});

export const syncPendingDataNow = defaultOfflineSyncService.syncPendingDataNow;
export const getOfflineSyncState = defaultOfflineSyncService.getOfflineSyncState;
export const subscribeOfflineSyncState = defaultOfflineSyncService.subscribeOfflineSyncState;
export const startOfflineSyncListener = defaultOfflineSyncService.startOfflineSyncListener;
