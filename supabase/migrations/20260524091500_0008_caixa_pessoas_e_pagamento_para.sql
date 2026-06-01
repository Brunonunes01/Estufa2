create table if not exists public.caixa_pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_caixa_pessoas_updated_at'
  ) then
    create trigger trg_caixa_pessoas_updated_at
    before update on public.caixa_pessoas
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

alter table public.caixa_pessoas enable row level security;

drop policy if exists caixa_pessoas_select on public.caixa_pessoas;
create policy caixa_pessoas_select
on public.caixa_pessoas
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists caixa_pessoas_insert on public.caixa_pessoas;
create policy caixa_pessoas_insert
on public.caixa_pessoas
for insert
with check (public.can_write_tenant(tenant_id));

drop policy if exists caixa_pessoas_update on public.caixa_pessoas;
create policy caixa_pessoas_update
on public.caixa_pessoas
for update
using (public.can_write_tenant(tenant_id))
with check (public.can_write_tenant(tenant_id));

drop policy if exists caixa_pessoas_delete on public.caixa_pessoas;
create policy caixa_pessoas_delete
on public.caixa_pessoas
for delete
using (public.can_delete_tenant(tenant_id));

create index if not exists idx_caixa_pessoas_tenant_nome
on public.caixa_pessoas (tenant_id, nome);

alter table public.vendas
  add column if not exists pagamento_para uuid references public.caixa_pessoas(id) on delete set null;

create index if not exists idx_vendas_pagamento_para
on public.vendas (pagamento_para);
