# Continuidade Supabase

Data de referencia: `2026-05-27`

## Resumo

O app roda em runtime Supabase-only. O backend legado foi removido do fluxo ativo.

Estado atual validado:
- `npm run typecheck` passando
- autenticacao via Supabase Auth
- modelo multi-tenant com RLS
- fila offline com sincronizacao quando a conexao retorna

## Configuracao de ambiente

```env
EXPO_PUBLIC_DATA_BACKEND=supabase
EXPO_PUBLIC_SUPABASE_URL=https://fdbzhrpnyrqinmxowgzf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Arquivos centrais

- `supabase/config.toml`
- `supabase/migrations/20260518162000_0001_base_schema.sql`
- `src/services/supabaseClient.ts`
- `src/services/authBridge.ts`
- `src/contexts/AuthContext.tsx`
- `src/navigation/RootNavigator.tsx`

## Pendencias tecnicas conhecidas

1. Ainda existem ramos legados em servicos com imports de `compat/legacyDataApi` e `removedBackend`.
2. Ainda existe uso de `Timestamp` legado em parte dos tipos de dominio.
3. Alguns documentos historicos ainda misturam termos do backend antigo.

## Proximo passo recomendado

1. Remover ramos legados restantes, mantendo apenas caminho Supabase.
2. Migrar tipos de data para `Date`/ISO de forma consistente.
3. Atualizar docs tecnicos para refletir arquitetura atual sem ambiguidade.
