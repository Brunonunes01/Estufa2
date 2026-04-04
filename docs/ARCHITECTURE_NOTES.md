# Architecture Notes

## Dashboard Summary Strategy

- O frontend agora tenta ler `dashboard_summary/{tenantId}` antes de executar agregações.
- Se o documento não existir, o app faz fallback para `sum()` por agregação no Firestore.
- Isso permite:
  - manter compatibilidade imediata;
  - migrar gradualmente para atualização server-side via Cloud Functions;
  - reduzir leituras quando o resumo central já estiver populado.

Campos esperados em `dashboard_summary/{tenantId}`:

- `tenantId: string`
- `totalReceber: number`
- `totalPagar: number`
- `updatedAt: Timestamp`

## Security Rules Readiness

O código mantém escopo por tenant (`userId/tenantId`) em queries principais.
Isso é complementar às regras de segurança.

Recomendação de regras:

- permitir leitura/escrita apenas quando `request.auth.uid` pertencer ao tenant;
- bloquear acesso cross-tenant mesmo quando o cliente tentar forçar outro `tenantId`;
- validar campos críticos de documentos de resumo financeiro em writes.

## Cloud Functions (next step)

Ideal para reduzir custo em escala:

- trigger em `colheitas` (create/update/delete) para recalcular `totalReceber`;
- trigger em `despesas` (create/update/delete) para recalcular `totalPagar`;
- escrever no doc `dashboard_summary/{tenantId}`.

Com isso, o Dashboard consome 1 leitura para totais financeiros.
