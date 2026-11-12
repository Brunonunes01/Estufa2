---
description: "Task list for new persistence reconstruction"
---

# Tasks: Reconstrução Nova da Persistência

**Input**: Design documents from `specs/005-reconstrucao-controlada-persistencia/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Incluídos porque a especificação exige testes diretos de RLS, integridade, compatibilidade e validação da baseline.

**Safety**: Nenhuma tarefa deste arquivo autoriza uso de produção, migração de dados legados, aplicação remota sem credenciais ou cutover sem aprovação explícita.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar uma área isolada para a baseline nova sem reutilizar automaticamente a sequência legada.

- [X] T001 Confirmar em `specs/005-reconstrucao-controlada-persistencia/spec.md` que o novo banco começa vazio, não recebe usuários/dados legados e não altera o banco anterior.
- [X] T002 [P] Registrar em `specs/005-reconstrucao-controlada-persistencia/research.md` o inventário inicial das migrations legadas apenas como referência, sem reaplicá-las.
- [X] T003 [P] Criar a área isolada do novo projeto em `supabase-new/config.toml`, separada de `supabase/migrations/` legado.
- [X] T004 [P] Documentar em `supabase-new/.env.example` somente nomes de configurações necessárias, sem incluir credenciais reais.
- [X] T005 [P] Criar a estrutura de testes em `tests/persistence/`, `tests/contract/` e `tests/integration/` sem conexão remota obrigatória.
- [X] T006 Confirmar em `specs/005-reconstrucao-controlada-persistencia/quickstart.md` que validação local pode ocorrer sem credenciais e que validação remota é pendente.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir inventário, convenções e testes-base que bloqueiam as histórias até estarem aprovados.

**CRITICAL**: Nenhuma tabela operacional ou migration de domínio deve ser implementada antes desta fase.

- [X] T007 [P] Inventariar entidades, relações, constraints, funções, triggers, permissões e operações dos serviços ativos em `specs/005-reconstrucao-controlada-persistencia/data-model.md`.
- [X] T008 [P] Mapear os contratos de autenticação, cadastro novo, tenant, permissões, produção, financeiro, auditoria e offline em `specs/005-reconstrucao-controlada-persistencia/contracts/persistence-baseline.md`.
- [X] T009 [P] Criar teste de aplicação limpa da baseline em `tests/persistence/emptyDatabase.test.ts`.
- [X] T010 [P] Criar testes-base de isolamento entre tenants em `tests/persistence/tenantIsolation.test.ts`.
- [X] T011 [P] Criar testes que confirmem ausência de importação de usuários e dados legados em `tests/persistence/legacyIsolation.test.ts`.
- [X] T012 Definir em `supabase-new/README.md` o fluxo de criação local, ordem de migrations, ausência de credenciais e limites de segurança.
- [X] T013 Validar que nenhuma tarefa ou arquivo aponta a sequência legada como fonte automática de execução em `supabase-new/`.

**Checkpoint**: inventário, workspace isolado e testes-base aprovados; nenhuma migration operacional criada ainda.

## Phase 3: User Story 1 - Baseline nova reproduzível (Priority: P1) 🎯 MVP

**Goal**: Criar o banco vazio do zero com uma sequência versionada, revisável e reproduzível.

**Independent Test**: Aplicar somente as migrations de `supabase-new/migrations/` em um banco vazio e confirmar a estrutura aprovada sem consultar o legado.

### Tests for User Story 1

- [X] T014 [P] [US1] Criar teste de ordem e aplicação única das migrations em `tests/persistence/migrationOrder.test.ts`.
- [X] T015 [P] [US1] Criar teste de reprodutibilidade em banco vazio em `tests/persistence/reproducibleBaseline.test.ts`.
- [X] T016 [P] [US1] Criar teste de inventário que rejeite objetos sem justificativa em `tests/persistence/schemaInventory.test.ts`.

### Implementation for User Story 1

- [X] T017 [US1] Criar migration de extensões, tipos comuns, timestamps e funções-base em `supabase-new/migrations/0001_foundation.sql`.
- [X] T018 [US1] Criar migration de cadastro novo, perfis, tenants e memberships em `supabase-new/migrations/0002_identity_and_tenants.sql`, sem consultar usuários legados.
- [X] T019 [US1] Criar migration de autorização, funções de escopo e RLS-base em `supabase-new/migrations/0003_authorization.sql`.
- [X] T020 [US1] Criar migration do domínio de estufas, safras e ciclos em `supabase-new/migrations/0004_greenhouse_domain.sql`.
- [X] T021 [US1] Criar migration de constraints e índices da baseline em `supabase-new/migrations/0005_foundation_constraints.sql`.
- [X] T022 [US1] Documentar cada objeto incluído e sua justificativa em `specs/005-reconstrucao-controlada-persistencia/data-model.md`.
- [ ] T023 [US1] Executar a baseline em ambiente local vazio e registrar resultado em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.

**Checkpoint**: a baseline de identidade, autorização e estufas reproduz o ambiente vazio sem legado e sem objetos de campo/talhão/hidroponia.

## Phase 4: User Story 2 - Compatibilidade e segurança dos serviços (Priority: P1)

**Goal**: Preservar os contratos ativos de autenticação, permissões, produção, financeiro, auditoria e offline no novo modelo.

**Independent Test**: Executar testes positivos e negativos de RLS e contratos usando dois tenants e contas criadas do zero.

### Tests for User Story 2

- [X] T024 [P] [US2] Criar testes diretos de RLS para leitura, escrita, exclusão e compartilhamento em `tests/persistence/rlsOperations.test.ts`.
- [X] T025 [P] [US2] Criar testes de cadastro novo e memberships em `tests/contract/newUserProvisioning.test.ts`.
- [X] T026 [P] [US2] Criar testes de vínculos produtivos e tenant em `tests/contract/productionPersistenceContract.test.ts`.
- [X] T027 [P] [US2] Criar testes de estados financeiros e valor recebido separado em `tests/contract/financialPersistenceContract.test.ts`.
- [X] T028 [P] [US2] Criar testes de auditoria, rastreabilidade e ator em `tests/contract/auditPersistenceContract.test.ts`.
- [X] T029 [P] [US2] Criar testes de compatibilidade do payload offline em `tests/contract/offlinePersistenceContract.test.ts`.

### Implementation for User Story 2

- [X] T030 [P] [US2] Criar migration de clientes, fornecedores, insumos e operações de estoque em `supabase-new/migrations/0006_shared_operations.sql`.
- [X] T031 [P] [US2] Criar migration de aplicações, manejos e tarefas vinculadas ao tenant em `supabase-new/migrations/0007_production_operations.sql`.
- [X] T032 [US2] Criar migration de colheitas, vendas e itens com vínculos de ciclo em `supabase-new/migrations/0008_harvest_and_sales.sql`.
- [X] T033 [US2] Criar migration de recebimentos, cheques, despesas e caixa em `supabase-new/migrations/0009_finance.sql`.
- [X] T034 [US2] Criar migration de auditoria e rastreabilidade em `supabase-new/migrations/0010_audit_traceability.sql`.
- [X] T035 [US2] Adicionar constraints de tenant, origem, ciclo, estados financeiros e relações em `supabase-new/migrations/0011_domain_constraints.sql`.
- [X] T036 [US2] Adicionar RLS específica das entidades operacionais e financeiras em `supabase-new/migrations/0012_operational_rls.sql`.
- [ ] T037 [US2] Atualizar `src/types/supabase.ts` somente a partir do novo ambiente validado, sem credenciais hardcoded ou geração contra produção.
- [X] T038 [US2] Atualizar `specs/005-reconstrucao-controlada-persistencia/contracts/persistence-baseline.md` com os resultados dos testes de compatibilidade.

**Checkpoint**: serviços ativos possuem estrutura compatível e RLS bloqueia operações fora do tenant diretamente no banco.

## Phase 5: User Story 3 - Validação isolada e cutover aprovado (Priority: P2)

**Goal**: Validar a baseline em ambiente isolado, registrar evidências e preparar rollback sem alterar o legado.

**Independent Test**: Recriar o ambiente isolado, executar a bateria completa, simular falhas e confirmar que nenhum cutover ocorre sem aprovação.

### Tests for User Story 3

- [X] T039 [P] [US3] Criar teste de falha parcial e repetição segura da baseline em `tests/integration/baselineFailureRecovery.test.ts`.
- [X] T040 [P] [US3] Criar teste de rollback e ausência de alteração no legado em `tests/integration/legacyPreservation.test.ts`.
- [X] T041 [P] [US3] Criar teste de credencial ausente ou inválida em `tests/integration/remoteCredentialGate.test.ts`.
- [X] T042 [P] [US3] Criar teste do fluxo de aprovação e bloqueio de cutover em `tests/integration/cutoverApproval.test.ts`.

### Implementation for User Story 3

- [X] T043 [US3] Configurar ambiente local/staging isolado e registrar parâmetros não sensíveis em `supabase-new/config.toml` e `supabase-new/.env.example`.
- [X] T044 [US3] Documentar procedimento de rollback e critérios de entrada/saída em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [X] T045 [US3] Executar validação local completa sem credenciais remotas e registrar falhas em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [ ] T046 [US3] Executar validação em staging somente quando as credenciais forem fornecidas e registrar evidências em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [ ] T047 [US3] Obter aprovação explícita do cutover e registrar responsável, janela e rollback em `specs/005-reconstrucao-controlada-persistencia/contracts/persistence-baseline.md`.

**Checkpoint**: a baseline está validada ou possui pendências explícitas; sem aprovação não há promoção nem alteração do legado.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar documentação, testes e evidências sem ocultar bloqueios de credenciais.

- [X] T048 [P] Atualizar `specs/005-reconstrucao-controlada-persistencia/research.md` com decisões descobertas durante a implementação.
- [X] T049 [P] Atualizar `specs/005-reconstrucao-controlada-persistencia/data-model.md` com o inventário final e objetos compartilhados justificados.
- [X] T050 [P] Atualizar `specs/005-reconstrucao-controlada-persistencia/contracts/persistence-baseline.md` com resultados finais de RLS e rollback.
- [X] T051 [P] Atualizar `specs/005-reconstrucao-controlada-persistencia/quickstart.md` com os comandos e resultados finais.
- [X] T052 Executar `npm run typecheck` e registrar o resultado em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [X] T053 Executar `npm run lint` e registrar o resultado em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [X] T054 Executar `npm test` e registrar contagem, falhas e regressões em `specs/005-reconstrucao-controlada-persistencia/quickstart.md`.
- [X] T055 Confirmar em `specs/005-reconstrucao-controlada-persistencia/quickstart.md` que nenhum usuário, dado histórico, dado financeiro ou registro do legado foi copiado, alterado ou descartado.
- [ ] T056 Registrar a confirmação explícita do usuário em `specs/005-reconstrucao-controlada-persistencia/quickstart.md` antes de criar o commit da spec 005.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; cria a área isolada e as regras de segurança do trabalho.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias.
- **User Story 1 (Phase 3)**: depende da Foundation; é o MVP da baseline vazia.
- **User Story 2 (Phase 4)**: depende da baseline de identidade/autorização e adiciona os contratos dos serviços ativos.
- **User Story 3 (Phase 5)**: depende das migrations e testes das US1/US2; credenciais são necessárias somente para staging.
- **Polish (Phase 6)**: depende das histórias escolhidas e não pode ocultar pendências remotas.

### User Story Dependencies

- **US1 (P1)**: começa após a Foundation; estabelece baseline vazia e cadastro novo.
- **US2 (P1)**: depende de US1 para aplicar RLS e relações operacionais.
- **US3 (P2)**: depende de US1 e US2 para validar staging, rollback e cutover.

### Parallel Opportunities

- T002–T005 podem ocorrer em paralelo após T001.
- T007–T011 podem ocorrer em paralelo após a área isolada existir.
- T014–T016 podem ocorrer em paralelo antes das migrations da US1.
- T024–T029 podem ocorrer em paralelo antes da implementação operacional da US2.
- T030–T031 podem ocorrer em paralelo; T032–T036 dependem dos contratos de entidades relacionados.
- T039–T042 podem ocorrer em paralelo após a baseline funcional.
- T048–T051 podem ocorrer em paralelo antes dos comandos finais T052–T055.

## Parallel Example: User Story 1

```text
Task: T014 [P] [US1] Teste de ordem das migrations em tests/persistence/migrationOrder.test.ts
Task: T015 [P] [US1] Teste de reprodutibilidade em tests/persistence/reproducibleBaseline.test.ts
Task: T016 [P] [US1] Teste de inventário em tests/persistence/schemaInventory.test.ts
```

## Implementation Strategy

### MVP First

1. Completar Setup e Foundation.
2. Implementar US1: baseline vazia, cadastro novo, tenant, memberships, autorização e estufas.
3. Validar aplicação limpa e isolamento inicial.
4. Parar antes de US2 se o MVP não reproduzir a baseline sem legado.

### Incremental Delivery

1. US1 → baseline vazia reproduzível.
2. US2 → serviços ativos, RLS, financeiro, auditoria e offline.
3. US3 → staging, rollback, evidências e aprovação de cutover.
4. Polish → validações finais e confirmação antes do commit.

## Notes

- `[P]` indica arquivos independentes e sem dependências incompletas compartilhadas.
- Toda tarefa possui ID, checkbox, fase/story quando aplicável e caminho exato.
- Credenciais ausentes bloqueiam apenas tarefas remotas; não devem ser contornadas com segredos fictícios.
- Nenhuma tarefa autoriza `git push`, alteração do banco legado, produção ou migração automática de dados.
