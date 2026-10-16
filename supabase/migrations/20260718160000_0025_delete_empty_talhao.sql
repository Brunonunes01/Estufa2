-- Exclui um talhão e ciclos ainda vazios de forma atômica.
-- Qualquer histórico operacional mantém o bloqueio para evitar perda de dados.

create or replace function public.delete_empty_talhao(p_talhao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_tenant_id uuid;
  plantio_ids uuid[] := array[]::uuid[];
  deleted_plantios integer := 0;
begin
  select t.tenant_id
    into target_tenant_id
  from public.talhoes t
  where t.id = p_talhao_id;

  if target_tenant_id is null then
    raise exception 'Talhão não encontrado.' using errcode = 'P0002';
  end if;

  if not public.can_delete_tenant(target_tenant_id) then
    raise exception 'Sua conta não possui permissão para excluir este talhão.'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(p.id), array[]::uuid[])
    into plantio_ids
  from public.plantios p
  where p.tenant_id = target_tenant_id
    and p.talhao_id = p_talhao_id;

  if exists (
    select 1 from public.vendas v
    where v.tenant_id = target_tenant_id
      and (v.talhao_id = p_talhao_id or v.plantio_id = any(plantio_ids))
  ) or exists (
    select 1 from public.colheitas c
    where c.tenant_id = target_tenant_id and c.plantio_id = any(plantio_ids)
  ) or exists (
    select 1 from public.aplicacoes a
    where a.tenant_id = target_tenant_id and a.plantio_id = any(plantio_ids)
  ) or exists (
    select 1 from public.manejos m
    where m.tenant_id = target_tenant_id and m.plantio_id = any(plantio_ids)
  ) or exists (
    select 1 from public.tarefas_agricolas ta
    where ta.tenant_id = target_tenant_id and ta.plantio_id = any(plantio_ids)
  ) or exists (
    select 1 from public.despesas d
    where d.tenant_id = target_tenant_id
      and d.plantio_id = any(plantio_ids)
      and d.tipo_gasto is distinct from 'investimento_inicial'
  ) then
    raise exception 'Este talhão possui histórico operacional e não pode ser excluído. Mantenha-o para preservar os dados.'
      using errcode = '23503';
  end if;

  delete from public.despesas d
  where d.tenant_id = target_tenant_id
    and d.plantio_id = any(plantio_ids)
    and d.tipo_gasto = 'investimento_inicial';

  delete from public.plantios p
  where p.tenant_id = target_tenant_id
    and p.id = any(plantio_ids);
  get diagnostics deleted_plantios = row_count;

  delete from public.talhoes t
  where t.tenant_id = target_tenant_id
    and t.id = p_talhao_id;

  return jsonb_build_object(
    'deleted', true,
    'deletedPlantios', deleted_plantios
  );
end
$$;

revoke all on function public.delete_empty_talhao(uuid) from public;
grant execute on function public.delete_empty_talhao(uuid) to authenticated;

comment on function public.delete_empty_talhao(uuid) is
  'Exclui atomicamente um talhão e seus ciclos vazios, preservando qualquer histórico operacional.';
