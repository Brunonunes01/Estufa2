export const SERVICE_ERROR_CATEGORIES = [
  'validation', 'authentication', 'authorization', 'conflict',
  'connectivity', 'availability', 'data-contract', 'unexpected',
] as const;

export type ServiceErrorCategory = (typeof SERVICE_ERROR_CATEGORIES)[number];

export type ServiceErrorContext = {
  operation?: string;
  source?: string;
  tenantId?: string;
  field?: string;
  correlationId?: string;
  [key: string]: unknown;
};

const SENSITIVE_KEY = /(token|password|senha|secret|key|session|cookie|authorization)/i;

export const sanitizeServiceErrorContext = (context: ServiceErrorContext = {}) =>
  Object.fromEntries(Object.entries(context).filter(([key]) => !SENSITIVE_KEY.test(key)));

export class ServiceError extends Error {
  readonly category: ServiceErrorCategory;
  readonly context: ServiceErrorContext;
  readonly cause?: unknown;

  constructor(category: ServiceErrorCategory, message: string, options: { cause?: unknown; context?: ServiceErrorContext } = {}) {
    super(message, { cause: options.cause });
    this.name = 'ServiceError';
    this.category = category;
    this.context = sanitizeServiceErrorContext(options.context);
    this.cause = options.cause;
  }
}

export const toServiceError = (error: unknown, fallback = 'Não foi possível concluir a operação.') => {
  if (error instanceof ServiceError) return error;
  const message = error instanceof Error && error.message ? error.message : fallback;
  return new ServiceError('unexpected', message, { cause: error });
};
