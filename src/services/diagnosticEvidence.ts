import { sanitizeServiceErrorContext, type SafeJsonValue, type ServiceError } from './serviceError.ts';

export type DiagnosticScope = { authUserId: string; tenantId: string };
export type DiagnosticEvent = { id: string; createdAt: number; category: string; code: string; operation: string; source: string; correlationId: string; safeContext: Record<string, SafeJsonValue> };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const DAY = 86_400_000;
const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const value = Math.floor(Math.random() * 16);
  return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
});
export const diagnosticStorageKey = (scope: DiagnosticScope) => `diagnostic-evidence:v1:${scope.authUserId}:${scope.tenantId}`;

export const createDiagnosticEvidenceBuffer = (storage: Storage, now = () => Date.now()) => {
  const read = async (scope: DiagnosticScope): Promise<DiagnosticEvent[]> => { try { const value = JSON.parse(await storage.getItem(diagnosticStorageKey(scope)) ?? '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const prune = (events: DiagnosticEvent[]) => events.filter((event) => now() - event.createdAt <= 7 * DAY).sort((a, b) => a.createdAt - b.createdAt).slice(-200);
  const append = async (scope: DiagnosticScope, error: ServiceError) => {
    const event: DiagnosticEvent = { id: createUuid(), createdAt: now(), category: error.category, code: error.code, operation: error.operation, source: error.source, correlationId: error.correlationId, safeContext: sanitizeServiceErrorContext(error.safeContext) };
    const events = prune([...(await read(scope)), event]); await storage.setItem(diagnosticStorageKey(scope), JSON.stringify(events)); return event;
  };
  const nextBatch = async (scope: DiagnosticScope, limit = 50) => prune(await read(scope)).slice(0, Math.min(50, Math.max(0, limit)));
  const remove = async (scope: DiagnosticScope, ids: string[]) => { const set = new Set(ids); await storage.setItem(diagnosticStorageKey(scope), JSON.stringify(prune(await read(scope)).filter((event) => !set.has(event.id)))); };
  return { append, read: async (scope: DiagnosticScope) => prune(await read(scope)), nextBatch, remove };
};
