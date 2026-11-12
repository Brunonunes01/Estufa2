# Tasks: Tratamento de Erros no App e Banco Legado

**Input**: Design documents from `/specs/007-tratamento-erros-app-banco/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Obrigatórios pela especificação e pela Constituição. Em cada história, escrever e executar os testes indicados antes da implementação e confirmar que falham pelo comportamento esperado.

**Organization**: As tarefas estão agrupadas por história para permitir implementação e validação incremental. Nenhuma tarefa autoriza migration remota, commit ou push.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo por alterar arquivos diferentes e não depender de tarefa incompleta.
- **[Story]**: História de usuário atendida (`US1`, `US2`, `US3`).
- Todos os caminhos são relativos à raiz do repositório.

## Phase 1: Setup e baseline

**Purpose**: Registrar o estado inicial e inventariar as fronteiras que serão alteradas.

- [X] T001 Executar `npm run typecheck`, `npm run lint` e `npm test`, registrando comandos, resultados e falhas preexistentes em `specs/007-tratamento-erros-app-banco/evidence/baseline.md`
- [X] T002 [P] Inventariar mensagens brutas, `console.error`, `showError`, erros Supabase e falhas silenciosas dos cinco fluxos essenciais em `specs/007-tratamento-erros-app-banco/evidence/error-surface-inventory.md`
- [X] T003 [P] Mapear todas as criações, reenvios, filas offline e escritas encadeadas para ação, serviço, tabelas, confirmação, risco de duplicidade e tarefa de implementação/teste responsável em `specs/007-tratamento-erros-app-banco/evidence/write-operation-inventory.md`
- [X] T004 [P] Criar fixtures reutilizáveis de erros Auth/PostgREST/rede, dois tenants e relógio determinístico em `tests/helpers/errorHandlingFixtures.ts`

**Checkpoint**: Baseline e inventários disponíveis sem alterar comportamento.

---

## Phase 2: Fundação compartilhada

**Purpose**: Criar os contratos de erro, resultado e identidade que bloqueiam todas as histórias.

**⚠️ CRITICAL**: Nenhuma história deve ser implementada antes desta fase.

### Tests

- [X] T005 [P] Ampliar os testes do erro normalizado em `tests/serviceError.test.ts` e `tests/contract/sensitiveEvidenceContract.test.ts`, cobrindo exatamente `validation`, `authentication`, `authorization`, `conflict`, `connectivity`, `availability`, `data-contract` e `unexpected`, os campos contratuais e a remoção recursiva de `token`, `password`, `senha`, `secret`, `key`, `session`, `cookie` e `authorization` em objetos/arrays antes de log, buffer ou UI
- [X] T006 [P] Criar testes das transições `pending`, `confirmed`, `degraded`, `retryable`, `partial` e `terminal`, exigindo `completedSteps` e `reconciliationAction` no estado parcial, em `tests/operationResult.test.ts`
- [X] T007 [P] Criar testes de classificação de validação, Auth, RLS, conflito único, timeout/rede, indisponibilidade, contrato PostgREST e erro desconhecido em `tests/serviceErrorClassifier.test.ts`
- [X] T008 [P] Criar testes para UUID lógico estável por operação e correlação nova por tentativa física em `tests/operationIdentity.test.ts`

### Implementation

- [X] T009 Estender `ServiceError` e implementar sanitização recursiva e limites de tipo/tamanho de `safeContext` em `src/services/serviceError.ts` conforme T005, preservando `cause` apenas em memória e tornando esta tarefa gate para qualquer persistência diagnóstica
- [X] T010 Implementar o discriminated union e as validações de transição de `OperationResult` em `src/services/operationResult.ts`
- [X] T011 Implementar classificação segura de erros locais, Auth, PostgREST e transporte em `src/services/serviceErrorClassifier.ts`, sem usar mensagem técnica bruta como mensagem de usuário
- [X] T012 Implementar geração/preservação de `logicalOperationId` e `correlationId` sem dependência nova em `src/services/operationIdentity.ts`
- [X] T013 Substituir a resolução genérica de mensagens por apresentação baseada em erro normalizado, mantendo fallback compatível, em `src/services/securityUiHelpers.ts`
- [X] T014 Executar os testes T005–T008, medir classificação/sanitização síncrona e confirmar ausência de chamadas remotas nesses helpers, registrando categorias, transições, tempo e limitações em `specs/007-tratamento-erros-app-banco/evidence/foundation-validation.md`

**Checkpoint**: Fundação pronta; cada história pode começar sobre contratos estáveis.

---

## Phase 3: User Story 1 — Receber orientação quando uma operação falha (Priority: P1) 🎯 MVP

**Goal**: Apresentar mensagem ligada à ação, próximo passo seguro e estado correto, sem sucesso falso.

**Independent Test**: Simular validação, sessão expirada, permissão negada, conflito, indisponibilidade e conexão interrompida em leitura e escrita; cada cenário deve mostrar ação corretiva e preservar o estado real.

### Tests for User Story 1

- [X] T015 [P] [US1] Criar em `tests/serviceErrorPresentation.test.ts` uma matriz contabilizável do catálogo de mensagem/próximo passo para as oito categorias e para ações de carregar, salvar, excluir e sincronizar, permitindo calcular cenários aprovados dividido pelo total executado
- [X] T016 [P] [US1] Criar testes de sessão expirada e permissão revogada sem alteração nem sucesso falso em `tests/authErrorHandling.test.ts`
- [X] T017 [P] [US1] Criar testes do contrato de feedback estruturado com mensagem, próximo passo e ação opcional de retry em `tests/feedbackContract.test.ts`
- [X] T018 [P] [US1] Criar regressões dos estados pendente, confirmado, repetível e terminal nas jornadas de ciclo, venda e despesa em `tests/integration/essentialWriteFeedback.test.ts`

### Implementation for User Story 1

- [X] T019 [US1] Implementar o catálogo acionável por categoria/operação, com fallback seguro e sem detalhes do provedor, em `src/services/serviceErrorPresentation.ts`
- [X] T020 [US1] Estender `FeedbackContext` para aceitar erro estruturado, próximo passo e retry opcional sem remover `showSuccess`, `showError` e `showWarning` existentes em `src/contexts/FeedbackContext.tsx`
- [X] T021 [P] [US1] Normalizar falhas de login, cadastro, restauração e expiração de sessão em `src/contexts/AuthContext.tsx`, `src/screens/Auth/LoginScreen.tsx` e `src/screens/Auth/RegisterScreen.tsx`
- [X] T022 [P] [US1] Aplicar erro acionável e degradação visível às cargas e ações do painel em `src/screens/Dashboard/DashboardScreen.tsx` e `src/hooks/useDashboardActions.ts`
- [X] T023 [P] [US1] Aplicar validação de campo, sessão e estados de escrita ao ciclo em `src/screens/Plantios/PlantioFormScreen.tsx` e `src/services/plantioService.ts`
- [X] T024 [P] [US1] Aplicar estados pendente/confirmado/repetível/terminal e mensagens seguras à venda em `src/screens/Vendas/VendasListScreen.tsx` e `src/services/vendaService.ts`
- [X] T025 [P] [US1] Aplicar estados pendente/confirmado/repetível/terminal e mensagens seguras à despesa em `src/screens/Despesas/DespesaFormScreen.tsx`, `src/screens/Despesas/DespesasListScreen.tsx` e `src/services/despesaService.ts`
- [X] T026 [US1] Impedir reentrada enquanto a mesma tentativa está em voo e refletir o estado correto do botão em `src/components/ui/LoadingButton.tsx`, validando T015–T018, feedback em até 1 segundo após a resposta e SC-007 com percentual mínimo de 95% registrado em `specs/007-tratamento-erros-app-banco/evidence/us1-validation.md`

**Checkpoint**: US1 entrega orientação acionável e pode ser demonstrada sem US2/US3.

---

## Phase 4: User Story 2 — Preservar a origem e o resultado das falhas (Priority: P1)

**Goal**: Preservar fonte, correlação, dados válidos, confirmação real, idempotência e evidência diagnóstica sanitizada.

**Independent Test**: Falhar individualmente fontes essenciais/auxiliares, interromper uma escrita após o envio, repetir a mesma operação e provocar falha parcial; a origem e o resultado devem permanecer verificáveis sem duplicidade.

### Tests for User Story 2

- [X] T027 [P] [US2] Atualizar `tests/compoundRead.test.ts` e criar `tests/legacyErrorCompatibility.test.ts` para exigir resultado por fonte, `dependentActions`, `blockedActions`, preservação das fontes válidas e leitura de registros legados com campos opcionais ausentes/estados antigos
- [X] T028 [P] [US2] Criar testes em `tests/diagnosticEvidence.test.ts` provando que cada uma das oito categorias gera evidência sanitizada, com partição por usuário/tenant, limite de 200 eventos, expiração local de 7 dias e lote de sincronização de até 50
- [X] T029 [P] [US2] Ampliar `tests/offlineStorage.test.ts` para exigir `logicalOperationId` persistido em reinício/retry, deduplicação da mesma tentativa e conflito para chave igual com payload divergente
- [X] T030 [P] [US2] Criar testes de interrupção sem confirmação, clique duplo, retry confirmado e reconciliação parcial em `tests/integration/idempotentWriteFlow.test.ts`, além do contrato de mesma chave/hash, chave/hash divergente, concorrência e rollback em `tests/persistence/idempotentAtomicWrites.test.ts`
- [X] T031 [P] [US2] Criar teste estático da migration diagnóstica em `tests/persistence/diagnosticEventsMigration.test.ts`, incluindo tabela, checks, índices, grants, RLS, invisibilidade imediata após 30 dias, limpeza por tenant em nova inserção e rollback documentado

### Implementation for User Story 2

- [X] T032 [US2] Refatorar `readCompound` para retornar todas as fontes, erros e ações bloqueadas sem lançar antes de preservar resultados independentes em `src/services/compoundRead.ts`
- [X] T033 [US2] Implementar buffer local, sanitização antes da gravação, retenção de 7 dias/200 eventos e lotes de 50 em `src/services/diagnosticEvidence.ts`
- [X] T034 [US2] Criar `diagnostic_events` em `supabase/migrations/20261112090000_0033_diagnostic_events.sql` com checks, índices, grants, RLS, leitura apenas para `can_manage_sharing_tenant`, filtro imediato de expirados, limpeza dos expirados do mesmo tenant em nova inserção e instruções reversíveis
- [X] T035 [US2] Criar contratos estáticos em `tests/persistence/diagnosticEventsRlsContract.test.ts` para anônimo, owner/admin com `can_manage_sharing_tenant`, operator/guest, tenant divergente, evento expirado invisível e limpeza por nova inserção, sem executar banco local
- [X] T036 [US2] Atualizar manualmente somente o contrato local de `diagnostic_events` em `src/types/supabase.ts` a partir da migration revisada, validando-o com typecheck e teste estático, sem Docker, Supabase local ou geração `--local`
- [X] T037 [US2] Integrar envio diagnóstico independente da fila de negócio e sem alterar o resultado da operação em `src/services/offline/syncServiceCore.ts` e `src/services/offline/syncService.ts`
- [X] T038 [US2] Adicionar `logicalOperationId`, hash canônico e deduplicação ao item de fila em `src/services/offline/offlineQueueStorage.ts` e `src/services/offline/offlinePayloadCodec.ts`
- [X] T039 [US2] Fazer `runOfflineWrite` distinguir pendente, confirmado, repetível, parcial e terminal sem tratar placeholder offline como confirmação remota em `src/services/offline/offlineWrite.ts`
- [X] T040 [P] [US2] Propagar IDs estáveis nas criações simples agrícolas em `src/services/estufaService.ts`, `src/services/plantioService.ts`, `src/services/insumoService.ts`, `src/services/manejoService.ts` e `src/services/tarefaAgricolaService.ts`
- [X] T041 [P] [US2] Propagar IDs estáveis nas criações simples comerciais em `src/services/clienteService.ts`, `src/services/fornecedorService.ts`, `src/services/despesaService.ts` e `src/services/caixaPessoaService.ts`
- [X] T042 [US2] Reproduzir e documentar etapas parciais de venda, aplicação e colheita, indicando quais exigem transação ou reconciliação, em `specs/007-tratamento-erros-app-banco/evidence/chained-write-reproduction.md`
- [X] T043 [US2] Com base em T042, criar recibo/RPCs transacionais com chave única `(tenant_id, operation_name, idempotency_key)` e hash em `supabase/migrations/20261112100000_0034_idempotent_atomic_writes.sql`, ou registrar em `specs/007-tratamento-erros-app-banco/evidence/chained-write-reproduction.md` que nenhuma migration é necessária e qual reconciliação satisfaz FR-014/FR-019
- [X] T044 [US2] Consumir RPC idempotente ou registrar reconciliação explícita conforme T042 em `src/services/vendaService.ts`, `src/services/aplicacaoService.ts` e `src/services/colheitaService.ts`
- [X] T045 [US2] Executar T027–T031, contratos estáticos das migrations realmente criadas e a jornada de US2; fechar cada linha de `specs/007-tratamento-erros-app-banco/evidence/write-operation-inventory.md` com implementação/teste ou não aplicabilidade justificada e registrar confirmação, replay, conflito e falha parcial em `specs/007-tratamento-erros-app-banco/evidence/us2-validation.md`

**Checkpoint**: US2 preserva origem/resultado e impede duplicidade nas operações cobertas.

---

## Phase 5: User Story 3 — Proteger dados e manter a persistência consistente (Priority: P1)

**Goal**: Impedir exposição de segredos, mistura entre tenants e registros inválidos ou parciais.

**Independent Test**: Usar dois tenants, sessão expirada, permissões distintas, payload incompleto e relacionamentos divergentes; todas as operações indevidas devem ser negadas sem revelar existência ou produzir escrita parcial.

### Tests for User Story 3

- [X] T046 [P] [US3] Ampliar `tests/contract/sensitiveEvidenceContract.test.ts` com regressões que provem que a sanitização recursiva da fundação é aplicada por UI, logs, buffer local e payload remoto sem dados de outro tenant
- [X] T047 [P] [US3] Criar matriz de leitura/escrita/update/delete para dois tenants, sessão ausente e permissões revogadas em `tests/integration/errorTenantIsolation.test.ts`
- [X] T048 [P] [US3] Criar testes de payload obrigatório, relacionamento de tenant, constraint e rollback atômico em `tests/persistence/errorIntegrityGuards.test.ts`
- [X] T049 [P] [US3] Criar testes que descartam resposta recebida após troca de usuário ou tenant em `tests/operationContextGuard.test.ts`

### Implementation for User Story 3

- [X] T050 [US3] Integrar o sanitizador já concluído em T009 em todas as entradas/saídas diagnósticas de `src/services/diagnosticEvidence.ts` e remover qualquer serialização residual de causa, payload bruto ou contexto de outro tenant
- [X] T051 [US3] Implementar captura e validação do contexto de usuário/tenant da tentativa, descartando respostas tardias divergentes, em `src/services/operationContextGuard.ts`
- [X] T052 [US3] Integrar a guarda de contexto nas consultas essenciais de painel, ciclos, vendas e despesas em `src/hooks/queries/useDashboardSummary.ts`, `src/hooks/queries/useEstufaDetailData.ts`, `src/screens/Vendas/VendasListScreen.tsx` e `src/hooks/useDespesasList.ts`
- [X] T053 [US3] Reproduzir cada divergência de schema/RLS antes de criar constraints, políticas ou funções corretivas e registrar impacto/rollback em `specs/007-tratamento-erros-app-banco/evidence/persistence-error-reproduction.md`
- [X] T054 [US3] Com base em T053, criar somente os guards justificados em `supabase/migrations/20261112110000_0035_error_integrity_guards.sql`, ou registrar em `specs/007-tratamento-erros-app-banco/evidence/persistence-error-reproduction.md` que nenhuma mudança de schema/RLS é necessária e quais validações existentes atendem FR-009/FR-010
- [X] T055 [US3] Se T054 criar migration, revisar seus contratos estáticos e atualizar manualmente `src/types/supabase.ts`; em ambos os resultados, ajustar validações de fronteira em `src/services/plantioService.ts`, `src/services/vendaService.ts` e `src/services/despesaService.ts`
- [X] T056 [US3] Executar T046–T049 e os contratos estáticos de schema/RLS, registrando migrations criadas ou não aplicáveis, regras allow/deny declaradas, payloads rejeitados e proteção contra registros parciais em `specs/007-tratamento-erros-app-banco/evidence/us3-validation.md`, sem Docker ou Supabase local
- [X] T057 [US3] Executar regressões de login, painel, ciclo, venda e despesa com dois tenants e registrar que nenhuma mensagem revela existência/dados cruzados em `specs/007-tratamento-erros-app-banco/evidence/essential-flow-regression.md`

**Checkpoint**: US3 comprova isolamento, sanitização e integridade do banco legado.

---

## Phase 6: Polish e validação transversal

**Purpose**: Fechar rastreabilidade, qualidade e segurança sem ampliar escopo.

- [X] T058 [P] Mapear FR-001–FR-019 e SC-001–SC-009 para implementação, testes e evidências em `specs/007-tratamento-erros-app-banco/evidence/requirements-traceability.md`
- [X] T059 Executar todos os cenários de `specs/007-tratamento-erros-app-banco/quickstart.md` no ambiente seguro e registrar resultados/limitações em `specs/007-tratamento-erros-app-banco/evidence/quickstart-validation.md`
- [X] T060 Executar `npm run validate`, verificar que a instrumentação não adiciona consultas remotas em renderizações normais e registrar duração, contagem de chamadas, falhas, correções e resultado final em `specs/007-tratamento-erros-app-banco/evidence/final-validation.md`
- [X] T061 [P] Verificar segredos, mensagens técnicas, referências ao banco abortado e alterações fora do escopo, registrando o resultado em `specs/007-tratamento-erros-app-banco/evidence/security-scope-review.md`
- [X] T062 Revisar rollback somente das migrations 0033–0035 efetivamente criadas, registrar decisões de não aplicabilidade, riscos residuais e autorização ainda necessária para qualquer aplicação remota em `specs/007-tratamento-erros-app-banco/evidence/migration-rollback-review.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: inicia imediatamente.
- **Phase 2 — Fundação**: depende da Phase 1 e bloqueia todas as histórias.
- **Phase 3 — US1**: depende da fundação e forma o MVP.
- **Phase 4 — US2**: depende da fundação; T042 bloqueia T043–T044 e T034 bloqueia T036–T037.
- **Phase 5 — US3**: depende da fundação; T050 reforça o buffer de T033 sem adiar o gate de sanitização de T009, T052 depende de T051 e T053 bloqueia T054–T055.
- **Phase 6 — Polish**: depende das histórias escolhidas para entrega; validação final completa depende das três.

