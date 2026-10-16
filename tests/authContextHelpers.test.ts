import assert from 'node:assert/strict';
import test from 'node:test';

import { toAuthBootstrapErrorMessage } from '../src/contexts/authContextHelpers.ts';

test('toAuthBootstrapErrorMessage usa mensagem explicita do erro', () => {
  assert.equal(
    toAuthBootstrapErrorMessage(new Error('Supabase nao configurado.')),
    'Supabase nao configurado.'
  );
});

test('toAuthBootstrapErrorMessage aplica fallback seguro', () => {
  assert.equal(
    toAuthBootstrapErrorMessage({ message: '' }),
    'Nao foi possivel inicializar a autenticacao.'
  );
});
