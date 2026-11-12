import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_ERROR_CATEGORIES, ServiceError, sanitizeServiceErrorContext, toServiceError } from '../src/services/serviceError.ts';
import { sensitiveContextFixture } from './helpers/errorHandlingFixtures.ts';

test('service error supports the complete taxonomy', () => {
  assert.deepEqual(SERVICE_ERROR_CATEGORIES, ['validation', 'authentication', 'authorization', 'conflict', 'connectivity', 'availability', 'data-contract', 'unexpected']);
  for (const category of SERVICE_ERROR_CATEGORIES) assert.equal(new ServiceError(category, 'safe').category, category);
});

test('service error recursively sanitizes objects and arrays before serialization', () => {
  const error = new ServiceError('unexpected', 'Mensagem segura', {
    context: sensitiveContextFixture,
    operation: 'save', source: 'test', correlationId: 'try-1',
  });
  const serialized = JSON.stringify(error.toSafeObject());
  assert.equal(serialized.includes('must-not-survive'), false);
  assert.equal(serialized.includes('retained'), true);
  assert.equal('cause' in error.toSafeObject(), false);
});

test('service error preserves cause and sanitizes sensitive context', () => {
  const cause = new Error('provider detail');
  const error = new ServiceError('availability', 'Serviço indisponível.', { cause, context: { operation: 'load', token: 'secret', session: { access_token: 'secret' } } });
  assert.equal(error.cause, cause);
  assert.deepEqual(error.context, { operation: 'load' });
  assert.deepEqual(sanitizeServiceErrorContext({ password: 'x', source: 'api' }), { source: 'api' });
  assert.equal(toServiceError(cause).cause, cause);
});
