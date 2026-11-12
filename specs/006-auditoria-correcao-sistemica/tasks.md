---

description: "Tarefas executÃ¡veis para auditoria e correÃ§Ã£o sistÃªmica do Estufa2"
---

# Tasks: Auditoria e CorreÃ§Ã£o SistÃªmica

**Input**: Design documents from `/specs/006-auditoria-correcao-sistemica/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/audit-contracts.md](./contracts/audit-contracts.md), [quickstart.md](./quickstart.md)

**Tests**: ObrigatÃ³rios. A especificaÃ§Ã£o exige reproduÃ§Ã£o e teste de regressÃ£o para cada correÃ§Ã£o aceita.

**Organization**: Tarefas agrupadas por histÃ³ria de usuÃ¡rio. Cada fase produz um incremento testÃ¡vel e mantÃ©m achados, regressÃµes e evidÃªncias rastreÃ¡veis.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo porque atua em arquivos distintos e nÃ£o depende de tarefa incompleta.
- **[Story]**: HistÃ³ria de usuÃ¡rio atendida pela tarefa.
- Toda aplicaÃ§Ã£o remota, migration remota, commit ou push permanece fora da autorizaÃ§Ã£o implÃ­cita desta lista.

## Phase 1: Setup (Shared Audit Infrastructure)

**Purpose**: Registrar o estado inicial e criar os artefatos versionados usados pela auditoria.

- [X] T001 Executar `npm run typecheck`, `npm run lint` e `npm test` e registrar comandos, contagem, duraÃ§Ã£o e falhas sem segredos em `specs/006-auditoria-correcao-sistemica/evidence/baseline.md`
- [X] T002 [P] Criar o inventÃ¡rio inicial de jornadas em `specs/006-auditoria-correcao-sistemica/audit/active-flow-inventory.md`, exigindo que â€œFluxos de escrita devem possuir cenÃ¡rio de leitura apÃ³s escritaâ€, â€œFluxos multi-tenant devem possuir cenÃ¡rio de acesso cruzado negadoâ€ e â€œFluxos compostos devem identificar fontes essenciais e auxiliaresâ€
- [X] T003 [P] Criar o registro de achados em `specs/006-auditoria-correcao-sistemica/audit/findings.md` com IDs `F006-###`, estados `discovered|reproduced|fixing|validated|blocked|out_of_scope` e a regra literal â€œvalidated exige regressÃ£o verde e evidÃªncia da suÃ­te relacionadaâ€
- [X] T004 [P] Criar o inventÃ¡rio de contratos em `specs/006-auditoria-correcao-sistemica/audit/data-contract-inventory.md` com serviÃ§o, tipo, migration, operaÃ§Ãµes, enumeraÃ§Ãµes, nulabilidade, relaÃ§Ãµes, tenant e estado `aligned|missing_in_app|missing_in_type|missing_in_schema|mismatch|legacy_only`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Automatizar as verificaÃ§Ãµes compartilhadas e padronizar como falhas e evidÃªncias serÃ£o tratadas.

**âš ï¸ CRITICAL**: Nenhuma histÃ³ria pode ser considerada concluÃ­da antes desta fase.

- [X] T005 [P] Criar teste que compara a sequÃªncia e o espelho das migrations em `tests/persistence/migrationMirror.test.ts`, validando `supabase-new/migrations/` contra `supabase-new/supabase/migrations/`
- [X] T006 [P] Criar teste de contrato que detecta campos e enumeraÃ§Ãµes ativos ausentes na baseline em `tests/contract/activeSchemaCompatibility.test.ts`
- [X] T007 [P] Criar testes da taxonomia `validation|authentication|authorization|conflict|connectivity|availability|data-contract|unexpected` e sanitizaÃ§Ã£o em `tests/serviceError.test.ts`
- [X] T008 Implementar erro tipado, causa preservada, contexto sanitizado e mensagem segura em `src/services/serviceError.ts` atÃ© T007 passar
- [X] T009 [P] Criar testes de classificaÃ§Ã£o `essential|auxiliary|optional` e atribuiÃ§Ã£o correta da fonte em `tests/compoundRead.test.ts`
- [X] T010 Implementar resultado e erro contextual para leituras compostas em `src/services/compoundRead.ts` atÃ© T009 passar
- [X] T011 [P] Criar verificaÃ§Ã£o de logs e artefatos contra token, senha, chave e sessÃ£o completa em `tests/contract/sensitiveEvidenceContract.test.ts`
- [X] T012 Executar os testes T005-T011 e registrar a evidÃªncia de fundaÃ§Ã£o em `specs/006-auditoria-correcao-sistemica/evidence/foundation.md`

