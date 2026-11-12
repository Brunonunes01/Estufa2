# Data Model: Auditoria e Correção Sistêmica

Este modelo descreve os artefatos de engenharia e os contratos runtime auditados. Os registros de auditoria não exigem novas tabelas no banco operacional.

## 1. AuditedFlow

Representa uma jornada ativa incluída no inventário.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Único e estável, no formato `FLOW-<domain>-<action>`. |
| `domain` | enum | `identity`, `tenant`, `dashboard`, `greenhouse`, `production`, `inventory`, `harvest`, `sales`, `expenses`, `finance`, `contacts`, `reports`, `settings`, `offline`. |
| `title` | string | Ação observável pelo usuário. |
| `priority` | enum | `P1`, `P2` ou `P3`; alinhada à spec. |
| `actors` | ActorProfile[] | Pelo menos um perfil autorizado. |
| `preconditions` | string[] | Sessão, tenant, dados e rede necessários. |
| `successScenario` | Scenario | Obrigatório. |
| `invalidScenario` | Scenario | Obrigatório. |
| `deniedScenario` | Scenario? | Obrigatório quando houver permissão aplicável. |
| `dependencies` | string[] | Serviços, contratos de dados e fluxos anteriores. |
| `status` | enum | `not_run`, `passed`, `failed`, `blocked`. |
| `evidenceIds` | string[] | Referências para EvidenceRecord. |

### Validation

- Fluxos de escrita devem possuir cenário de leitura após escrita.
- Fluxos multi-tenant devem possuir cenário de acesso cruzado negado.
- Fluxos compostos devem identificar fontes essenciais e auxiliares.

## 2. Scenario

Representa uma execução repetível de um fluxo.

| Field | Type | Rules |
|-------|------|-------|
| `given` | string[] | Estado inicial verificável. |
| `when` | string[] | Ações determinísticas. |
| `then` | string[] | Resultados observáveis e verificáveis. |
| `environment` | enum | `automated`, `web-validation`, `mobile-validation`, `remote-validation`. |
| `result` | enum | `not_run`, `passed`, `failed`, `blocked`. |

## 3. AuditFinding

Representa uma falha reproduzível ou incompatibilidade comprovada.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Sequencial na feature, formato `F006-###`. |
| `flowId` | string | Referência a AuditedFlow. |
| `title` | string | Sintoma conciso, sem solução embutida. |
| `category` | enum | `validation`, `authentication`, `authorization`, `conflict`, `connectivity`, `availability`, `data-contract`, `calculation`, `unexpected`. |
| `severity` | enum | `critical`, `high`, `medium`, `low`. |
| `reproduction` | string[] | Passos suficientes para repetição. |
| `expected` | string | Resultado previsto pelo contrato. |
| `actual` | string | Resultado observado. |
| `dataImpact` | enum | `none`, `incorrect_read`, `partial_write`, `duplication`, `loss`, `cross_tenant_exposure`, `unknown`. |
| `affectedContracts` | string[] | IDs de DataContract, PermissionCase ou OfflineOperation. |
| `state` | enum | `discovered`, `reproduced`, `fixing`, `validated`, `blocked`, `out_of_scope`. |
| `regressionCaseId` | string? | Obrigatório para `validated`. |
| `evidenceIds` | string[] | Obrigatório para `validated`, `blocked` e `out_of_scope`. |
| `notes` | string? | Risco residual ou decisão de escopo. |

### Severity rules

- `critical`: acesso cruzado, corrupção/perda ampla, bypass de autenticação ou indisponibilidade total.
- `high`: bloqueio de jornada essencial, perda silenciosa localizada ou valor financeiro incorreto.
- `medium`: funcionalidade secundária incorreta com alternativa segura.
- `low`: problema cosmético, aviso de desenvolvimento ou diagnóstico sem impacto funcional.

### State transitions

```text
discovered -> reproduced -> fixing -> validated
                      \-> blocked
discovered ------------------------> out_of_scope
```

- `fixing` exige reprodução confirmada.
- `validated` exige regressão verde e evidência da suíte relacionada.
- `blocked` exige dependência externa ou autorização ausente documentada.

## 4. DataContract

