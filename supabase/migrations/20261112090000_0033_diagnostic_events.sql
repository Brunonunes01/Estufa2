-- Diagnostic evidence for spec 007. Remote execution requires separate authorization.
create table public.diagnostic_events (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null check (category in ('validation','authentication','authorization','conflict','connectivity','availability','data-contract','unexpected')),
  code text not null check (char_length(code) between 1 and 120),
  operation text not null check (char_length(operation) between 1 and 120),
  source text not null check (char_length(source) between 1 and 120),
  correlation_id text not null check (char_length(correlation_id) between 1 and 160),
  safe_context jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_context) = 'object' and pg_column_size(safe_context) <= 16384),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index diagnostic_events_tenant_occurred_idx on public.diagnostic_events (tenant_id, occurred_at desc);
create index diagnostic_events_correlation_idx on public.diagnostic_events (tenant_id, correlation_id);

alter table public.diagnostic_events enable row level security;
revoke all on public.diagnostic_events from anon, authenticated;
grant insert, select, delete on public.diagnostic_events to authenticated;

create policy diagnostic_events_insert on public.diagnostic_events for insert to authenticated
  with check (actor_user_id = auth.uid() and public.is_tenant_member(tenant_id));
create policy diagnostic_events_select on public.diagnostic_events for select to authenticated
  using (public.can_manage_sharing_tenant(tenant_id) and occurred_at >= now() - interval '30 days');
create policy diagnostic_events_delete on public.diagnostic_events for delete to authenticated
  using (public.can_manage_sharing_tenant(tenant_id));

create or replace function public.cleanup_expired_diagnostic_events_for_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  delete from public.diagnostic_events where tenant_id = new.tenant_id and occurred_at < now() - interval '30 days';
  return new;
end;
$$;
revoke all on function public.cleanup_expired_diagnostic_events_for_tenant() from public;
create trigger cleanup_expired_diagnostic_events_before_insert before insert on public.diagnostic_events
  for each row execute function public.cleanup_expired_diagnostic_events_for_tenant();

-- Rollback (safe environment only):
-- drop trigger if exists cleanup_expired_diagnostic_events_before_insert on public.diagnostic_events;
-- drop function if exists public.cleanup_expired_diagnostic_events_for_tenant();
-- drop table if exists public.diagnostic_events;
