export const SERVICE_ERROR_CATEGORIES = ['validation', 'authentication', 'authorization', 'conflict', 'connectivity', 'availability', 'data-contract', 'unexpected'] as const;
export type ServiceErrorCategory = (typeof SERVICE_ERROR_CATEGORIES)[number];
export type ServiceErrorRetryability = 'never' | 'manual' | 'automatic';
export type SafeJsonValue = string | number | boolean | null | SafeJsonValue[] | { [key: string]: SafeJsonValue };
export type ServiceErrorContext = Record<string, unknown> & { operation?: string; source?: string; tenantId?: string; field?: string; correlationId?: string };
export type ServiceErrorOptions = { cause?: unknown; context?: ServiceErrorContext; code?: string; operation?: string; source?: string; nextStep?: string; retryability?: ServiceErrorRetryability; correlationId?: string; field?: string };

const SENSITIVE_KEY = /(token|password|senha|secret|key|session|cookie|authorization)/i;
const sanitizeValue = (value: unknown, depth: number): SafeJsonValue | undefined => {
  if (depth > 6) return '[truncated]';
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1) ?? null);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !SENSITIVE_KEY.test(key)).slice(0, 50).flatMap(([key, nested]) => {
      const safe = sanitizeValue(nested, depth + 1); return safe === undefined ? [] : [[key, safe]];
    }));
  return undefined;
};
export const sanitizeServiceErrorContext = (context: ServiceErrorContext = {}): Record<string, SafeJsonValue> => {
  const safe = sanitizeValue(context, 0);
  return safe && !Array.isArray(safe) && typeof safe === 'object' ? safe as Record<string, SafeJsonValue> : {};
};
const defaultRetryability = (category: ServiceErrorCategory): ServiceErrorRetryability =>
  category === 'connectivity' || category === 'availability' ? 'automatic' : category === 'conflict' || category === 'unexpected' ? 'manual' : 'never';

export class ServiceError extends Error {
  readonly category: ServiceErrorCategory; readonly code: string; readonly operation: string; readonly source: string;
  readonly safeMessage: string; readonly nextStep: string; readonly retryability: ServiceErrorRetryability;
  readonly correlationId: string; readonly field?: string; readonly safeContext: Record<string, SafeJsonValue>;
  readonly context: Record<string, SafeJsonValue>; readonly cause?: unknown;
  constructor(category: ServiceErrorCategory, safeMessage: string, options: ServiceErrorOptions = {}) {
    super(safeMessage, { cause: options.cause }); this.name = 'ServiceError'; this.category = category;
    this.code = options.code ?? `app.${category}`; this.operation = options.operation ?? String(options.context?.operation ?? 'unknown');
    this.source = options.source ?? String(options.context?.source ?? 'app'); this.safeMessage = safeMessage;
    this.nextStep = options.nextStep ?? 'Tente novamente ou procure suporte informando o codigo da operacao.';
    this.retryability = options.retryability ?? defaultRetryability(category);
    this.correlationId = options.correlationId ?? String(options.context?.correlationId ?? 'unavailable');
    this.field = options.field ?? (typeof options.context?.field === 'string' ? options.context.field : undefined);
    this.safeContext = sanitizeServiceErrorContext(options.context); this.context = this.safeContext; this.cause = options.cause;
  }
  toSafeObject() { return { category: this.category, code: this.code, operation: this.operation, source: this.source, safeMessage: this.safeMessage, nextStep: this.nextStep, retryability: this.retryability, correlationId: this.correlationId, ...(this.field ? { field: this.field } : {}), safeContext: this.safeContext }; }
}
export const toServiceError = (error: unknown, fallback = 'Nao foi possivel concluir a operacao.') => error instanceof ServiceError ? error : new ServiceError('unexpected', fallback, { cause: error });
