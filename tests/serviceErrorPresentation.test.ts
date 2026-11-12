import test from 'node:test'; import assert from 'node:assert/strict';
import { SERVICE_ERROR_CATEGORIES, ServiceError } from '../src/services/serviceError.ts';
import { presentServiceError } from '../src/services/serviceErrorPresentation.ts';

for (const category of SERVICE_ERROR_CATEGORIES) for (const operation of ['load', 'save', 'delete', 'sync']) test(`${category}/${operation} has actionable safe feedback`, () => {
  const error = new ServiceError(category, 'Mensagem segura.', { operation, nextStep: 'Proximo passo seguro.' });
  const result = presentServiceError(error, operation);
  assert.match(result.message, /Nao foi possivel/); assert.equal(result.nextStep, 'Proximo passo seguro.'); assert.equal(result.message.includes('provider'), false);
});
