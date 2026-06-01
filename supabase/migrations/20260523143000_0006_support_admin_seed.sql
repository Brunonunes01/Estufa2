do $$
declare
  v_user_id uuid;
begin
  select u.id
    into v_user_id
    from auth.users u
   where lower(u.email) = lower('suporte.admin.estufa@gmail.com')
   limit 1;

  if v_user_id is null then
    raise notice 'Usuario auth.users nao encontrado para suporte.admin.estufa@gmail.com';
    return;
  end if;

  insert into public.profiles (
    id,
    email,
    name,
    role,
    is_support_agent,
    support_level,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    'suporte.admin.estufa@gmail.com',
    'Suporte Admin',
    'admin',
    true,
    'owner',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = 'admin',
        is_support_agent = true,
        support_level = 'owner',
        updated_at = now();
end $$;
