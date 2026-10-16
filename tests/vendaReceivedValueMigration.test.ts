import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const migrationPath = fileURLToPath(
  new URL(
    '../supabase/migrations/20260719180000_0030_vendas_valor_recebido.sql',
    import.meta.url
  )
);
const sql = readFileSync(migrationPath, 'utf8');

test('valor recebido preserva separadamente o preço combinado', () => {
  assert.match(sql, /add column if not exists valor_recebido numeric\(14,2\)/i);
  assert.match(sql, /valor_recebido is null or valor_recebido >= 0/i);
});

test('vendas pagas antigas recebem o valor combinado como fallback', () => {
  assert.match(
    sql,
    /set valor_recebido = valor_total[\s\S]+status_pagamento = 'pago'/i
  );
});

test('resumo financeiro soma o valor efetivamente recebido', () => {
  assert.match(
    sql,
    /sum\(coalesce\(valor_recebido, valor_total\)\)[\s\S]+status_pagamento = 'pago'/i
  );
});
