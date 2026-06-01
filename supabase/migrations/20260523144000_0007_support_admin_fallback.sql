do $$
declare
  v_email text;
  v_user_id uuid;
begin
  foreach v_email in array array[
    'suporte.admin.estufa@gmail.com',
    'suporte.admin.estufa2@gmail.com'
  ]
  loop
    select u.id
      into v_user_id
      from auth.users u
     where lower(u.email) = lower(v_email)
     limit 1;

    if v_user_id is null then
      continue;
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
      v_email,
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

    raise notice 'Conta de suporte promovida: %', v_email;
  end loop;
end $$;
