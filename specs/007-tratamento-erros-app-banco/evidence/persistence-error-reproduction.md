# Reprodução de erros de integridade

Data: 2026-11-12. Nenhum banco foi executado ou alterado.

| Divergência | Proteção existente/implementada | Resultado |
|---|---|---|
| Tenant ausente ou divergente | `assertTenantId`, autorização ativa e filtros `tenant_id` | rejeição antes da mutação ou consulta sem resultado cruzado |
| Campo obrigatório ausente | `assertRequiredPayloadFields` e validadores de domínio | erro `validation` antes de persistir |
| Relação de outro tenant | `assertRelatedTenant`, guards de origem e consultas relacionadas filtradas por tenant | erro `authorization` sem revelar existência |
| Resposta após troca de conta | `operationContextGuard` nas consultas essenciais | resposta descartada |
| Etapa posterior rejeitada | contexto de etapas concluídas e ação de reconciliação | estado parcial explícito, sem sucesso integral |

## Decisão sobre migration 0035

Não criar `0035_error_integrity_guards.sql`. As falhas reproduzidas estão cobertas pelas constraints/RLS legadas declaradas, pelos filtros tenant-scoped e pelas novas validações de fronteira. Sem Docker ou ambiente autorizado, adicionar constraints ou políticas não verificadas ampliaria o risco. Qualquer endurecimento futuro de schema precisa de iniciativa própria com execução autorizada.

## Rollback

Não há migration 0035. As validações de fronteira são reversíveis por código e não alteram dados existentes.
