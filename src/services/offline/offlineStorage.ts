import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { deserializeOfflinePayload, JsonValue, serializeOfflinePayload } from './offlinePayloadCodec';
import { isOfflineLikeError } from './offlineUtils';

const OFFLINE_QUEUE_KEY = '@sge/offline_queue_v1';

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
  | 'registrarColheitaHidroponica'
  | 'registrarVendaHidroponicaPorLote'
  | 'createVenda'
  | 'updateVenda'
  | 'deleteVenda'
  | 'receberVenda';

export type OfflineSyncMode = 'allow_queue' | 'online_only';
export type OfflineWriteOptions = { syncMode?: OfflineSyncMode };

type OfflineQueueItem = {
  id: string;
  action: OfflineActionName;
  payload: JsonValue;
  queuedAt: number;
  attempts: number;
};

const readQueue = async (): Promise<OfflineQueueItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: OfflineQueueItem[]) => {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const isOnlineNow = async () => {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true;
  }
};

export const enqueueOfflineAction = async (
  action: OfflineActionName,
  payload: unknown
) => {
  const queue = await readQueue();
  const nextItem: OfflineQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    action,
    payload: serializeOfflinePayload(payload),
    queuedAt: Date.now(),
    attempts: 0,
  };
  queue.push(nextItem);
  await writeQueue(queue);
  return nextItem.id;
};

export const getOfflineQueueSize = async () => {
  const queue = await readQueue();
  return queue.length;
};

type FlushResult = {
  flushed: number;
  pending: number;
  failed: number;
};

export const flushOfflineQueue = async (): Promise<FlushResult> => {
  const online = await isOnlineNow();
  if (!online) {
    const queue = await readQueue();
    return { flushed: 0, pending: queue.length, failed: 0 };
  }

  const queue = await readQueue();
  if (queue.length === 0) return { flushed: 0, pending: 0, failed: 0 };

  // Import dinamico para evitar ciclos no load inicial.
  const { executeOfflineAction } = await import('./offlineStorageHandlers');

  const remaining: OfflineQueueItem[] = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await executeOfflineAction(item.action, deserializeOfflinePayload(item.payload));
      flushed += 1;
    } catch (error) {
      failed += 1;
      if (isOfflineLikeError(error)) {
        // Se caiu rede no meio, mantem este e os proximos.
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
