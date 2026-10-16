import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const migrationPath = fileURLToPath(
  new URL(
    '../supabase/migrations/20260719150000_0029_permanent_talhao_deletion.sql',
    import.meta.url
  )
);
const sql = readFileSync(migrationPath, 'utf8');

test('exclusão permanente do talhão é restrita ao proprietário', () => {
  assert.match(sql, /t\.owner_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(
    sql,
    /Somente o proprietário pode excluir permanentemente este talhão/i
  );
});

test('cada ciclo do talhão usa a exclusão permanente atômica', () => {
  assert.match(
    sql,
    /for\s+cycle_record\s+in[\s\S]+p\.talhao_id\s*=\s*p_talhao_id/i
  );
  assert.match(sql, /public\.remove_field_cycle\(cycle_record\.id\)/i);
  assert.doesNotMatch(sql, /set\s+status\s*=\s*'inativo'/i);
});

test('vendas diretas e o talhão são excluídos depois dos ciclos', () => {
  const cycleDeletePosition = sql.search(/public\.remove_field_cycle/i);
  const directSalesPosition = sql.search(/delete\s+from\s+public\.vendas/i);
  const talhaoPosition = sql.search(/delete\s+from\s+public\.talhoes/i);

  assert.ok(cycleDeletePosition >= 0);
  assert.ok(directSalesPosition > cycleDeletePosition);
  assert.ok(talhaoPosition > directSalesPosition);
});
