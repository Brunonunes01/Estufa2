-- Remove um ciclo de Campo de forma atômica e com verificação explícita de permissão.
-- Ciclos vazios são excluídos; ciclos com histórico são cancelados e preservados.

create or replace function public.remove_field_cycle(p_plantio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_tenant_id uuid;
  target_talhao_id uuid;
  has_operational_history boolean := false;
begin
  select p.tenant_id, p.talhao_id
    into target_tenant_id, target_talhao_id
  from public.plantios p
  where p.id = p_plantio_id;

  if target_tenant_id is null then
    raise exception 'Ciclo não encontrado.' using errcode = 'P0002';
  end if;

  if target_talhao_id is null then
    raise exception 'Este ciclo não pertence ao módulo Campo.' using errcode = '23514';
  end if;

  if not public.can_delete_tenant(target_tenant_id) then
    raise exception 'Sua conta não possui permissão para remover este ciclo.'
      using errcode = '42501';
  end if;

  has_operational_history := exists (
    select 1 from public.vendas v
    where v.tenant_id = target_tenant_id and v.plantio_id = p_plantio_id
  ) or exists (
    select 1 from public.colheitas c
    where c.tenant_id = target_tenant_id and c.plantio_id = p_plantio_id
  ) or exists (
    select 1 from public.aplicacoes a
    where a.tenant_id = target_tenant_id and a.plantio_id = p_plantio_id
  ) or exists (
    select 1 from public.manejos m
    where m.tenant_id = target_tenant_id and m.plantio_id = p_plantio_id
  ) or exists (
    select 1 from public.tarefas_agricolas ta
    where ta.tenant_id = target_tenant_id and ta.plantio_id = p_plantio_id
  ) or exists (
    select 1 from public.despesas d
    where d.tenant_id = target_tenant_id
      and d.plantio_id = p_plantio_id
      and d.tipo_gasto is distinct from 'investimento_inicial'
  );

  if has_operational_history then
    update public.plantios
    set status = 'cancelado', updated_at = timezone('utc', now())
    where id = p_plantio_id and tenant_id = target_tenant_id;

    return jsonb_build_object('deleted', false, 'archived', true);
  end if;

  delete from public.despesas
  where tenant_id = target_tenant_id
    and plantio_id = p_plantio_id
    and tipo_gasto = 'investimento_inicial';

  delete from public.plantios
  where id = p_plantio_id and tenant_id = target_tenant_id;

  return jsonb_build_object('deleted', true, 'archived', false);
end
$$;

revoke all on function public.remove_field_cycle(uuid) from public;
grant execute on function public.remove_field_cycle(uuid) to authenticated;

comment on function public.remove_field_cycle(uuid) is
  'Exclui ciclo de Campo vazio ou cancela ciclo com histórico, mediante can_delete no tenant.';
