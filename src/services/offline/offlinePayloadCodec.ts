type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

type DateMarker = {
  __type: 'date';
  value: string;
};

type TimestampMarker = {
  __type: 'timestamp';
  value: number;
};

type TimestampLike = {
  toDate?: () => Date;
  toMillis?: () => number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isTimestampLike = (value: unknown): value is TimestampLike =>
  isObject(value) && typeof value.toDate === 'function' && typeof value.toMillis === 'function';

const isDateMarker = (value: Record<string, unknown>): value is DateMarker =>
  value.__type === 'date' && typeof value.value === 'string';

const isTimestampMarker = (value: Record<string, unknown>): value is TimestampMarker =>
  value.__type === 'timestamp' && typeof value.value === 'number';

export const serializeOfflinePayload = (value: unknown): JsonValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }
  if (isTimestampLike(value)) {
    return { __type: 'timestamp', value: value.toMillis() };
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeOfflinePayload(item));
  }
  if (isObject(value)) {
    const out: Record<string, JsonValue> = {};
    Object.keys(value).forEach((key) => {
      out[key] = serializeOfflinePayload(value[key]);
    });
    return out;
  }
  return String(value);
};

export const deserializeOfflinePayload = (value: JsonValue): unknown => {
  if (value === null) return value;
  if (Array.isArray(value)) return value.map((item) => deserializeOfflinePayload(item));
  if (isObject(value)) {
    if (isDateMarker(value)) {
      return new Date(value.value);
    }
    if (isTimestampMarker(value)) {
      return new Date(value.value);
    }
    const out: Record<string, unknown> = {};
    Object.keys(value).forEach((key) => {
      out[key] = deserializeOfflinePayload(value[key]);
    });
    return out;
  }
  return value;
};
