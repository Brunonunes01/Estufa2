import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyRedeemAttempt,
  getRedeemCooldownSeconds,
  normalizeShareCode,
  shouldResetRedeemWindow,
  validateNormalizedShareCode,
} from '../src/services/shareRedeemHelpers.ts';

test('normalizeShareCode normaliza caixa e espacos', () => {
  assert.equal(normalizeShareCode(' abcd1234 '), 'ABCD1234');
});

test('validateNormalizedShareCode rejeita codigo vazio ou curto', () => {
  assert.throws(() => validateNormalizedShareCode(''), /Codigo invalido/i);
  assert.throws(() => validateNormalizedShareCode('ABC', 5), /5\+ caracteres/i);
});

test('shouldResetRedeemWindow identifica janela expirada', () => {
  assert.equal(
    shouldResetRedeemWindow({ attempts: 1, windowStartedAt: 0, blockedUntil: 0 }, 1001, 1000),
    true
  );
});

test('applyRedeemAttempt incrementa tentativa e aplica cooldown', () => {
  const next = applyRedeemAttempt(
    { attempts: 1, windowStartedAt: 1000, blockedUntil: 0 },
    false,
    1500,
    10000,
    2,
    3000
  );

  assert.equal(next.attempts, 2);
  assert.equal(next.blockedUntil, 4500);
});

test('getRedeemCooldownSeconds arredonda para cima', () => {
  assert.equal(getRedeemCooldownSeconds(4500, 2001), 3);
});
