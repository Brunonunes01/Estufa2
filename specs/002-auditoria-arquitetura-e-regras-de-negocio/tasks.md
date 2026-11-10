---
description: "Task list for architecture and business-rule audit"
---

# Tasks: Auditoria de Arquitetura e Regras de Negócio

**Input**: Design documents from [specs/002-auditoria-arquitetura-e-regras-de-negocio/](.)

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Incluídos como validações documentais e de rastreabilidade, conforme os critérios
de sucesso. Não há implementação de código nesta iniciativa.

**Organization**: Tasks are grouped by user story to keep the audit independently verifiable.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar os artefatos aprovados e preparar a execução segura da auditoria.

- [X] T001 Confirmar o escopo e as decisões de [spec.md](./spec.md) antes da auditoria
- [X] T002 [P] Verificar a conformidade da iniciativa com [.specify/memory/constitution.md](../../.specify/memory/constitution.md)
- [X] T003 [P] Confirmar as fronteiras de análise de [plan.md](./plan.md) e os artefatos disponíveis
- [X] T004 [P] Registrar no [quickstart.md](./quickstart.md) que não serão acessados ou alterados banco, produção ou migrations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir o método, o vocabulário e os contratos que sustentam todas as histórias.

**CRITICAL**: Nenhum achado pode ser priorizado antes desta fase.

- [X] T005 Definir o escopo operacional e os critérios de inclusão em [spec.md](./spec.md)
- [X] T006 [P] Validar as entidades e regras de classificação em [data-model.md](./data-model.md)
- [X] T007 [P] Validar a estrutura obrigatória do relatório em [contracts/audit-report.md](./contracts/audit-report.md)
- [X] T008 [P] Validar estados e condições do gate em [contracts/audit-approval-gate.md](./contracts/audit-approval-gate.md)
- [X] T009 Definir o formato de evidência e rastreabilidade no [quickstart.md](./quickstart.md)
- [X] T010 Confirmar decisões, alternativas e limites no [research.md](./research.md)

**Checkpoint**: O método de auditoria, o modelo dos achados, o relatório e o gate estão
definidos sem abrir autorização para implementação.

---

## Phase 3: User Story 1 - Identificar concentração de regras de negócio (Priority: P1) 🎯 MVP

**Goal**: Produzir o inventário de módulos, responsabilidades e dependências dos fluxos de
estufas e dos componentes compartilhados relevantes.

**Independent Test**: Um revisor consegue verificar quais áreas foram avaliadas, quais
responsabilidades foram encontradas e quais módulos concentram regras.

### Tests for User Story 1

- [X] T011 [P] [US1] Validar o inventário de fluxos em [audit-report.md](./audit-report.md) contra [spec.md](./spec.md)
- [X] T012 [P] [US1] Validar a cobertura dos diretórios avaliados em [quickstart.md](./quickstart.md)

### Audit Activities for User Story 1

- [X] T013 [P] [US1] Inventariar contextos, hooks e configurações relevantes em [src/contexts/](../../src/contexts/) e [src/hooks/](../../src/hooks/)
- [X] T014 [P] [US1] Inventariar navegação e superfícies operacionais em [src/navigation/](../../src/navigation/) e [src/screens/](../../src/screens/)
- [X] T015 [P] [US1] Inventariar serviços de domínio, persistência, segurança e offline em [src/services/](../../src/services/)
- [X] T016 [P] [US1] Inventariar contratos de domínio e persistência em [src/types/](../../src/types/)
- [X] T017 [P] [US1] Inventariar evidências existentes em [tests/](../../tests/)
- [X] T018 [P] [US1] Inventariar o histórico de persistência em [supabase/migrations/](../../supabase/migrations/) sem alterar seus arquivos
- [X] T019 [US1] Classificar responsabilidades, concentração de regras e acoplamento no inventário de [audit-report.md](./audit-report.md)
- [X] T020 [US1] Mapear dependências entre telas, serviços, persistência, autenticação e sincronização em [audit-report.md](./audit-report.md)
- [X] T021 [US1] Registrar módulos avaliados sem risco prioritário e suas justificativas em [audit-report.md](./audit-report.md)

**Checkpoint**: O relatório contém inventário verificável e mapa inicial de dependências.

---

## Phase 4: User Story 2 - Mapear contratos e regras preservadas (Priority: P1)

**Goal**: Documentar contratos de estufas, financeiro, autenticação, multi-tenant, offline,
sincronização e compatibilidade histórica.

**Independent Test**: Um revisor consegue relacionar cada contrato crítico aos seus
consumidores, evidências e lacunas.

### Tests for User Story 2

