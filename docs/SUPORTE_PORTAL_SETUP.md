# Setup do Portal de Suporte (Supabase)

Este guia cria a conta de suporte e libera acesso ao portal externo.

## 1) Criar usuario no Supabase Auth

No painel do Supabase:

1. Abra `Authentication` -> `Users`
2. Clique em `Add user`
3. Preencha:
   - Email: `suporte.admin.estufa@gmail.com`
   - Senha: (defina uma senha forte)
4. Marque `Auto Confirm User` (se essa opcao aparecer)

## 2) Promover usuario para suporte/admin

No `SQL Editor`, execute:

```sql
insert into public.profiles (
  id, email, name, role, is_support_agent, support_level, created_at, updated_at
)
select
  u.id,
  u.email,
  'Suporte Admin',
  'admin'::public.app_role,
  true,
  'owner',
  now(),
  now()
from auth.users u
where lower(u.email) = lower('suporte.admin.estufa@gmail.com')
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name,
  role = 'admin',
  is_support_agent = true,
  support_level = 'owner',
  updated_at = now();
```

## 3) Subir portal de suporte externo

No terminal do projeto:

```bash
npm run support:portal
```

Abra no navegador:

`http://localhost:4173`

## 4) Login no portal

Na tela de login do portal, preencha:

- `SUPABASE_URL`: URL do projeto (ex.: `https://xxxx.supabase.co`)
- `SUPABASE_ANON_KEY`: chave anon do projeto
- `Email/Senha`: da conta criada no passo 1

## 5) Se der acesso negado

Rode no SQL Editor para verificar perfil:

```sql
select id, email, role, is_support_agent, support_level
from public.profiles
where lower(email) = lower('suporte.admin.estufa@gmail.com');
```

Se nao retornar linha, execute novamente o SQL do passo 2.
