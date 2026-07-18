create or replace function public.export_tenant_data(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_name text;
  v_table_name text;
  v_rows jsonb;
  v_tables jsonb := '{}'::jsonb;
  v_export_tables constant text[] := array[
    'safras',
    'clientes',
    'fornecedores',
    'estufas',
    'talhoes',
    'plantios',
    'insumos',
    'insumo_entradas',
    'aplicacoes',
    'aplicacao_itens',
    'colheitas',
    'vendas',
    'venda_itens',
    'despesas',
    'caixa_pessoas',
    'manejos',
    'tarefas_agricolas',
    'rastreabilidade_eventos',
    'hidro_verduras',
    'hidro_motores',
    'hidro_setores',
    'hidro_reservatorios',
    'hidro_estruturas',
    'hidro_lotes',
    'hidro_ocupacoes',
    'hidro_movimentacoes',
    'hidro_leituras'
  ];
begin
  select t.name
    into v_tenant_name
    from public.tenants t
   where t.id = p_tenant_id
     and t.owner_user_id = auth.uid();

  if v_tenant_name is null then
    raise exception using
      errcode = '42501',
      message = 'Somente o proprietario pode exportar os dados desta conta.';
  end if;

  foreach v_table_name in array v_export_tables loop
    if to_regclass(format('public.%I', v_table_name)) is not null then
      execute format(
        'select coalesce(jsonb_agg(to_jsonb(export_row)), ''[]''::jsonb) from public.%I export_row where tenant_id = $1',
        v_table_name
      )
      using p_tenant_id
      into v_rows;

      v_tables := v_tables || jsonb_build_object(v_table_name, v_rows);
    end if;
  end loop;

  return jsonb_build_object(
    'format', 'estufa-pro-data-export',
    'format_version', 2,
    'exported_at', now(),
    'tenant', jsonb_build_object(
      'id', p_tenant_id,
      'name', v_tenant_name
    ),
    'tables', v_tables
  );
end;
$$;

revoke all on function public.export_tenant_data(uuid) from public;
grant execute on function public.export_tenant_data(uuid) to authenticated;

comment on function public.export_tenant_data(uuid) is
  'Exports operational tenant data as JSON. Authorization is restricted to the tenant owner.';
