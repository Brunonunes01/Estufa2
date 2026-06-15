import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPasswordChangeErrorMessage,
  getPasswordVerificationErrorMessage,
  resolveServiceErrorMessage,
} from '../src/services/securityUiHelpers.ts';

test('resolveServiceErrorMessage usa a mensagem da excecao quando existir', () => {
  assert.equal(resolveServiceErrorMessage(new Error('falha real'), 'fallback'), 'falha real');
});

test('getPasswordChangeErrorMessage trata senha atual invalida', () => {
  assert.equal(getPasswordChangeErrorMessage(new Error('Senha atual invalida.')), 'Senha atual invalida.');
});

test('getPasswordChangeErrorMessage trata sessao expirada', () => {
  assert.equal(getPasswordChangeErrorMessage(new Error('Usuario nao autenticado.')), 'Sua sessao expirou. Entre novamente.');
});

test('getPasswordVerificationErrorMessage trata supabase indisponivel', () => {
  assert.equal(
    getPasswordVerificationErrorMessage(new Error('Supabase nao configurado.'), 'fallback'),
    'Ambiente de autenticacao indisponivel.'
  );
});

test('getPasswordVerificationErrorMessage usa fallback para erro generico', () => {
  assert.equal(getPasswordVerificationErrorMessage(new Error('erro x'), 'fallback'), 'fallback');
});
