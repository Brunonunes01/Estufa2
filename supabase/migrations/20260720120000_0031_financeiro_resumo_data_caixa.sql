-- Alinha o resumo financeiro mensal com a data em que o dinheiro entrou.
-- Vendas e contas a receber continuam no mes da venda; recebimentos usam a baixa.

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
    coalesce(sum(valor) filter (where status_pagamento = 'pago'), 0) as total_pago,
    coalesce(
      sum(valor) filter (where status_pagamento in ('pendente', 'atrasado')),
      0
    ) as total_pagar
  from public.despesas
  group by tenant_id, date_trunc('month', data_despesa)
),
referencias as (
  select tenant_id, referencia_mes from vendas_mensal
  union
  select tenant_id, referencia_mes from recebimentos_mensal
  union
  select tenant_id, referencia_mes from despesas_mensal
)
select
  referencias.tenant_id,
  referencias.referencia_mes,
  coalesce(recebimentos_mensal.total_recebido, 0) as total_recebido,
  coalesce(vendas_mensal.total_receber, 0) as total_receber,
  coalesce(despesas_mensal.total_pago, 0) as total_pago,
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
  and despesas_mensal.referencia_mes = referencias.referencia_mes;
