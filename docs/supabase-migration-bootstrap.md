# Supabase Migration Bootstrap (Estufa2)

## 1) Pré-requisitos
- Docker ativo (para `supabase start` local)
- Supabase CLI via `npx` (já configurado nos scripts do `package.json`)

## 2) Login e vínculo com projeto remoto
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

## 3) Aplicar schema inicial
Arquivo criado:
- `supabase/migrations/20260518162000_0001_base_schema.sql`

Aplicação local/remota:
```bash
npm run supabase:start
npm run supabase:db:push
```

## 4) Gerar tipos TypeScript do banco
```bash
npm run supabase:types
```

## 5) O que já foi criado no schema base
- Auth + multi-tenant:
  - `tenants`
  - `profiles`
  - `tenant_memberships`
  - `share_codes`
- Operação:
  - `safras`, `estufas`, `plantios`
  - `insumos`, `insumo_entradas`
  - `aplicacoes`, `aplicacao_itens`
  - `colheitas`
  - `vendas`, `venda_itens`
  - `despesas`
  - `manejos`
  - `tarefas_agricolas`
  - `rastreabilidade_eventos`
- Hidroponia:
  - `hidro_verduras`, `hidro_motores`, `hidro_setores`, `hidro_reservatorios`, `hidro_estruturas`
  - `hidro_lotes`, `hidro_ocupacoes`, `hidro_movimentacoes`, `hidro_leituras`
- Segurança:
  - RLS habilitado em tabelas de negócio
  - policies por `tenant_id` via `tenant_memberships`

## 6) Próxima migração recomendada
- `0002_etl_staging_and_import.sql`:
  - tabelas temporárias de import
  - funções de upsert por `supabase_id`
  - estratégia idempotente de replay

