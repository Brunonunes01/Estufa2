import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const migrationPath = fileURLToPath(
  new URL(
    '../supabase/migrations/20260810120000_0032_despesas_data_pagamento.sql',
    import.meta.url
  )
);
const sql = readFileSync(migrationPath, 'utf8');

test('despesas registram e retroalimentam a data efetiva do pagamento', () => {
  assert.match(sql, /add column if not exists data_pagamento timestamptz/i);
  assert.match(
    sql,
    /set data_pagamento = data_despesa[\s\S]+status_pagamento = 'pago'/i
  );
});

test('resumo mensal agrupa pagamentos pela data real da saída', () => {
  assert.match(
    sql,
    /date_trunc\('month',\s*coalesce\(data_pagamento,\s*data_despesa\)\)/i
  );
  assert.match(sql, /pagamentos_mensal[\s\S]+where status_pagamento = 'pago'/i);
});

test('contas a pagar continuam vinculadas ao mês da despesa', () => {
  assert.match(
    sql,
    /date_trunc\('month',\s*data_despesa\)[\s\S]+status_pagamento in \('pendente', 'atrasado'\)/i
  );
});
