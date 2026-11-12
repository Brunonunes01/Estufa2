# Decisões persistentes do projeto

## 2026-11-12 — Cancelamento da reconstrução do banco novo

- A reconstrução do projeto Supabase `okzvcnslwttslkngvexr` foi cancelada.
- O banco legado `fdbzhrpnyrqinmxowgzf` permanece como ambiente ativo do aplicativo.
- O `.env.local` deve continuar apontando para o banco legado até nova decisão formal.
- As migrations locais do novo banco foram removidas; `supabase/migrations/` é o histórico
  legado preservado.
- Os testes TypeScript exclusivos da reconstrução abortada também foram removidos; não
  reutilizá-los como validação do banco legado sem revisão específica.
- Não presumir que o novo projeto foi revertido remotamente: rollback remoto exige
  autorização explícita, diagnóstico do estado remoto e plano de reversão.
- A [spec 005](../../specs/005-reconstrucao-controlada-persistencia/decision-record.md)
  contém o registro formal; a [spec 006](../../specs/006-auditoria-correcao-sistemica/evidence/aborted-new-database.md)
  contém a evidência de auditoria.
