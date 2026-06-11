import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { isOfflineLikeError, shouldAllowQueue } from './offlineUtils';

const OFFLINE_QUEUE_KEY = '@sge/offline_queue_v1';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const serializeValue = (value: any): JsonValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }
  if (typeof value?.toDate === 'function' && typeof value?.toMillis === 'function') {
    return { __type: 'timestamp', value: value.toMillis() };
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }
  if (isObject(value)) {
    const out: Record<string, JsonValue> = {};
    Object.keys(value).forEach((key) => {
      out[key] = serializeValue(value[key]);
    });
    return out;
  }
  return String(value);
};

const deserializeValue = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => deserializeValue(item));
  if (isObject(value)) {
    if (value.__type === 'date' && typeof value.value === 'string') {
      return new Date(value.value);
    }
    if (value.__type === 'timestamp' && typeof value.value === 'number') {
      // Mantemos Date; os services já convertem para Timestamp quando necessário.
      return new Date(value.value);
    }
    const out: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      out[key] = deserializeValue(value[key]);
    });
    return out;
  }
  return value;
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
    payload: serializeValue(payload),
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

  // Import dinâmico para evitar ciclos no load inicial.
  const { executeOfflineAction } = await import('./offlineStorageHandlers');

  const remaining: OfflineQueueItem[] = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await executeOfflineAction(item.action, deserializeValue(item.payload));
      flushed += 1;
    } catch (error) {
      failed += 1;
      if (isOfflineLikeError(error)) {
        // Se caiu rede no meio, mantém este e os próximos.
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

