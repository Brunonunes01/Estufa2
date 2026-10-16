-- Registra quando o dinheiro realmente entrou no caixa.

alter table public.vendas
  add column if not exists data_recebimento timestamptz;

update public.vendas
set data_recebimento = data_venda
where status_pagamento = 'pago'
  and data_recebimento is null;

create index if not exists idx_vendas_tenant_data_recebimento
on public.vendas (tenant_id, data_recebimento desc)
where status_pagamento = 'pago';
