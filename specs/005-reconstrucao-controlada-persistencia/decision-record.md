# Registro de decisão — reconstrução cancelada

**Data:** 2026-11-12  
**Status:** CANCELADA  
**Iniciativa relacionada:** [spec.md](./spec.md)  
**Auditoria relacionada:** [spec 006](../006-auditoria-correcao-sistemica/spec.md)

## Decisão

A implantação do novo banco Supabase foi cancelada. O aplicativo deve continuar usando o
banco legado enquanto as correções necessárias forem feitas nele.

O projeto novo identificado durante a implementação foi `okzvcnslwttslkngvexr`.
O projeto legado ativo é `fdbzhrpnyrqinmxowgzf`.

## Escopo do cancelamento

- As migrations locais do projeto novo e seu espelho foram removidas de
  `supabase-new/migrations/` e `supabase-new/supabase/migrations/`.
- Os testes TypeScript exclusivos da baseline nova, persistência, cutover e isolamento
  do projeto novo também foram removidos; eles não representam mais o ambiente ativo.
- O histórico de migrations legado em `supabase/migrations/` não foi alterado.
- O `.env.local` foi apontado novamente para o projeto legado.
- Não houve cutover, migração de dados ou exclusão automática de dados.
- Nenhuma operação remota de rollback foi executada por esta decisão; qualquer estado
  remoto remanescente do projeto novo deve ser tratado em procedimento separado, com
  autorização explícita, diagnóstico e rollback documentado.

## Regra para trabalhos futuros

Não recriar, reaplicar ou promover a baseline do projeto novo sem uma nova especificação,
aprovação explícita e decisão formal sobre dados, staging, rollback e cutover.

As correções atuais devem ser implementadas e validadas contra o banco legado.
