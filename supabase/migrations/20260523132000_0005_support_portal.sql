create or replace function public.is_support_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_support_agent = true or p.role = 'admin')
  );
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_support_agent()
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = auth.uid()
        and tm.can_read = true
    );
$$;

create or replace function public.can_write_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_support_agent()
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = auth.uid()
        and tm.can_write = true
    );
$$;

create or replace function public.can_delete_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_support_agent()
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = auth.uid()
        and tm.can_delete = true
    );
$$;

create or replace function public.can_manage_sharing_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_support_agent()
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = auth.uid()
        and tm.can_manage_sharing = true
    );
$$;

create table if not exists public.support_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  action text not null,
  note text not null,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_support_audit_updated_at'
  ) then
    create trigger trg_support_audit_updated_at
    before update on public.support_audit
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

alter table public.support_audit enable row level security;

drop policy if exists support_audit_select on public.support_audit;
create policy support_audit_select
on public.support_audit
for select
using (public.is_support_agent());

drop policy if exists support_audit_insert on public.support_audit;
create policy support_audit_insert
on public.support_audit
for insert
with check (public.is_support_agent());

create index if not exists idx_support_audit_tenant_created
on public.support_audit(tenant_id, created_at desc);
