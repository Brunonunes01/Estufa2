-- Separa a data prevista de compensacao do cheque da data efetiva de recebimento.

alter table public.vendas
  add column if not exists data_compensacao_cheque timestamptz;

update public.vendas
set data_compensacao_cheque = coalesce(
  data_vencimento,
  data_venda + interval '15 days'
)
where coalesce(metodo_pagamento, forma_pagamento) = 'cheque'
  and data_compensacao_cheque is null;

create index if not exists idx_vendas_cheques_pendentes
on public.vendas (tenant_id, data_compensacao_cheque)
where status_pagamento in ('pendente', 'atrasado')
  and coalesce(metodo_pagamento, forma_pagamento) = 'cheque';
