import test from 'node:test';
import assert from 'node:assert/strict';

import { canChangePassword, normalizePasswordForVerification } from '../src/services/securityServiceHelpers.ts';

test('normalizePasswordForVerification remove espacos laterais', () => {
  assert.equal(normalizePasswordForVerification(' 123456 '), '123456');
});

test('canChangePassword rejeita senha atual invalida', () => {
  assert.throws(() => canChangePassword(false), /Senha atual invalida/i);
});

test('canChangePassword aceita troca quando validada', () => {
  assert.equal(canChangePassword(true), undefined);
});
