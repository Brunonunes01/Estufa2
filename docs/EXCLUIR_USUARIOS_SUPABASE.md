# Excluir Usuários no Supabase (2 cenários)

Este guia cobre as duas formas:

1. Usuário **não é dono** de tenant.
2. Usuário **é dono** de tenant (precisa transferir propriedade antes).

## Pré-check (recomendado)

```sql
select
  u.id,
  u.email,
  t.id as tenant_id,
  t.name as tenant_name
from auth.users u
left join public.tenants t on t.owner_user_id = u.id
where lower(u.email) in (
  'email1@exemplo.com',
  'email2@exemplo.com'
)
order by u.email;
```

Se `tenant_id` vier preenchido, esse usuário é dono de tenant.

---

## 1) Excluir usuário que NÃO é dono

Use quando o usuário não aparece como `owner_user_id` em `public.tenants`.

```sql
begin;

delete from public.tenant_memberships
where user_id in (
  select id
  from auth.users
  where lower(email) in (
    'email1@exemplo.com',
    'email2@exemplo.com'
  )
);

delete from auth.users
where lower(email) in (
  'email1@exemplo.com',
  'email2@exemplo.com'
);

commit;
```

---

## 2) Excluir usuário que É dono (transferindo dono antes)

Quando existe erro:

`update or delete on table "users" violates foreign key constraint "tenants_owner_user_id_fkey"`

faça assim:

```sql
begin;

with new_owner as (
  select id
  from auth.users
  where lower(email) = lower('NOVO_DONO@exemplo.com')
  limit 1
),
targets as (
  select id
  from auth.users
  where lower(email) in (
    'email1@exemplo.com',
    'email2@exemplo.com'
  )
)
update public.tenants t
set owner_user_id = (select id from new_owner)
where t.owner_user_id in (select id from targets);

delete from public.tenant_memberships
where user_id in (
  select id
  from auth.users
  where lower(email) in (
    'email1@exemplo.com',
    'email2@exemplo.com'
  )
);

delete from auth.users
where lower(email) in (
  'email1@exemplo.com',
  'email2@exemplo.com'
);

commit;
```

---

## Exemplo real (seu caso)

Novo dono:

- `suporte.admin.estufa@gmail.com`

Usuários de teste:

- `nunesb@gmail.com`
- `brunonuness02@email.com`
- `brunon@email.com`
- `bruno@gmail.com`

```sql
begin;

with new_owner as (
  select id
  from auth.users
  where lower(email) = lower('suporte.admin.estufa@gmail.com')
  limit 1
),
targets as (
  select id
  from auth.users
  where lower(email) in (
    'nunesb@gmail.com',
    'brunonuness02@email.com',
    'brunon@email.com',
    'bruno@gmail.com'
  )
)
update public.tenants t
set owner_user_id = (select id from new_owner)
where t.owner_user_id in (select id from targets);

delete from public.tenant_memberships
where user_id in (
  select id from auth.users
  where lower(email) in (
    'nunesb@gmail.com',
    'brunonuness02@email.com',
    'brunon@email.com',
    'bruno@gmail.com'
  )
);

delete from auth.users
where lower(email) in (
  'nunesb@gmail.com',
  'brunonuness02@email.com',
  'brunon@email.com',
  'bruno@gmail.com'
);

commit;
```

---

## Dica de segurança

Sempre rode um `select` de conferência antes do `delete` em produção.
