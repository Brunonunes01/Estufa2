import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOperationResult } from '../../src/services/operationResult.ts';
import { ServiceError } from '../../src/services/serviceError.ts';

test('write state contract never confuses interruption with confirmation', () => {
  const pending = assertOperationResult({ status: 'pending', logicalOperationId: 'op-1' });
  const confirmed = assertOperationResult({ status: 'confirmed', logicalOperationId: 'op-1', data: { id: 'record-1' } });
  const retryable = assertOperationResult({ status: 'retryable', logicalOperationId: 'op-1', error: new ServiceError('connectivity', 'Sem conexão') });
  const partial = assertOperationResult({ status: 'partial', logicalOperationId: 'op-1', completedSteps: ['header'], reconciliationAction: 'remove-header-or-complete-items', error: new ServiceError('unexpected', 'Falha parcial') });
  assert.deepEqual([pending.status, confirmed.status, retryable.status, partial.status], ['pending', 'confirmed', 'retryable', 'partial']);
});

test('double click shares one in-flight promise', async () => {
  let calls = 0;
  const inFlight = new Map<string, Promise<number>>();
  const execute = (id: string) => {
    const current = inFlight.get(id);
    if (current) return current;
    const operation = Promise.resolve().then(() => ++calls).finally(() => inFlight.delete(id));
    inFlight.set(id, operation);
    return operation;
  };
  const [first, second] = await Promise.all([execute('op-1'), execute('op-1')]);
  assert.equal(first, second);
  assert.equal(calls, 1);
});
