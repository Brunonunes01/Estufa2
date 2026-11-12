# Data Model: Tratamento de Erros no App e Banco Legado

## Visão geral

O modelo separa erro normalizado, estado da operação, fonte de leitura, evidência diagnóstica e garantia de idempotência. Apenas evidências remotas e recibos necessários a agregados são persistidos no PostgreSQL; os demais modelos são contratos TypeScript.

## Service Error

Representa uma falha normalizada na fronteira de serviço.

| Campo | Tipo | Regra |
|---|---|---|
| `category` | enum | `validation`, `authentication`, `authorization`, `conflict`, `connectivity`, `availability`, `data-contract`, `unexpected` |
| `code` | string | Código estável do app; não contém mensagem do provedor |
| `operation` | string | Ação do usuário ou serviço afetada |
| `source` | string | Fonte real da falha |
| `safeMessage` | string | Mensagem apresentável ao usuário |
| `nextStep` | string | Ação corretiva segura |
| `retryability` | enum | `never`, `manual`, `automatic` |
| `correlationId` | UUID | Identifica a tentativa entre camadas |
| `field` | string opcional | Campo inválido quando aplicável |
| `safeContext` | objeto | Somente valores permitidos pela sanitização |
| `cause` | unknown, memória | Preservado apenas para encadeamento interno; nunca serializado integralmente |

### Validações

- Tokens, senhas, cookies, chaves, cabeçalhos de autorização, sessão completa e payload bruto são proibidos.
- Mensagem técnica do provedor não é usada diretamente como `safeMessage`.
- `tenantId` pode ser usado internamente para roteamento, mas não pode identificar tenant diferente do contexto autorizado.

## Operation Result

Representa o estado observável de uma leitura ou escrita.

| Campo | Tipo | Regra |
|---|---|---|
| `status` | enum | `pending`, `confirmed`, `degraded`, `retryable`, `partial`, `terminal` |
| `logicalOperationId` | UUID | Gerado uma vez e preservado em todos os reenvios |
| `correlationId` | UUID | Pode mudar por tentativa física; liga-se à mesma operação lógica |
| `confirmedRef` | string opcional | Identificador do resultado confirmado |
| `completedSteps` | string[] | Obrigatório quando `status=partial` |
| `reconciliationAction` | string opcional | Obrigatório quando `status=partial` |
| `error` | Service Error opcional | Obrigatório em `retryable`, `partial` e `terminal` |

### Transições

```text
pending ──confirmação──> confirmed
pending ──falha transitória segura──> retryable ──reenvio──> pending
pending ──falha após etapa confirmada──> partial ──reconciliação──> confirmed|terminal
pending ──falha permanente──> terminal
pending ──resultado parcial de leitura──> degraded
```

Sucesso só existe após confirmação explícita. Interrupção de rede após envio permanece `pending` ou `retryable` até consulta/reenvio idempotente confirmar o resultado.

## Compound Source Result

| Campo | Tipo | Regra |
|---|---|---|
| `name` | string | Identidade única na leitura composta |
| `kind` | enum | `essential`, `auxiliary`, `optional` |
| `status` | enum | `available`, `failed` |
| `data` | unknown opcional | Presente somente quando disponível |
| `error` | Service Error opcional | Presente somente quando falhou |
| `dependentActions` | string[] | Ações bloqueadas quando a fonte falha |

A falha essencial bloqueia apenas `dependentActions`; dados de outras fontes permanecem válidos.

## Diagnostic Event — local e remoto

| Campo | Tipo | Regra |
|---|---|---|
| `id` | UUID | Gerado no cliente; também funciona como idempotência da sincronização |
| `tenant_id` | UUID | Tenant autorizado no momento da falha |
| `actor_user_id` | UUID | Preenchido/validado contra `auth.uid()` no banco |
| `correlation_id` | UUID | Correlação da tentativa física |
| `logical_operation_id` | UUID opcional | Liga retries da mesma operação |
| `category` | texto com check | Uma das oito categorias |
| `code` | texto | Código estável do app |
| `operation` | texto | Ação afetada |
| `source` | texto | Fonte da falha |
| `outcome` | texto com check | `degraded`, `retryable`, `partial`, `terminal` |
| `safe_context` | jsonb | Objeto sanitizado e limitado em tamanho |
| `occurred_at` | timestamptz | Horário original do evento |
| `expires_at` | timestamptz | Padrão de 30 dias após `occurred_at` |
| `created_at` | timestamptz | Horário de recebimento pelo banco |

### Índices e constraints

- Chave primária em `id` evita duplicação no reenvio do mesmo evento.
- Índice `(tenant_id, occurred_at desc)` atende consulta por tenant.
- Índice em `expires_at` atende limpeza.
- Checks limitam categorias/resultados; tamanho de strings e JSON será validado no app e no banco quando viável.
- RLS: insert para membro autenticado do mesmo tenant; select/delete para gestão autorizada; update não concedido.

### Retenção

- Local: remover eventos após 7 dias e manter no máximo 200 por `(authUserId, tenantId)`.
- Remoto: 30 dias; políticas/consultas não retornam expirados, uma nova inserção remove eventos expirados do mesmo tenant e gestores autorizados podem executar exclusão explícita.

## Idempotent Operation Receipt

Usado apenas quando uma operação agregada precisa de transação e o ID da entidade principal não basta.

| Campo | Tipo | Regra |
|---|---|---|
| `tenant_id` | UUID | Parte da chave e do isolamento |
| `operation_name` | texto | Nome estável da operação |
| `idempotency_key` | UUID | Chave da tentativa lógica |
| `payload_hash` | texto | Detecta reutilização da chave com conteúdo divergente |
| `status` | enum | `processing`, `confirmed`, `failed` |
| `result_ref` | jsonb | Referência sanitizada ao resultado, sem payload de negócio completo |
| `created_at` | timestamptz | Auditoria |
| `updated_at` | timestamptz | Auditoria |

Constraint única: `(tenant_id, operation_name, idempotency_key)`. O recibo e a escrita de negócio devem ser modificados na mesma transação da RPC. Mesma chave e mesmo hash retornam o resultado confirmado; mesma chave e hash diferente retornam conflito.

## Reconciliation Record

Contrato local para falhas parciais que não puderem ser transacionais.

| Campo | Tipo | Regra |
|---|---|---|
| `logicalOperationId` | UUID | Liga a tentativa original |
| `tenantId` | UUID | Impede reconciliação em outro tenant |
| `completedSteps` | string[] | Etapas confirmadas por leitura ou resposta |
| `pendingSteps` | string[] | Etapas ainda necessárias |
| `status` | enum | `pending`, `running`, `resolved`, `terminal` |
| `lastErrorCode` | string opcional | Código sanitizado |

Reconciliação é repetível com a mesma chave lógica e revalida sessão, tenant e permissão antes de executar.

