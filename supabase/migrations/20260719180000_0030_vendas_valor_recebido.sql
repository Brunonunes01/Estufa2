alter table public.vendas
  add column if not exists valor_recebido numeric(14,2);

update public.vendas
set valor_recebido = valor_total
where status_pagamento = 'pago'
  and valor_recebido is null;

alter table public.vendas
  drop constraint if exists vendas_valor_recebido_nonnegative;

alter table public.vendas
  add constraint vendas_valor_recebido_nonnegative
  check (valor_recebido is null or valor_recebido >= 0) not valid;

alter table public.vendas
  validate constraint vendas_valor_recebido_nonnegative;

comment on column public.vendas.valor_recebido is
  'Valor efetivamente recebido na baixa. valor_total preserva o valor originalmente combinado.';

create or replace view public.vw_financeiro_resumo as
with vendas_mensal as (
  select
    tenant_id,
    date_trunc('month', data_venda) as referencia_mes,
    coalesce(
      sum(coalesce(valor_recebido, valor_total))
        filter (where status_pagamento = 'pago'),
      0
    ) as total_recebido,
    coalesce(
      sum(valor_total)
        filter (where status_pagamento in ('pendente', 'atrasado')),
      0
    ) as total_receber
  from public.vendas
  group by tenant_id, date_trunc('month', data_venda)
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
)
select
  coalesce(v.tenant_id, d.tenant_id) as tenant_id,
  coalesce(v.referencia_mes, d.referencia_mes) as referencia_mes,
  coalesce(v.total_recebido, 0) as total_recebido,
  coalesce(v.total_receber, 0) as total_receber,
  coalesce(d.total_pago, 0) as total_pago,
  coalesce(d.total_pagar, 0) as total_pagar
from vendas_mensal v
full join despesas_mensal d
  on d.tenant_id = v.tenant_id
  and d.referencia_mes = v.referencia_mes;