**Checkpoint**: InventÃ¡rio, registro, contratos e verificaÃ§Ãµes compartilhadas prontos.

---

## Phase 3: User Story 1 â€” Executar fluxos essenciais sem bloqueios (Priority: P1) ðŸŽ¯ MVP

**Goal**: Garantir cadastro/login, conta vÃ¡lida, painel e CRUD essencial de estufa sem erro bloqueador.

**Independent Test**: Criar conta nova, entrar novamente, abrir o painel, verificar somente contas autorizadas e criar, ler, editar e excluir uma estufa permitida com confirmaÃ§Ã£o apÃ³s recarga.

### Tests for User Story 1

- [ ] T013 [P] [US1] Expandir regressÃµes de cadastro, restauraÃ§Ã£o de sessÃ£o e concorrÃªncia de eventos em `tests/authSessionCoordinator.test.ts` e `tests/authContextHelpers.test.ts`
- [ ] T014 [P] [US1] Expandir regressÃµes de provisionamento Ãºnico, membership vÃ¡lida e seleÃ§Ã£o determinÃ­stica em `tests/authTenantIntegration.test.ts` e `tests/authTenantService.test.ts`
- [ ] T015 [P] [US1] Criar teste de leitura composta do painel com falha individual de estufas, plantios, tarefas e resumo em `tests/dashboardServiceIntegration.test.ts`
- [ ] T016 [P] [US1] Criar contrato CRUD de estufa cobrindo payload, campos persistidos, leitura apÃ³s escrita e registros antigos em `tests/contract/greenhousePersistenceContract.test.ts`
- [ ] T017 [P] [US1] Criar teste da jornada login â†’ painel â†’ estufa com causas de erro preservadas em `tests/integration/essentialJourney.test.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Auditar e corrigir somente falhas reproduzidas de sessÃ£o e bootstrap em `src/contexts/AuthContext.tsx`, `src/services/authSessionCoordinator.ts` e `src/services/authTenantBootstrapCore.ts`, registrando cada achado em `specs/006-auditoria-correcao-sistemica/audit/findings.md`
- [ ] T019 [US1] Garantir uma conta owner canÃ´nica, memberships legÃ­veis distintas e seleÃ§Ã£o persistida autorizada em `src/services/authTenantHelpers.ts`, `src/services/authTenantService.ts` e `src/services/tenantSelectionStorage.ts`
- [ ] T020 [US1] Separar fontes essenciais e auxiliares do painel e preservar a fonte real da falha em `src/services/dashboardService.ts`, `src/hooks/queries/useDashboardSummary.ts` e `src/hooks/useDashboardMetrics.ts`
- [ ] T021 [US1] Alinhar criaÃ§Ã£o, leitura, atualizaÃ§Ã£o, exclusÃ£o permitida e mensagens de estufa em `src/services/estufaService.ts`, `src/hooks/queries/useEstufasListData.ts` e `src/screens/Estufas/EstufaFormScreen.tsx`
- [ ] T022 [US1] Corrigir incompatibilidades de colunas, enums, defaults ou relaÃ§Ãµes comprovadas por T016 usando migrations incrementais em `supabase-new/migrations/` e seus espelhos em `supabase-new/supabase/migrations/`, sem alterar migrations jÃ¡ aplicadas
- [ ] T023 [US1] Atualizar `src/types/supabase.ts` a partir do ambiente de validaÃ§Ã£o somente se T022 alterar o schema e confirmar que o diff nÃ£o remove objetos ativos
- [ ] T024 [US1] Executar o teste independente da US1 no web, registrar resultados e IDs de regressÃ£o em `specs/006-auditoria-correcao-sistemica/evidence/us1-essential-flow.md` e marcar achados validados em `specs/006-auditoria-correcao-sistemica/audit/findings.md`

**Checkpoint**: O MVP permite entrar, selecionar conta, abrir painel e operar estufas sem bloqueio conhecido.

---

## Phase 4: User Story 2 â€” Operar mÃ³dulos ativos com dados consistentes (Priority: P1)

**Goal**: Alinhar os contratos produtivos, comerciais e financeiros e confirmar seus reflexos entre mÃ³dulos.

**Independent Test**: Percorrer uma estufa com ciclo, operaÃ§Ãµes agrÃ­colas, colheita, venda, recebimento e despesa; verificar relaÃ§Ãµes, estados, totais, caixa e relatÃ³rios apÃ³s recarga.

### Tests for User Story 2

- [ ] T025 [P] [US2] Expandir contrato de plantios com todos os campos, enums, filtros de status e vÃ­nculos tenant/estufa em `tests/contract/productionPersistenceContract.test.ts`
- [ ] T026 [P] [US2] Criar contratos de tarefas, manejos, insumos e aplicaÃ§Ãµes em `tests/contract/agriculturalOperationsContract.test.ts`
- [ ] T027 [P] [US2] Criar contrato de colheitas com pesos, unidade, destino e vÃ­nculos tenant/plantio/estufa em `tests/contract/harvestPersistenceContract.test.ts`
- [ ] T028 [P] [US2] Expandir contratos de vendas, recebimentos, cheques, despesas e caixa em `tests/contract/financialPersistenceContract.test.ts`
- [ ] T029 [P] [US2] Criar contrato de clientes e fornecedores com escopo de tenant e relaÃ§Ãµes ativas em `tests/contract/contactPersistenceContract.test.ts`
- [ ] T030 [P] [US2] Expandir regressÃµes de valores combinados, recebidos, pendentes, pagos, cancelados e datas efetivas em `tests/financialReportHelpers.test.ts`, `tests/globalStatsHelpers.test.ts` e `tests/caixaServiceHelpers.test.ts`
- [ ] T031 [P] [US2] Criar jornada integrada estufa â†’ ciclo â†’ colheita â†’ venda â†’ recebimento â†’ despesa â†’ relatÃ³rios em `tests/integration/greenhouseBusinessJourney.test.ts`

### Implementation for User Story 2

- [ ] T032 [US2] Auditar e corrigir mapeamentos, validaÃ§Ãµes, transiÃ§Ãµes e relaÃ§Ãµes de ciclo em `src/services/plantioService.ts` e `src/screens/Plantios/PlantioFormScreen.tsx`, atualizando `specs/006-auditoria-correcao-sistemica/audit/findings.md`
- [ ] T033 [P] [US2] Auditar e corrigir tarefas e manejos comprovadamente divergentes em `src/services/tarefaAgricolaService.ts` e `src/services/manejoService.ts`
- [ ] T034 [P] [US2] Auditar e corrigir estoque e aplicaÃ§Ãµes comprovadamente divergentes em `src/services/insumoService.ts` e `src/services/aplicacaoService.ts`
- [ ] T035 [US2] Auditar e corrigir colheitas, pesos e vÃ­nculos em `src/services/colheitaService.ts` e `src/screens/Colheitas/ColheitaFormScreen.tsx`
- [ ] T036 [P] [US2] Auditar e corrigir clientes e fornecedores em `src/services/clienteService.ts`, `src/services/fornecedorService.ts`, `src/hooks/queries/useClientesListData.ts` e `src/hooks/queries/useFornecedoresListData.ts`
- [ ] T037 [US2] Auditar e corrigir vendas, recebimentos, cheques e confirmaÃ§Ãµes de escrita em `src/services/vendaService.ts`, `src/services/receiptService.ts` e `src/screens/Vendas/VendasListScreen.tsx`
- [ ] T038 [US2] Auditar e corrigir despesas, caixa, resumos e datas efetivas em `src/services/despesaService.ts`, `src/services/caixaService.ts`, `src/services/globalStatsService.ts` e `src/hooks/queries/useDespesasListData.ts`
- [ ] T039 [US2] Corrigir incompatibilidades de persistÃªncia confirmadas por T025-T029 com migrations aditivas em `supabase-new/migrations/` e espelhos em `supabase-new/supabase/migrations/`, atualizando `src/types/supabase.ts` somente apÃ³s validaÃ§Ã£o do schema
- [ ] T040 [US2] Executar a jornada independente da US2, reconciliar todos os totais e registrar evidÃªncia em `specs/006-auditoria-correcao-sistemica/evidence/us2-domain-consistency.md`

**Checkpoint**: MÃ³dulos ativos persistem e apresentam dados coerentes de ponta a ponta.

---

## Phase 5: User Story 3 â€” Preservar seguranÃ§a e isolamento entre contas (Priority: P1)

**Goal**: Comprovar menor privilÃ©gio e impedir leitura, escrita, cache ou replay cruzado entre contas.

**Independent Test**: Usar dois tenants e os perfis owner, shared admin, operator e guest para testar read/write/delete/manage-sharing permitidos e negados.

### Tests for User Story 3

- [ ] T041 [P] [US3] Expandir matriz owner/shared-admin/operator/guest por operaÃ§Ã£o em `tests/accessControlOperations.test.ts` e `tests/accessControl.test.ts`
- [ ] T042 [P] [US3] Expandir contratos RLS com casos permitido, negado, tenant nÃ£o relacionado e acesso revogado em `tests/persistence/rlsOperations.test.ts` e `tests/persistence/tenantIsolation.test.ts`
- [ ] T043 [P] [US3] Criar regressÃ£o de troca de tenant para cache, query keys e seleÃ§Ã£o persistida em `tests/integration/tenantSwitchIsolation.test.ts`
- [ ] T044 [P] [US3] Criar regressÃ£o de owner-only versus admin compartilhado para compartilhamento e exclusÃ£o em `tests/shareServiceIntegration.test.ts` e `tests/securityServiceHelpers.test.ts`

### Implementation for User Story 3

- [ ] T045 [US3] Corrigir somente desvios da matriz em `src/hooks/useAuth.ts`, `src/services/tenantAuthorizationState.ts`, `src/services/tenantGuard.ts` e `src/services/securityService.ts`
- [ ] T046 [US3] Corrigir isolamento de cache e invalidaÃ§Ã£o ao trocar conta em `src/contexts/AuthContext.tsx`, `src/lib/queryClient.ts` e `src/hooks/queries/`
- [ ] T047 [US3] Corrigir compartilhamento, revogaÃ§Ã£o e aÃ§Ãµes owner-only em `src/services/shareServiceCore.ts`, `src/services/shareService.ts` e `src/screens/Auth/ShareAccountScreen.tsx`
- [ ] T048 [US3] Corrigir polÃ­ticas ou funÃ§Ãµes de autorizaÃ§Ã£o comprovadamente divergentes com migration aditiva em `supabase-new/migrations/` e espelho em `supabase-new/supabase/migrations/`, sem aplicar remotamente sem autorizaÃ§Ã£o explÃ­cita
- [ ] T049 [US3] Executar a matriz independente com duas contas, registrar casos permitidos e negados em `specs/006-auditoria-correcao-sistemica/evidence/us3-tenant-permissions.md` e fechar achados correspondentes em `specs/006-auditoria-correcao-sistemica/audit/findings.md`

**Checkpoint**: Nenhum acesso cruzado conhecido e todas as permissÃµes independentes comprovadas.

---

## Phase 6: User Story 4 â€” Recuperar-se de rede instÃ¡vel sem perda silenciosa (Priority: P2)

**Goal**: Garantir fila particionada por usuÃ¡rio/tenant, replay idempotente e estados corretos para operaÃ§Ãµes offline e online-only.

**Independent Test**: Interromper rede antes/depois de escrita, reiniciar, reconectar e trocar de conta, confirmando no mÃ¡ximo um resultado durÃ¡vel e nenhum replay cruzado.

### Tests for User Story 4

- [ ] T050 [P] [US4] Expandir serializaÃ§Ã£o versionada e rejeiÃ§Ã£o de payload invÃ¡lido em `tests/offlinePayloadCodec.test.ts`
- [ ] T051 [P] [US4] Expandir fila com `authUserId` e `tenantId` imutÃ¡veis, item legado sem escopo e separaÃ§Ã£o de contexto em `tests/offlineStorage.test.ts`
- [ ] T052 [P] [US4] Criar regressÃµes de idempotÃªncia, repetiÃ§Ã£o apÃ³s perda de resposta e estado terminal em `tests/syncServiceIntegration.test.ts`
- [ ] T053 [P] [US4] Criar regressÃ£o de aÃ§Ãµes queueable versus online-only e mensagens de estado em `tests/integration/offlineWriteJourney.test.ts`

### Implementation for User Story 4

- [ ] T054 [US4] Implementar `queueItemId`, `idempotencyKey`, `authUserId`, `tenantId`, `payloadVersion`, `attempts` e estados `queued|processing|succeeded|retryable_failed|terminal_failed` em `src/services/offline/offlineQueueStorage.ts` e `src/services/offline/offlinePayloadCodec.ts`, mantendo usuÃ¡rio e tenant imutÃ¡veis
- [ ] T055 [US4] Revalidar sessÃ£o, membership e permissÃ£o e impedir adoÃ§Ã£o automÃ¡tica de item sem escopo em `src/services/offline/offlineStorage.ts` e `src/services/offline/syncServiceCore.ts`
- [ ] T056 [US4] Garantir replay no mÃ¡ximo uma vez e classificaÃ§Ã£o retryable/terminal em `src/services/offline/offlineWrite.ts`, `src/services/offline/syncService.ts` e `src/services/offline/offlineStorageHandlers.ts`
- [ ] T057 [US4] Executar a jornada offline independente no web e mÃ³vel e registrar evidÃªncia em `specs/006-auditoria-correcao-sistemica/evidence/us4-offline-resilience.md`

**Checkpoint**: ReconexÃ£o e troca de contexto nÃ£o produzem duplicidade, perda silenciosa ou mistura de tenant.

---

## Phase 7: User Story 5 â€” Receber mensagens Ãºteis e rastreÃ¡veis (Priority: P2)

**Goal**: Tornar erros conhecidos acionÃ¡veis, identificar a fonte de falhas compostas e preservar diagnÃ³stico sanitizado.

**Independent Test**: Simular as oito categorias de erro e uma falha secundÃ¡ria em tela composta, verificando mensagem, orientaÃ§Ã£o, fonte e ausÃªncia de dados sensÃ­veis.

### Tests for User Story 5

- [ ] T058 [P] [US5] Expandir mensagens seguras das oito categorias e fallback inesperado em `tests/serviceError.test.ts` e `tests/securityUiHelpers.test.ts`
- [ ] T059 [P] [US5] Criar regressÃµes de erro por fonte para hooks compostos em `tests/integration/compoundScreenErrors.test.ts`
- [ ] T060 [P] [US5] Criar contrato que verifica ausÃªncia de mensagens genÃ©ricas que descartem a causa em `tests/contract/serviceErrorPropagation.test.ts`

### Implementation for User Story 5

- [ ] T061 [US5] Integrar a taxonomia e preservar `cause` nos serviÃ§os ativos de `src/services/`, comeÃ§ando pelos achados critical/high registrados em `specs/006-auditoria-correcao-sistemica/audit/findings.md`
- [ ] T062 [P] [US5] Corrigir atribuiÃ§Ã£o de fonte e degradaÃ§Ã£o explÃ­cita em `src/hooks/queries/useEstufasListData.ts`, `src/hooks/queries/useDashboardSummary.ts`, `src/hooks/queries/useDespesasListData.ts` e `src/services/dashboardService.ts`
- [ ] T063 [P] [US5] Padronizar mensagens acionÃ¡veis nos fluxos com achados confirmados em `src/contexts/FeedbackContext.tsx`, `src/screens/Auth/`, `src/screens/Estufas/`, `src/screens/Plantios/`, `src/screens/Vendas/` e `src/screens/Despesas/`
- [ ] T064 [US5] Remover ou sanitizar logs que exponham payload, sessÃ£o ou dados de outro tenant em `src/contexts/` e `src/services/` atÃ© T011 e T060 passarem
- [ ] T065 [US5] Executar as oito simulaÃ§Ãµes e registrar mensagem, orientaÃ§Ã£o e diagnÃ³stico em `specs/006-auditoria-correcao-sistemica/evidence/us5-error-diagnostics.md`

**Checkpoint**: Falhas conhecidas sÃ£o distinguÃ­veis e acionÃ¡veis sem exposiÃ§Ã£o sensÃ­vel.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Fechar a auditoria, validar toda a baseline e documentar qualquer limitaÃ§Ã£o remanescente.

- [ ] T066 [P] Atualizar `specs/006-auditoria-correcao-sistemica/audit/active-flow-inventory.md` com resultado `passed|failed|blocked` e evidÃªncia para 100% dos fluxos ativos
- [ ] T067 [P] Atualizar `specs/006-auditoria-correcao-sistemica/audit/data-contract-inventory.md` e garantir que todo contrato ativo esteja `aligned` ou vinculado a achado aberto
- [X] T068 Executar `npm run validate` e registrar contagem, duraÃ§Ã£o e resultado em `specs/006-auditoria-correcao-sistemica/evidence/final-automated-validation.md`
- [ ] T069 Executar todos os cenÃ¡rios web de `specs/006-auditoria-correcao-sistemica/quickstart.md` e registrar resultados em `specs/006-auditoria-correcao-sistemica/evidence/final-web-acceptance.md`
- [ ] T070 Executar os cenÃ¡rios mÃ³veis essenciais e offline de `specs/006-auditoria-correcao-sistemica/quickstart.md` e registrar resultados em `specs/006-auditoria-correcao-sistemica/evidence/final-mobile-acceptance.md`
- [ ] T071 Validar migrations em ambiente local/validaÃ§Ã£o, documentar rollback e dry-run sanitizado em `specs/006-auditoria-correcao-sistemica/evidence/final-schema-validation.md` sem aplicar mudanÃ§a remota
- [ ] T072 Obter autorizaÃ§Ã£o explÃ­cita do usuÃ¡rio antes de qualquer aplicaÃ§Ã£o remota necessÃ¡ria e registrar decisÃ£o e resultado em `specs/006-auditoria-correcao-sistemica/evidence/remote-migration-approval.md`
- [ ] T073 Consolidar falhas corrigidas, abertas, bloqueadas e fora do escopo, garantindo zero critical/high aberto ou aceite explÃ­cito, em `specs/006-auditoria-correcao-sistemica/audit/final-report.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 â€” Setup**: sem dependÃªncias.
- **Phase 2 â€” Foundational**: depende da Phase 1 e bloqueia todas as histÃ³rias.
- **US1, US2 e US3 (P1)**: iniciam apÃ³s a fundaÃ§Ã£o; executar preferencialmente US1 â†’ US2 â†’ US3 para estabilizar identidade antes dos mÃ³dulos e seguranÃ§a completa.
- **US4 e US5 (P2)**: iniciam apÃ³s a fundaÃ§Ã£o; US4 aproveita os contratos de tenant da US3 e US5 aproveita os achados das demais histÃ³rias.
- **Phase 8**: depende das histÃ³rias selecionadas e fecha a iniciativa completa.