### User Story Dependencies

```text
Setup → Foundation → US1 (MVP)
                   ├─→ US2
                   └─→ US3 core
Foundation deep sanitization ─→ US2 diagnostic evidence ─→ US3 isolation regressions
US1 + US2 + US3 ─→ Final validation
```

- **US1**: independente após a fundação.
- **US2**: independente após a fundação para leitura, idempotência e evidência; migrations dependem de reprodução documentada.
- **US3**: isolamento e integridade podem começar após a fundação; a sanitização profunda já é obrigatória antes de US2 e US3 apenas amplia regressões de integração.

### Within Each User Story

- Escrever e executar testes primeiro, confirmando falha pelo comportamento esperado.
- Implementar modelo/helper antes de integrar telas e serviços.
- Reproduzir falha de persistência antes de escrever migration.
- Validar migration e rollback por contratos estáticos antes de atualizar manualmente os tipos; execução em banco fica fora desta feature.
- Concluir a evidência da história antes de avançar ao gate final.

## Parallel Opportunities

- T002–T004 podem executar em paralelo após T001 iniciar o baseline.
- T005–T008 são testes independentes e paralelizáveis.
- Em US1, T015–T018 podem ser escritos em paralelo; T021–T025 alteram fluxos distintos.
- Em US2, T027–T031 podem ser escritos em paralelo; T040 e T041 cobrem grupos de serviços distintos.
- Em US3, T046–T049 podem ser escritos em paralelo; T058 e T061 são revisões independentes na fase final.

