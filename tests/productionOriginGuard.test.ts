import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertProductionOriginNotMixed,
  hasMixedProductionOrigin,
} from '../src/services/productionOriginGuard.ts';

test('aceita origem exclusiva de campo ou estufa', () => {
  assert.equal(hasMixedProductionOrigin({ talhaoId: 'talhao-1' }), false);
  assert.equal(hasMixedProductionOrigin({ estufaId: 'estufa-1' }), false);
  assert.equal(hasMixedProductionOrigin({}), false);
});

test('bloqueia registro vinculado a campo e estufa simultaneamente', () => {
  assert.equal(
    hasMixedProductionOrigin({ talhaoId: 'talhao-1', estufaId: 'estufa-1' }),
    true
  );
  assert.throws(
    () =>
      assertProductionOriginNotMixed(
        { talhaoId: 'talhao-1', estufaId: 'estufa-1' },
        'Venda'
      ),
    /Venda não pode pertencer ao Campo e à Estufa ao mesmo tempo/
  );
});