- [X] T022 [P] [US2] Validar contratos de segurança e tenant contra [contracts/audit-report.md](./contracts/audit-report.md)
- [X] T023 [P] [US2] Validar contratos de dados históricos e persistência contra [data-model.md](./data-model.md)

### Audit Activities for User Story 2

- [X] T024 [P] [US2] Catalogar regras de plantios, colheitas e operações de estufa em [audit-report.md](./audit-report.md)
- [X] T025 [P] [US2] Catalogar regras de insumos, aplicações e manejos em [audit-report.md](./audit-report.md)
- [X] T026 [P] [US2] Catalogar regras de vendas, recebimentos, despesas e financeiro em [audit-report.md](./audit-report.md)
- [X] T027 [P] [US2] Catalogar regras de clientes, fornecedores e relatórios em [audit-report.md](./audit-report.md)
- [X] T028 [P] [US2] Mapear autenticação, autorização e isolamento multi-tenant em [audit-report.md](./audit-report.md)
- [X] T029 [P] [US2] Mapear filas, armazenamento local, sincronização e conflitos offline em [audit-report.md](./audit-report.md)
- [X] T030 [P] [US2] Separar contratos atuais, comportamentos legados e lacunas de evidência em [audit-report.md](./audit-report.md)
- [X] T031 [US2] Registrar dependências históricas de campo, talhão e hidroponia relevantes para compatibilidade em [audit-report.md](./audit-report.md)

**Checkpoint**: Os contratos preservados e as regras relevantes estão catalogados sem
autorizar remoção ou alteração de dados históricos.

---

## Phase 5: User Story 3 - Priorizar melhorias incrementais (Priority: P1)

**Goal**: Classificar problemas e propor limites de responsabilidade para futuras mudanças
sem executar refatorações.

**Independent Test**: Cada achado prioritário possui evidência, impacto, dependências,
risco de regressão e critério de validação.

### Tests for User Story 3

- [X] T032 [P] [US3] Verificar a matriz de riscos de [audit-report.md](./audit-report.md) contra os critérios de [research.md](./research.md)
- [X] T033 [P] [US3] Verificar que cada recomendação aponta para especificação futura em [audit-report.md](./audit-report.md)

### Audit Activities for User Story 3

- [X] T034 [P] [US3] Identificar regras duplicadas, conflitantes ou implícitas em [audit-report.md](./audit-report.md)
- [X] T035 [P] [US3] Classificar achados por impacto, integridade, segurança, acoplamento, dependências e reversibilidade em [audit-report.md](./audit-report.md)
- [X] T036 [P] [US3] Propor limites de responsabilidade para módulos concentradores em [audit-report.md](./audit-report.md)
- [X] T037 [P] [US3] Registrar lacunas de testes e evidências necessárias em [audit-report.md](./audit-report.md)
- [X] T038 [US3] Definir a ordem de melhorias incrementais e suas dependências em [audit-report.md](./audit-report.md)
- [X] T039 [US3] Marcar explicitamente como fora do escopo as melhorias sem requisito aprovado em [audit-report.md](./audit-report.md)

**Checkpoint**: Existe uma matriz priorizada de melhorias candidatas, sem código ou mudança
de comportamento executada.

---

## Phase 6: User Story 4 - Definir limites para o novo banco (Priority: P2)

**Goal**: Consolidar contratos e decisões que devem orientar uma futura especificação do
novo banco, mantendo-a bloqueada até a aprovação da auditoria.

**Independent Test**: O revisor consegue identificar os contratos do novo banco, decisões
pendentes e condições do gate sem consultar conhecimento informal.

### Tests for User Story 4

- [X] T040 [P] [US4] Validar os contratos de persistência futura contra [contracts/audit-report.md](./contracts/audit-report.md)
- [X] T041 [P] [US4] Validar as condições de bloqueio e aprovação em [contracts/audit-approval-gate.md](./contracts/audit-approval-gate.md)

### Audit Activities for User Story 4

- [X] T042 [P] [US4] Mapear entidades, invariantes e dependências que o novo banco deverá atender em [audit-report.md](./audit-report.md)
- [X] T043 [P] [US4] Classificar dados legados por preservação, migração futura, arquivamento ou decisão pendente em [audit-report.md](./audit-report.md)
- [X] T044 [P] [US4] Registrar decisões que bloqueiam a futura especificação do banco em [audit-report.md](./audit-report.md)
- [X] T045 [US4] Confirmar que nenhum schema, migration, configuração ou dado foi alterado em [quickstart.md](./quickstart.md)
- [X] T046 [US4] Preparar o parecer de prontidão ou bloqueio no [audit-report.md](./audit-report.md)
- [ ] T047 [US4] Registrar a revisão e aprovação formal do gate em [contracts/audit-approval-gate.md](./contracts/audit-approval-gate.md)