### User Story Dependencies

- **US1**: depende apenas da fundaÃ§Ã£o e entrega o MVP.
- **US2**: depende da fundaÃ§Ã£o; usa conta e estufa estÃ¡veis da US1 para a aceitaÃ§Ã£o manual, mas seus contratos podem ser executados em paralelo.
- **US3**: depende da fundaÃ§Ã£o; pode auditar regras em paralelo, mas a matriz manual usa bootstrap estÃ¡vel da US1.
- **US4**: depende da fundaÃ§Ã£o e dos contratos de escopo de tenant; a validaÃ§Ã£o manual final deve ocorrer apÃ³s US3.
- **US5**: depende da taxonomia criada na fundaÃ§Ã£o; sua aplicaÃ§Ã£o Ã© incremental sobre achados de US1-US4.

### Within Each User Story

1. Escrever/reproduzir testes e confirmar falha ou contrato violado.
2. Registrar finding como `reproduced`.
3. Aplicar correÃ§Ã£o mÃ­nima nos arquivos indicados.
4. Executar teste focado e suÃ­te relacionada.
5. Executar teste independente da histÃ³ria.
6. Vincular evidÃªncia e marcar finding como `validated`.

## Parallel Opportunities

- T002-T004 podem executar em paralelo apÃ³s T001.
- T005-T007, T009 e T011 atuam em testes distintos e podem executar em paralelo.
- T013-T017 podem ser escritos em paralelo antes das correÃ§Ãµes da US1.
- T025-T031 podem ser escritos em paralelo por domÃ­nio; T033, T034 e T036 podem ser implementadas em paralelo.
- T041-T044 podem executar em paralelo; correÃ§Ãµes devem ser serializadas quando tocarem autorizaÃ§Ã£o compartilhada.
- T050-T053 podem executar em paralelo antes de T054-T056.
- T058-T060 e depois T062-T063 podem executar em paralelo em arquivos distintos.
- T066-T067 podem executar em paralelo; T069-T071 podem executar em paralelo apÃ³s T068 quando os ambientes estiverem disponÃ­veis.

