-- Modulo inicial de cultivo a campo: cadastro de talhoes.

create or replace function public.can_read_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.tenant_memberships tm
     where tm.tenant_id = p_tenant_id
       and tm.user_id = auth.uid()
       and tm.can_read = true
  )
  or exists (
    select 1
      from public.tenants t
     where t.id = p_tenant_id
       and t.owner_user_id = auth.uid()
  );
$$;

create table if not exists public.talhoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  codigo text,
  cultura_principal text,
  area_hectares numeric(10,2),
  tipo_solo text,
  cidade text,
  observacoes text,
  status text not null default 'ativo',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists talhoes_tenant_idx on public.talhoes(tenant_id);
create index if not exists talhoes_nome_idx on public.talhoes(tenant_id, nome);

alter table public.talhoes enable row level security;

drop policy if exists talhoes_select on public.talhoes;
create policy talhoes_select
  on public.talhoes
  for select
  using (public.can_read_tenant(tenant_id));

drop policy if exists talhoes_insert on public.talhoes;
create policy talhoes_insert
  on public.talhoes
  for insert
  with check (public.can_write_tenant(tenant_id));

drop policy if exists talhoes_update on public.talhoes;
create policy talhoes_update
  on public.talhoes
  for update
  using (public.can_write_tenant(tenant_id))
  with check (public.can_write_tenant(tenant_id));

drop policy if exists talhoes_delete on public.talhoes;
create policy talhoes_delete
  on public.talhoes
  for delete
  using (public.can_write_tenant(tenant_id));
