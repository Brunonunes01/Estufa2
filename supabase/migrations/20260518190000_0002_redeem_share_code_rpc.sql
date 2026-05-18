create or replace function public.redeem_share_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_share public.share_codes%rowtype;
  v_permissions jsonb;
  v_used_entry jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_code is null or btrim(p_code) = '' then
    raise exception 'Código inválido.';
  end if;

  select *
    into v_share
  from public.share_codes
  where code = upper(btrim(p_code))
  limit 1;

  if not found then
    raise exception 'Código inválido.';
  end if;

  if now() > v_share.expires_at then
    raise exception 'Código expirado.';
  end if;

  if v_share.tenant_id is null then
    raise exception 'Convite inválido.';
  end if;

  if exists (
    select 1
    from public.tenants t
    where t.id = v_share.tenant_id
      and t.owner_user_id = v_user_id
  ) then
    raise exception 'Você já é o dono deste tenant.';
  end if;

  if exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = v_share.tenant_id
      and tm.user_id = v_user_id
  ) then
    return true;
  end if;

  v_permissions := coalesce(v_share.permissions, '{}'::jsonb);

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    can_read,
    can_write,
    can_delete,
    can_manage_sharing
  )
  values (
    v_share.tenant_id,
    v_user_id,
    coalesce(v_share.grant_role, 'operator'),
    coalesce((v_permissions ->> 'canRead')::boolean, true),
    coalesce((v_permissions ->> 'canWrite')::boolean, true),
    coalesce((v_permissions ->> 'canDelete')::boolean, false),
    coalesce((v_permissions ->> 'canManageSharing')::boolean, false)
  )
  on conflict (tenant_id, user_id) do update
  set
    role = excluded.role,
    can_read = excluded.can_read,
    can_write = excluded.can_write,
    can_delete = excluded.can_delete,
    can_manage_sharing = excluded.can_manage_sharing,
    updated_at = now();

  v_used_entry := jsonb_build_object(
    'userId', v_user_id,
    'usedAt', now(),
    'role', coalesce(v_share.grant_role, 'operator')
  );

  update public.share_codes
  set
    used_by = coalesce(used_by, '[]'::jsonb) || jsonb_build_array(v_used_entry),
    updated_at = now()
  where id = v_share.id;

  return true;
end;
$$;

grant execute on function public.redeem_share_code(text) to authenticated;
