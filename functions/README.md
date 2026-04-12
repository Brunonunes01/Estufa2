# Cloud Functions (Dashboard Summary)

Esta pasta prepara gatilhos para manter `dashboard_summary/{tenantId}` atualizado.

## Eventos cobertos
- Escrita em `vendas`
- Escrita em `despesas`
- Escrita em `colheitas`

## Resultado
A função recalcula:
- `totalReceber` (vendas pendentes)
- `totalPagar` (despesas pendentes)
- `updatedAt`

## Deploy
1. Inicialize o Firebase Functions no projeto (`firebase init functions`) se ainda não existir configuração.
2. Garanta dependências `firebase-admin` e `firebase-functions` no workspace `functions`.
3. Publique com `firebase deploy --only functions`.