## Parallel Example: User Story 2

```text
Task T025: Contrato de plantios em tests/contract/productionPersistenceContract.test.ts
Task T026: Contrato de operaÃ§Ãµes agrÃ­colas em tests/contract/agriculturalOperationsContract.test.ts
Task T027: Contrato de colheitas em tests/contract/harvestPersistenceContract.test.ts
Task T028: Contrato financeiro em tests/contract/financialPersistenceContract.test.ts
Task T029: Contrato de contatos em tests/contract/contactPersistenceContract.test.ts
Task T030: RegressÃµes de cÃ¡lculos nos testes financeiros existentes
```

## Parallel Example: User Story 3

```text
Task T041: Matriz de permissÃµes nos testes de acesso
Task T042: PolÃ­ticas e isolamento nos testes de persistÃªncia
Task T043: Troca de tenant e cache no teste de integraÃ§Ã£o
Task T044: Owner-only e compartilhamento nos testes de serviÃ§o
```

## Implementation Strategy

### MVP First â€” User Story 1

1. Completar Phase 1 e Phase 2.
2. Executar T013-T017 e confirmar as falhas reproduzidas.
3. Implementar T018-T023 sem aplicaÃ§Ã£o remota implÃ­cita.
4. Executar T024 e parar para validaÃ§Ã£o do usuÃ¡rio.

