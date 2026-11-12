import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('local database contract contains diagnostic_events from migration 0033', () => {
  const types = fs.readFileSync(new URL('../../src/types/supabase.ts', import.meta.url), 'utf8');
  for (const field of ['actor_user_id', 'category', 'code', 'correlation_id', 'occurred_at', 'operation', 'safe_context', 'source', 'tenant_id']) assert.match(types, new RegExp(`${field}:`));
  assert.match(types, /diagnostic_events:/);
});
