import type { OfflineSyncState } from './syncService';

export type FlushResultLike = {
  flushed: number;
  pending: number;
  failed: number;
};

export const isNetworkReadyForSync = (net: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) =>
  !!net.isConnected && net.isInternetReachable !== false;

export const applyFlushResultToSyncState = (
  state: OfflineSyncState,
  flushResult: FlushResultLike,
  syncedAt: number
): OfflineSyncState => ({
  ...state,
  flushed: flushResult.flushed,
  failed: flushResult.failed,
  queued: flushResult.pending,
  lastSyncAt: syncedAt,
  lastError: null,
});

export const toOfflineSyncErrorMessage = (error: unknown) =>
  String(
    (error && typeof error === 'object' && 'message' in error
      ? (error as { message?: string | null }).message
      : null) || 'Falha ao sincronizar dados pendentes.'
  );
