import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const migrationPath = fileURLToPath(
  new URL(
    '../supabase/migrations/20260719120000_0028_permanent_field_cycle_deletion.sql',
    import.meta.url
  )
);
const sql = readFileSync(migrationPath, 'utf8');

test('exclusão permanente do ciclo é restrita ao proprietário', () => {
  assert.match(sql, /t\.owner_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(
    sql,
    /Somente o proprietário pode excluir permanentemente este ciclo/i
  );
});

test('exclusão permanente remove todo o histórico operacional vinculado', () => {
  for (const table of [
    'rastreabilidade_eventos',
    'vendas',
    'colheitas',
    'aplicacoes',
    'manejos',
    'tarefas_agricolas',
    'despesas',
    'plantios',
  ]) {
    assert.match(sql, new RegExp(`delete\\s+from\\s+public\\.${table}`, 'i'));
  }

  assert.doesNotMatch(sql, /set\s+status\s*=\s*'cancelado'/i);
});

test('estoque consumido é recomposto antes de apagar aplicações', () => {
  const restorePosition = sql.search(/update\s+public\.insumos/i);
  const deleteApplicationsPosition = sql.search(
    /delete\s+from\s+public\.aplicacoes/i
  );

  assert.ok(restorePosition >= 0, 'a migration deve recompor o estoque');
  assert.ok(
    deleteApplicationsPosition > restorePosition,
    'o estoque deve ser recomposto antes da exclusão'
  );
});