## Parallel Example: User Story 1

```text
Task T015: testes do catálogo em tests/serviceErrorPresentation.test.ts
Task T016: testes de sessão/permissão em tests/authErrorHandling.test.ts
Task T017: testes do feedback em tests/feedbackContract.test.ts
Task T018: testes das escritas essenciais em tests/integration/essentialWriteFeedback.test.ts
```

## Parallel Example: User Story 2

```text
Task T027: contrato de leitura composta em tests/compoundRead.test.ts
Task T028: buffer diagnóstico em tests/diagnosticEvidence.test.ts
Task T029: idempotência offline em tests/offlineStorage.test.ts
Task T031: contrato da migration em tests/persistence/diagnosticEventsMigration.test.ts
```

## Parallel Example: User Story 3

```text
Task T046: regressões de sanitização integrada em tests/contract/sensitiveEvidenceContract.test.ts
Task T047: isolamento em tests/integration/errorTenantIsolation.test.ts
Task T048: integridade SQL em tests/persistence/errorIntegrityGuards.test.ts
Task T049: resposta tardia em tests/operationContextGuard.test.ts
```

## Implementation Strategy

### MVP First — User Story 1

1. Completar Phase 1.
2. Completar Phase 2.
3. Completar Phase 3.
4. Parar e validar US1 independentemente com T015–T018 e T026.
5. Não aplicar migrations remotas; US1 deve funcionar sobre o banco legado atual.

### Incremental Delivery

1. Fundação comum e US1: orientação acionável e estados corretos.
2. US2: origem, degradação, idempotência, diagnóstico e reconciliação.
3. US3: sanitização profunda, isolamento e integridade no banco legado.
4. Phase 6: rastreabilidade e gates completos.

### Migration Safety

1. T031/T048 e o teste de RPC incluído em T030 definem o contrato vermelho.
2. T042/T053 registram a falha reproduzida.
3. T034 cria a persistência diagnóstica especificada; T043/T054 criam migrations somente quando justificadas ou registram formalmente não aplicabilidade.
4. T045/T056 validam por testes automatizados e contratos estáticos, sem ambiente local de banco.
5. T062 documenta rollback e deixa aplicação remota pendente de autorização separada.

## Notes

- `[P]` indica arquivos distintos e ausência de dependência imediata.
- Cada tarefa mantém um caminho exato para execução por agente.
- Tarefas condicionais de migration são concluídas pela migration validada ou por decisão de não aplicabilidade sustentada pela reprodução e pelos testes.
- Alterações de dependência, produção, Git ou banco novo abortado permanecem fora do escopo.

