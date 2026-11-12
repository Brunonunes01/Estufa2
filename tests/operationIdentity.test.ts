import test from 'node:test'; import assert from 'node:assert/strict';
import { createOperationIdentity, retryOperationIdentity } from '../src/services/operationIdentity.ts';
test('retry preserves logical operation and creates a physical correlation', () => { const first = createOperationIdentity(undefined, 1); const retry = retryOperationIdentity(first, 2); assert.equal(retry.logicalOperationId, first.logicalOperationId); assert.notEqual(retry.correlationId, first.correlationId); });