**Checkpoint**: A especificação do novo banco permanece bloqueada até o estado Aprovado.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar a entrega, validar rastreabilidade e preparar a revisão humana.

- [X] T048 [P] Consolidar o relatório final conforme [contracts/audit-report.md](./contracts/audit-report.md) em [audit-report.md](./audit-report.md)
- [X] T049 [P] Revisar links, evidências e consistência terminológica em todos os artefatos de [specs/002-auditoria-arquitetura-e-regras-de-negocio/](.)
- [X] T050 [P] Revalidar a checklist em [checklists/requirements.md](./checklists/requirements.md) contra [spec.md](./spec.md)
- [X] T051 Executar a validação documental de [quickstart.md](./quickstart.md)
- [X] T052 Confirmar no relatório que não houve alteração de código, banco, migrations, dependências ou produção em [audit-report.md](./audit-report.md)
- [X] T053 Registrar limitações, riscos remanescentes e decisões pendentes no [audit-report.md](./audit-report.md)
- [X] T054 Encerrar a iniciativa com o gate em estado Aprovado ou Bloqueado em [contracts/audit-approval-gate.md](./contracts/audit-approval-gate.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências; confirma escopo e segurança.
- **Foundational (Phase 2)**: Depende da Setup e bloqueia todas as histórias.
- **User Story 1 (Phase 3)**: Depende da Foundation; fornece inventário e dependências.
- **User Story 2 (Phase 4)**: Depende do inventário de US1 para mapear contratos.
- **User Story 3 (Phase 5)**: Depende dos contratos e módulos identificados em US1 e US2.
- **User Story 4 (Phase 6)**: Depende da matriz de riscos e contratos de US1–US3.
- **Polish (Phase 7)**: Depende das quatro histórias e prepara a aprovação formal.

### User Story Dependencies

- **US1 (P1)**: Primeiro incremento; não depende de outra história após a Foundation.
- **US2 (P1)**: Depende de US1 para vincular contratos aos módulos avaliados.
- **US3 (P1)**: Depende de US1 e US2 para priorizar riscos com evidência suficiente.
- **US4 (P2)**: Depende de US1–US3; não libera o novo banco até o gate ser aprovado.

### Within Each User Story

- Validações devem ser executadas após a documentação correspondente ser produzida.
- Inventário precede contratos; contratos precedem priorização; priorização precede limites
  para o novo banco.
- Nenhuma tarefa pode alterar código, dependência, migration, schema ou dados.
- Toda recomendação de mudança de comportamento deve apontar para uma futura especificação.

### Parallel Opportunities

- T002–T004 podem ocorrer em paralelo após T001.
- T006–T008 podem ocorrer em paralelo após T005.
- T013–T018 podem ocorrer em paralelo; T019–T021 dependem do inventário.
- T024–T031 podem ocorrer em paralelo após T021.
- T034–T037 podem ocorrer em paralelo após T030 e T031.
- T040–T045 podem ocorrer em paralelo após a matriz de riscos; T046–T047 dependem da
  consolidação.
- T048–T050 e T053 podem ocorrer em paralelo antes de T051–T054.

## Parallel Example: User Story 1

```text
Task: T013 [US1] Inventariar contexts e hooks em src/contexts/ e src/hooks/
Task: T014 [US1] Inventariar navegação e telas em src/navigation/ e src/screens/
Task: T015 [US1] Inventariar serviços em src/services/
Task: T016 [US1] Inventariar tipos em src/types/
Task: T017 [US1] Inventariar evidências em tests/
Task: T018 [US1] Inventariar migrations sem alterá-las em supabase/migrations/
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup e Foundation.
2. Executar US1 para produzir inventário e mapa de dependências.
3. Parar e revisar a cobertura da auditoria antes de catalogar contratos.

### Incremental Delivery

1. Adicionar US2 para documentar contratos preservados.
2. Adicionar US3 para classificar riscos e melhorias candidatas.
3. Adicionar US4 para definir os limites do futuro banco e o gate.
4. Executar Polish e submeter o relatório para aprovação formal.

### Safety Rules

- Não executar `git add`, `commit`, `push`, `reset`, `rebase` ou operações destrutivas.
- Não criar ou alterar banco, schema, migration, dependência ou configuração de produção.
- Não implementar refatorações durante a auditoria.
- Não iniciar a especificação do novo banco antes do gate Aprovado.
