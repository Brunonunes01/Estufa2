-- Exclui permanentemente um talhao, seus ciclos e todo o historico vinculado.
-- Cada ciclo usa a rotina atomica que tambem recompõe os estoques consumidos.

create or replace function public.delete_empty_talhao(p_talhao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_tenant_id uuid;
  cycle_record record;
  cycle_result jsonb;
  deleted_plantios integer := 0;
  deleted_vendas integer := 0;
  deleted_colheitas integer := 0;
  deleted_aplicacoes integer := 0;
  deleted_manejos integer := 0;
  deleted_tarefas integer := 0;
  deleted_despesas integer := 0;
  deleted_trace_events integer := 0;
  restored_insumos integer := 0;
  direct_vendas integer := 0;
  direct_trace_events integer := 0;
  had_history boolean := false;
begin
  select t.tenant_id
    into target_tenant_id
  from public.talhoes t
  where t.id = p_talhao_id;

  if target_tenant_id is null then
    raise exception 'Talhão não encontrado.' using errcode = 'P0002';
  end if;

  if auth.uid() is null or not exists (
    select 1
    from public.tenants t
    where t.id = target_tenant_id
      and t.owner_user_id = auth.uid()
  ) then
    raise exception 'Somente o proprietário pode excluir permanentemente este talhão.'
      using errcode = '42501';
  end if;

  for cycle_record in
    select p.id
    from public.plantios p
    where p.tenant_id = target_tenant_id
      and p.talhao_id = p_talhao_id
    order by p.created_at, p.id
  loop
    cycle_result := public.remove_field_cycle(cycle_record.id);

    deleted_plantios := deleted_plantios + 1;
    deleted_vendas := deleted_vendas + coalesce((cycle_result->>'deletedVendas')::integer, 0);
    deleted_colheitas := deleted_colheitas + coalesce((cycle_result->>'deletedColheitas')::integer, 0);
    deleted_aplicacoes := deleted_aplicacoes + coalesce((cycle_result->>'deletedAplicacoes')::integer, 0);
    deleted_manejos := deleted_manejos + coalesce((cycle_result->>'deletedManejos')::integer, 0);
    deleted_tarefas := deleted_tarefas + coalesce((cycle_result->>'deletedTarefas')::integer, 0);
    deleted_despesas := deleted_despesas + coalesce((cycle_result->>'deletedDespesas')::integer, 0);
    deleted_trace_events := deleted_trace_events + coalesce((cycle_result->>'deletedTraceEvents')::integer, 0);
    restored_insumos := restored_insumos + coalesce((cycle_result->>'restoredInsumos')::integer, 0);
    had_history := had_history or coalesce((cycle_result->>'hadHistory')::boolean, false);
  end loop;

  -- Remove vendas diretas do talhao que nao estavam ligadas a um ciclo.
  delete from public.rastreabilidade_eventos re
  where re.tenant_id = target_tenant_id
    and re.entidade = 'venda'
    and re.entidade_id in (
      select v.id
      from public.vendas v
      where v.tenant_id = target_tenant_id
        and v.talhao_id = p_talhao_id
    );
  get diagnostics direct_trace_events = row_count;

  delete from public.vendas v
  where v.tenant_id = target_tenant_id
    and v.talhao_id = p_talhao_id;
  get diagnostics direct_vendas = row_count;

  deleted_vendas := deleted_vendas + direct_vendas;
  deleted_trace_events := deleted_trace_events + direct_trace_events;
  had_history := had_history or direct_vendas > 0;

  delete from public.talhoes t
  where t.id = p_talhao_id
    and t.tenant_id = target_tenant_id;

  if not found then
    raise exception 'Não foi possível excluir o talhão.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'deleted', true,
    'archived', false,
    'hadHistory', had_history,
    'deletedPlantios', deleted_plantios,
    'deletedVendas', deleted_vendas,
    'deletedColheitas', deleted_colheitas,
    'deletedAplicacoes', deleted_aplicacoes,
    'deletedManejos', deleted_manejos,
    'deletedTarefas', deleted_tarefas,
    'deletedDespesas', deleted_despesas,
    'deletedTraceEvents', deleted_trace_events,
    'restoredInsumos', restored_insumos
  );
end
$$;

revoke all on function public.delete_empty_talhao(uuid) from public;
grant execute on function public.delete_empty_talhao(uuid) to authenticated;

comment on function public.delete_empty_talhao(uuid) is
  'Exclusão permanente e atômica de talhão, ciclos e histórico, restrita ao proprietário do tenant.';
