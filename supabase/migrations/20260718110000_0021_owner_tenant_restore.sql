create or replace function public.restore_tenant_data(p_tenant_id uuid, p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_tenant_name text;
  v_backup_tenant_name text;
  v_table_name text;
  v_table_rows jsonb;
  v_row jsonb;
  v_columns text;
  v_values text;
  v_updates text;
  v_existing_tenant_id uuid;
  v_table_count integer;
  v_total_count integer := 0;
  v_counts jsonb := '{}'::jsonb;
  v_restore_tables constant text[] := array[
    'safras',
    'clientes',
    'fornecedores',
    'estufas',
    'talhoes',
    'caixa_pessoas',
    'hidro_verduras',
    'hidro_motores',
    'hidro_setores',
    'hidro_reservatorios',
    'hidro_estruturas',
    'hidro_lotes',
    'plantios',
    'insumos',
    'insumo_entradas',
    'aplicacoes',
    'aplicacao_itens',
    'colheitas',
    'hidro_ocupacoes',
    'hidro_movimentacoes',
    'hidro_leituras',
    'vendas',
    'venda_itens',
    'despesas',
    'manejos',
    'tarefas_agricolas',
    'rastreabilidade_eventos'
  ];
begin
  select t.name
    into v_current_tenant_name
    from public.tenants t
   where t.id = p_tenant_id
     and t.owner_user_id = auth.uid();

  if v_current_tenant_name is null then
    raise exception using
      errcode = '42501',
      message = 'Somente o proprietario pode restaurar os dados desta conta.';
  end if;

  if p_backup is null
     or jsonb_typeof(p_backup) <> 'object'
     or p_backup->>'format' <> 'estufa-pro-data-export'
     or coalesce((p_backup->>'format_version')::integer, 0) not between 1 and 2
     or jsonb_typeof(p_backup->'tables') <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Arquivo de backup invalido ou incompativel.';
  end if;

  v_backup_tenant_name := nullif(trim(p_backup->'tenant'->>'name'), '');

  foreach v_table_name in array v_restore_tables loop
    if to_regclass(format('public.%I', v_table_name)) is null then
      continue;
    end if;

    v_table_rows := coalesce(p_backup->'tables'->v_table_name, '[]'::jsonb);
    if jsonb_typeof(v_table_rows) <> 'array' then
      raise exception using
        errcode = '22023',
        message = format('Conteudo invalido para a tabela %s.', v_table_name);
    end if;

    v_table_count := 0;
    for v_row in select value from jsonb_array_elements(v_table_rows) loop
      if jsonb_typeof(v_row) <> 'object' or nullif(v_row->>'id', '') is null then
        raise exception using
          errcode = '22023',
          message = format('Registro invalido para a tabela %s.', v_table_name);
      end if;

      v_existing_tenant_id := null;
      execute format(
        'select tenant_id from public.%I where id = $1::uuid',
        v_table_name
      )
      using v_row->>'id'
      into v_existing_tenant_id;

      if v_existing_tenant_id is not null and v_existing_tenant_id <> p_tenant_id then
        raise exception using
          errcode = '42501',
          message = format('O backup possui um identificador usado por outra conta na tabela %s.', v_table_name);
      end if;

      v_row := v_row || jsonb_build_object('tenant_id', p_tenant_id);

      if v_row ? 'created_by' then
        v_row := jsonb_set(v_row, '{created_by}', to_jsonb(auth.uid()), true);
      end if;
      if v_row ? 'actor_uid' then
        v_row := jsonb_set(v_row, '{actor_uid}', to_jsonb(auth.uid()), true);
      end if;
      if v_row ? 'desbloqueio_admin_by_uid' and v_row->'desbloqueio_admin_by_uid' <> 'null'::jsonb then
        v_row := jsonb_set(v_row, '{desbloqueio_admin_by_uid}', to_jsonb(auth.uid()), true);
      end if;

      select
        string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum),
        string_agg(
          format('(jsonb_populate_record(null::public.%I, $1)).%I', v_table_name, attribute.attname),
          ', ' order by attribute.attnum
        ),
        string_agg(
          format('%1$I = excluded.%1$I', attribute.attname),
          ', ' order by attribute.attnum
        ) filter (where attribute.attname not in ('id', 'tenant_id'))
      into v_columns, v_values, v_updates
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid = to_regclass(format('public.%I', v_table_name))
        and attribute.attnum > 0
        and not attribute.attisdropped
        and v_row ? attribute.attname;

      if v_columns is null or v_updates is null then
        raise exception using
          errcode = '22023',
          message = format('Estrutura incompativel para a tabela %s.', v_table_name);
      end if;

      execute format(
        'insert into public.%1$I as restore_target (%2$s) select %3$s on conflict (id) do update set %4$s where restore_target.tenant_id = $2',
        v_table_name,
        v_columns,
        v_values,
        v_updates
      )
      using v_row, p_tenant_id;

      v_table_count := v_table_count + 1;
      v_total_count := v_total_count + 1;
    end loop;

    v_counts := v_counts || jsonb_build_object(v_table_name, v_table_count);
  end loop;

  if v_backup_tenant_name is not null then
    update public.tenants
       set name = v_backup_tenant_name,
           updated_at = now()
     where id = p_tenant_id
       and owner_user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'restored_at', now(),
    'tenant_id', p_tenant_id,
    'restored_records', v_total_count,
    'tables', v_counts
  );
exception
  when invalid_text_representation then
    raise exception using
      errcode = '22023',
      message = 'O backup possui identificadores ou valores invalidos.';
end;
$$;

revoke all on function public.restore_tenant_data(uuid, jsonb) from public;
grant execute on function public.restore_tenant_data(uuid, jsonb) to authenticated;

comment on function public.restore_tenant_data(uuid, jsonb) is
  'Restores a tenant JSON backup transactionally. Authorization is restricted to the target tenant owner.';
