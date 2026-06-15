import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDateTimeValue,
  formatDateValue,
  getTenantMembersPermissionMessage,
  normalizeInviteCodeInput,
  resolveShareScreenErrorMessage,
} from '../src/services/shareAccountHelpers.ts';

test('normalizeInviteCodeInput remove espacos, sobe para uppercase e respeita limite', () => {
  assert.equal(normalizeInviteCodeInput(' ab 12 cd ', 6), 'AB12CD');
});

test('resolveShareScreenErrorMessage usa fallback quando nao ha mensagem', () => {
  assert.equal(resolveShareScreenErrorMessage({}, 'fallback'), 'fallback');
});

test('getTenantMembersPermissionMessage detecta restricao de administrador', () => {
  assert.equal(
    getTenantMembersPermissionMessage(new Error('Somente administradores podem listar membros.')),
    'Apenas administradores deste tenant podem gerenciar parceiros.'
  );
});

test('formatDateValue usa fallback para valor invalido', () => {
  assert.equal(formatDateValue('invalido', 'fallback'), 'fallback');
});

test('formatDateTimeValue formata objeto com toDate', () => {
  const value = {
    toDate: () => new Date('2026-06-14T10:30:00Z'),
  };
  assert.match(formatDateTimeValue(value), /\d{2}\/\d{2}\/\d{4}/);
});
