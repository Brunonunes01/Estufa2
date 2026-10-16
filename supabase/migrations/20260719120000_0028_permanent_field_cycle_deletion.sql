-- Permite ao proprietario excluir permanentemente um ciclo de Campo e todo o
-- historico diretamente vinculado. A operacao e atomica e recompõe o estoque
-- consumido pelas aplicacoes removidas.

create or replace function public.remove_field_cycle(p_plantio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_tenant_id uuid;
  target_talhao_id uuid;
  restored_insumos integer := 0;
  deleted_vendas integer := 0;
  deleted_colheitas integer := 0;
  deleted_aplicacoes integer := 0;
  deleted_manejos integer := 0;
  deleted_tarefas integer := 0;
  deleted_despesas integer := 0;
  deleted_operational_despesas integer := 0;
  deleted_trace_events integer := 0;
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

  if auth.uid() is null or not exists (
    select 1
    from public.tenants t
    where t.id = target_tenant_id
      and t.owner_user_id = auth.uid()
  ) then
    raise exception 'Somente o proprietário pode excluir permanentemente este ciclo.'
      using errcode = '42501';
  end if;

  select count(*)
    into deleted_operational_despesas
  from public.despesas d
  where d.tenant_id = target_tenant_id
    and d.plantio_id = p_plantio_id
    and d.tipo_gasto is distinct from 'investimento_inicial';

  -- Recompõe o estoque antes de apagar as aplicações e seus itens.
  with stock_to_restore as (
    select ai.insumo_id, sum(ai.quantidade_aplicada) as quantidade
    from public.aplicacoes a
    join public.aplicacao_itens ai
      on ai.aplicacao_id = a.id
     and ai.tenant_id = a.tenant_id
    where a.tenant_id = target_tenant_id
      and a.plantio_id = p_plantio_id
      and ai.insumo_id is not null
    group by ai.insumo_id
  ), restored as (
    update public.insumos i
    set estoque_atual = i.estoque_atual + s.quantidade,
        updated_at = timezone('utc', now())
    from stock_to_restore s
    where i.id = s.insumo_id
      and i.tenant_id = target_tenant_id
    returning i.id
  )
  select count(*) into restored_insumos from restored;

  -- Remove os eventos de rastreabilidade do ciclo e das entidades que serão
  -- excluídas, inclusive registros legados que não carregam plantio_id.
  delete from public.rastreabilidade_eventos re
  where re.tenant_id = target_tenant_id
    and (
      re.plantio_id = p_plantio_id
      or (re.entidade = 'plantio' and re.entidade_id = p_plantio_id)
      or (
        re.entidade = 'venda'
        and re.entidade_id in (
          select v.id
          from public.vendas v
          where v.tenant_id = target_tenant_id
            and (
              v.plantio_id = p_plantio_id
              or (v.origin_type = 'plantio' and v.origin_id = p_plantio_id)
              or v.colheita_id in (
                select c.id
                from public.colheitas c
                where c.tenant_id = target_tenant_id
                  and c.plantio_id = p_plantio_id
              )
            )
        )
      )
      or (
        re.entidade = 'colheita'
        and re.entidade_id in (
          select c.id
          from public.colheitas c
          where c.tenant_id = target_tenant_id
            and c.plantio_id = p_plantio_id
        )
      )
      or (
        re.entidade = 'aplicacao'
        and re.entidade_id in (
          select a.id
          from public.aplicacoes a
          where a.tenant_id = target_tenant_id
            and a.plantio_id = p_plantio_id
        )
      )
      or (
        re.entidade = 'manejo'
        and re.entidade_id in (
          select m.id
          from public.manejos m
          where m.tenant_id = target_tenant_id
            and m.plantio_id = p_plantio_id
        )
      )
      or (
        re.entidade = 'tarefa'
        and re.entidade_id in (
          select ta.id
          from public.tarefas_agricolas ta
          where ta.tenant_id = target_tenant_id
            and ta.plantio_id = p_plantio_id
        )
      )
    );
  get diagnostics deleted_trace_events = row_count;

  -- Vendas devem sair antes das colheitas. venda_itens e apagada em cascata.
  delete from public.vendas v
  where v.tenant_id = target_tenant_id
    and (
      v.plantio_id = p_plantio_id
      or (v.origin_type = 'plantio' and v.origin_id = p_plantio_id)
      or v.colheita_id in (
        select c.id
        from public.colheitas c
        where c.tenant_id = target_tenant_id
          and c.plantio_id = p_plantio_id
      )
    );
  get diagnostics deleted_vendas = row_count;

  delete from public.colheitas c
  where c.tenant_id = target_tenant_id
    and c.plantio_id = p_plantio_id;
  get diagnostics deleted_colheitas = row_count;

  -- aplicacao_itens e apagada em cascata.
  delete from public.aplicacoes a
  where a.tenant_id = target_tenant_id
    and a.plantio_id = p_plantio_id;
  get diagnostics deleted_aplicacoes = row_count;

  delete from public.manejos m
  where m.tenant_id = target_tenant_id
    and m.plantio_id = p_plantio_id;
  get diagnostics deleted_manejos = row_count;

  delete from public.tarefas_agricolas ta
  where ta.tenant_id = target_tenant_id
    and ta.plantio_id = p_plantio_id;
  get diagnostics deleted_tarefas = row_count;

  delete from public.despesas d
  where d.tenant_id = target_tenant_id
    and d.plantio_id = p_plantio_id;
  get diagnostics deleted_despesas = row_count;

  delete from public.plantios p
  where p.id = p_plantio_id
    and p.tenant_id = target_tenant_id;

  if not found then
    raise exception 'Não foi possível excluir o ciclo.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'deleted', true,
    'archived', false,
    'hadHistory', (
      deleted_vendas
      + deleted_colheitas
      + deleted_aplicacoes
      + deleted_manejos
      + deleted_tarefas
      + deleted_operational_despesas
    ) > 0,
    'deletedVendas', deleted_vendas,
    'deletedColheitas', deleted_colheitas,
    'deletedAplicacoes', deleted_aplicacoes,
    'deletedManejos', deleted_manejos,
    'deletedTarefas', deleted_tarefas,
    'deletedDespesas', deleted_despesas,
    'deletedOperationalDespesas', deleted_operational_despesas,
    'deletedTraceEvents', deleted_trace_events,
    'restoredInsumos', restored_insumos
  );
end
$$;

revoke all on function public.remove_field_cycle(uuid) from public;
grant execute on function public.remove_field_cycle(uuid) to authenticated;

comment on function public.remove_field_cycle(uuid) is
  'Exclusão permanente e atômica de ciclo de Campo e histórico, restrita ao proprietário do tenant.';
