import test from 'node:test';
import assert from 'node:assert/strict';

import { toDateSafe } from '../src/utils/date.ts';

test('toDateSafe supports timestamp-like values', () => {
  const date = toDateSafe({ seconds: 1710000000 });

  assert.ok(date instanceof Date);
  assert.equal(date?.getTime(), 1710000000 * 1000);
});

test('toDateSafe returns null for invalid input', () => {
  assert.equal(toDateSafe('not-a-date'), null);
});
