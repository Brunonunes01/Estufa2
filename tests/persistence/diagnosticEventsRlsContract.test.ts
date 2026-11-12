import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../../supabase/migrations/20261112090000_0033_diagnostic_events.sql', import.meta.url), 'utf8');

test('anonymous access is revoked and authenticated capabilities are explicit', () => {
  assert.match(sql, /revoke all on public\.diagnostic_events from anon, authenticated/i);
  assert.match(sql, /grant insert, select, delete on public\.diagnostic_events to authenticated/i);
  assert.doesNotMatch(sql, /grant update/i);
});

test('insert is restricted to actor and own membership', () => {
  assert.match(sql, /actor_user_id = auth\.uid\(\) and public\.is_tenant_member\(tenant_id\)/i);
});

test('read and delete require tenant sharing management while expired rows stay hidden', () => {
  assert.match(sql, /diagnostic_events_select[\s\S]*can_manage_sharing_tenant\(tenant_id\)[\s\S]*occurred_at >= now\(\) - interval '30 days'/i);
  assert.match(sql, /diagnostic_events_delete[\s\S]*can_manage_sharing_tenant\(tenant_id\)/i);
});

test('new insert cleans only expired rows of the same tenant', () => {
  assert.match(sql, /where tenant_id = new\.tenant_id and occurred_at < now\(\) - interval '30 days'/i);
});
