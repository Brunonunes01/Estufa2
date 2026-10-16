-- Registra a data real em que a despesa saiu do caixa.

alter table public.despesas
  add column if not exists data_pagamento timestamptz;

update public.despesas
set data_pagamento = data_despesa
where status_pagamento = 'pago'
  and data_pagamento is null;

create index if not exists idx_despesas_tenant_data_pagamento
on public.despesas (tenant_id, data_pagamento desc)
where status_pagamento = 'pago';

comment on column public.despesas.data_pagamento is
  'Data efetiva da saída de caixa. data_despesa preserva a competência/origem do gasto.';

-- Mantém compromissos no mês da despesa e pagamentos no mês da saída real.
create or replace view public.vw_financeiro_resumo as
with vendas_mensal as (
  select
    tenant_id,
    date_trunc('month', data_venda) as referencia_mes,
    coalesce(
      sum(valor_total)
        filter (where status_pagamento in ('pendente', 'atrasado')),
      0
    ) as total_receber
  from public.vendas
  group by tenant_id, date_trunc('month', data_venda)
),
recebimentos_mensal as (
  select
    tenant_id,
    date_trunc('month', coalesce(data_recebimento, data_venda)) as referencia_mes,
    coalesce(sum(coalesce(valor_recebido, valor_total)), 0) as total_recebido
  from public.vendas
  where status_pagamento = 'pago'
  group by
    tenant_id,
    date_trunc('month', coalesce(data_recebimento, data_venda))
),
despesas_mensal as (
  select
    tenant_id,
    date_trunc('month', data_despesa) as referencia_mes,
    coalesce(
      sum(valor) filter (where status_pagamento in ('pendente', 'atrasado')),
      0
    ) as total_pagar
  from public.despesas
  group by tenant_id, date_trunc('month', data_despesa)
),
pagamentos_mensal as (
  select
    tenant_id,
    date_trunc('month', coalesce(data_pagamento, data_despesa)) as referencia_mes,
    coalesce(sum(valor), 0) as total_pago
  from public.despesas
  where status_pagamento = 'pago'
  group by
    tenant_id,
    date_trunc('month', coalesce(data_pagamento, data_despesa))
),
referencias as (
  select tenant_id, referencia_mes from vendas_mensal
  union
  select tenant_id, referencia_mes from recebimentos_mensal
  union
  select tenant_id, referencia_mes from despesas_mensal
  union
  select tenant_id, referencia_mes from pagamentos_mensal
)
select
  referencias.tenant_id,
  referencias.referencia_mes,
  coalesce(recebimentos_mensal.total_recebido, 0) as total_recebido,
  coalesce(vendas_mensal.total_receber, 0) as total_receber,
  coalesce(pagamentos_mensal.total_pago, 0) as total_pago,
  coalesce(despesas_mensal.total_pagar, 0) as total_pagar
from referencias
left join vendas_mensal
  on vendas_mensal.tenant_id = referencias.tenant_id
  and vendas_mensal.referencia_mes = referencias.referencia_mes
left join recebimentos_mensal
  on recebimentos_mensal.tenant_id = referencias.tenant_id
  and recebimentos_mensal.referencia_mes = referencias.referencia_mes
left join despesas_mensal
  on despesas_mensal.tenant_id = referencias.tenant_id
  and despesas_mensal.referencia_mes = referencias.referencia_mes
left join pagamentos_mensal
  on pagamentos_mensal.tenant_id = referencias.tenant_id
  and pagamentos_mensal.referencia_mes = referencias.referencia_mes;
