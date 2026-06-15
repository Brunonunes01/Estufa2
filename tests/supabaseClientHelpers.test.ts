import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSupabaseStorageKey } from '../src/services/supabaseClientHelpers.ts';

test('resolveSupabaseStorageKey usa project ref da URL quando disponivel', () => {
  assert.equal(
    resolveSupabaseStorageKey('https://abc123.supabase.co'),
    'sge.supabase.auth.abc123'
  );
});

test('resolveSupabaseStorageKey faz fallback seguro com URL invalida', () => {
  assert.equal(resolveSupabaseStorageKey('not-a-url'), 'sge.supabase.auth');
  assert.equal(resolveSupabaseStorageKey(undefined), 'sge.supabase.auth');
});
