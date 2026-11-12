import type { ServiceError } from './serviceError.ts';
export type OperationResult<T> =
  | { status: 'pending'; logicalOperationId: string }
  | { status: 'confirmed'; logicalOperationId: string; data: T }
  | { status: 'degraded'; logicalOperationId: string; data: T; warnings: ServiceError[] }
  | { status: 'retryable'; logicalOperationId: string; error: ServiceError }
  | { status: 'partial'; logicalOperationId: string; completedSteps: string[]; reconciliationAction: string; error: ServiceError }
  | { status: 'terminal'; logicalOperationId: string; error: ServiceError };
export const assertOperationResult = <T>(result: OperationResult<T>): OperationResult<T> => {
  if (!result.logicalOperationId.trim()) throw new Error('logicalOperationId is required');
  if (result.status === 'partial' && (result.completedSteps.length === 0 || !result.reconciliationAction.trim())) throw new Error('partial result requires completedSteps and reconciliationAction');
  return result;
};
export const canTransitionOperation = (from: OperationResult<unknown>['status'], to: OperationResult<unknown>['status']) => ({ pending: ['confirmed', 'degraded', 'retryable', 'partial', 'terminal'], retryable: ['pending', 'confirmed', 'partial', 'terminal'], degraded: ['confirmed', 'retryable', 'terminal'], partial: ['confirmed', 'retryable', 'terminal'], confirmed: [], terminal: [] } satisfies Record<OperationResult<unknown>['status'], OperationResult<unknown>['status'][]>)[from].includes(to);
