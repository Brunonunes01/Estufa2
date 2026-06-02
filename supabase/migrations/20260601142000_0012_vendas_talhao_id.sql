-- Permite analise financeira por talhao no cultivo a campo.

alter table public.vendas
  add column if not exists talhao_id uuid references public.talhoes(id) on delete set null;

create index if not exists vendas_talhao_idx on public.vendas(tenant_id, talhao_id);