Representa um dado usado entre interface, serviço e persistência.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Formato `DATA-<table>-<field>`. |
| `domain` | string | Módulo proprietário do contrato. |
| `operation` | enum[] | Subconjunto de `read`, `create`, `update`, `delete`, `aggregate`. |
| `applicationName` | string | Nome usado no domínio do aplicativo. |
| `persistedName` | string | Nome esperado na persistência. |
| `valueType` | string | Tipo, enumeração ou estrutura JSON esperada. |
| `nullable` | boolean | Deve coincidir em payload, tipo e schema. |
| `defaultValue` | unknown? | Aplicado em um único ponto claramente definido. |
| `tenantScoped` | boolean | Obrigatório para registros operacionais. |
| `relationships` | string[] | Chaves e entidades relacionadas. |
| `sources` | string[] | Serviço/mapeador, tipo versionado e migration correspondente. |
| `status` | enum | `aligned`, `missing_in_app`, `missing_in_type`, `missing_in_schema`, `mismatch`, `legacy_only`. |

### Validation

- Um contrato ativo só é `aligned` quando serviço, tipo versionado e migration concordam.
- Enumerações usadas em filtros contam como leitura ativa mesmo sem registros existentes.
- Campo legado pode ser `legacy_only`, mas não pode ser exigido por criação nova.

## 5. PermissionCase

Representa uma decisão de autorização auditável.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Único por recurso, operação e perfil. |
| `resource` | string | Entidade ou função protegida. |
| `operation` | enum | `read`, `write`, `delete`, `manage_sharing`. |
| `profile` | enum | `owner`, `shared_admin`, `operator`, `guest`. |
| `tenantRelation` | enum | `owner`, `member`, `unrelated`, `revoked`. |
| `expected` | enum | `allow`, `deny`. |
| `clientGuard` | boolean | Interface bloqueia ação quando negada. |
| `dataBoundaryGuard` | boolean | Fronteira de dados também bloqueia. |
| `evidenceIds` | string[] | Deve incluir caso permitido e negado. |

## 6. OfflineOperation

Representa o contrato de uma ação pendente existente.

| Field | Type | Rules |
|-------|------|-------|
| `queueItemId` | string | Identidade única local. |
| `idempotencyKey` | string | Estável entre tentativas da mesma intenção. |
| `authUserId` | string | Imutável e obrigatório. |
| `tenantId` | string | Imutável e obrigatório. |
| `action` | string | Deve existir no registro de handlers suportados. |
| `payloadVersion` | integer | Positivo; permite evolução compatível. |
| `payload` | serialized value | Sem segredos e reidratável de forma determinística. |
| `attempts` | integer | Maior ou igual a zero. |
| `state` | enum | `queued`, `processing`, `succeeded`, `retryable_failed`, `terminal_failed`. |
| `createdAt` | timestamp | Obrigatório. |
| `lastAttemptAt` | timestamp? | Obrigatório após primeira tentativa. |

### State transitions

```text
queued -> processing -> succeeded
                  \-> retryable_failed -> processing
                  \-> terminal_failed
```

- O flush só processa item cujo usuário e tenant coincidam com o contexto autenticado revalidado.
- Item sem escopo não pode ser adotado automaticamente.
- Sucesso remove ou finaliza o item exatamente uma vez.

## 7. RegressionCase

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Referenciado pelo finding. |
| `findingId` | string | Relação um-para-um obrigatória para falha validada. |
| `level` | enum | `unit`, `contract`, `persistence`, `integration`, `manual_acceptance`. |
| `preFixEvidence` | string | Falha reproduzida ou contrato violado. |
| `assertions` | string[] | Cada asserção cobre o comportamento quebrado. |
| `result` | enum | `not_run`, `passed`, `failed`. |

## 8. EvidenceRecord

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Único. |
| `kind` | enum | `test_run`, `typecheck`, `lint`, `schema_dry_run`, `manual_flow`, `screenshot`, `log_excerpt`, `decision`. |
| `environment` | string | Ambiente sem credenciais. |
| `executedAt` | timestamp | Obrigatório. |
| `result` | enum | `passed`, `failed`, `blocked`, `informational`. |
| `reference` | string | Caminho, comando sanitizado ou identificador do resultado. |
| `sensitiveDataChecked` | boolean | Deve ser verdadeiro antes de versionar evidência. |

## Relationships

```text
AuditedFlow 1 ---- * AuditFinding
AuditedFlow 1 ---- * Scenario
AuditFinding 1 --- 0..1 RegressionCase
AuditFinding * ---- * DataContract
AuditFinding * ---- * PermissionCase
AuditFinding * ---- * EvidenceRecord
AuditedFlow * ----- * EvidenceRecord
OfflineOperation --- DataContract + PermissionCase
```