### Incremental Delivery

1. **US1**: identidade, conta, painel e estufa.
2. **US2**: operaÃ§Ã£o agrÃ­cola, comercial e financeira coerente.
3. **US3**: matriz completa de isolamento e permissÃµes.
4. **US4**: resiliÃªncia offline e idempotÃªncia.
5. **US5**: diagnÃ³stico e mensagens em todos os achados confirmados.
6. **Final**: quickstart completo, relatÃ³rio e qualquer aprovaÃ§Ã£o remota separada.

### Safety Rules

- NÃ£o corrigir achado sem reproduÃ§Ã£o ou contrato objetivo violado.
- NÃ£o reescrever migrations aplicadas nem alterar o banco diretamente.
- NÃ£o apagar ou consolidar dados existentes sem requisito e autorizaÃ§Ã£o prÃ³prios.
- NÃ£o adicionar dependÃªncias durante esta feature.
- NÃ£o executar commit, push, cutover ou migration remota sem autorizaÃ§Ã£o explÃ­cita.

## Notes

- `[P]` indica arquivos distintos e ausÃªncia de dependÃªncia direta.
- Cada correÃ§Ã£o deve manter `specs/006-auditoria-correcao-sistemica/audit/findings.md` atualizado.
- Achado `critical` significa acesso cruzado, corrupÃ§Ã£o/perda ampla, bypass de autenticaÃ§Ã£o ou indisponibilidade total.
- Achado `high` significa bloqueio de jornada essencial, perda silenciosa localizada ou valor financeiro incorreto.
- `validated` exige regressÃ£o verde e evidÃªncia da suÃ­te relacionada.
- Tarefas condicionais de schema/tipos sÃ³ sÃ£o executadas quando o contrato violado for comprovado.


