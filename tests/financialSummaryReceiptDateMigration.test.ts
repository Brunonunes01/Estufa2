import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const migrationPath = fileURLToPath(
  new URL(
    '../supabase/migrations/20260720120000_0031_financeiro_resumo_data_caixa.sql',
    import.meta.url
  )
);
const sql = readFileSync(migrationPath, 'utf8');

test('resumo mensal agrupa recebimentos pela data real da baixa', () => {
  assert.match(
    sql,
    /date_trunc\('month',\s*coalesce\(data_recebimento,\s*data_venda\)\)/i
  );
  assert.match(sql, /where status_pagamento = 'pago'/i);
});

test('contas a receber continuam vinculadas ao mês da venda', () => {
  assert.match(
    sql,
    /date_trunc\('month',\s*data_venda\)[\s\S]+status_pagamento in \('pendente', 'atrasado'\)/i
  );
});
