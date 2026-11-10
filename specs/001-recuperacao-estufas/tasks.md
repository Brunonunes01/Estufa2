---
description: "Task list for Estufa2 greenhouse-only recovery"
---

# Tasks: Recuperação e Simplificação do Estufa2

**Input**: Design documents from /specs/001-recuperacao-estufas/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: Incluídos porque a especificação exige evidências de regressão para alterações de
comportamento, segurança multi-tenant, offline e integridade dos dados.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar o escopo técnico e preparar a execução segura sem alterar produção.

- [X] T001 Confirmar os artefatos aprovados da feature em specs/001-recuperacao-estufas/plan.md, specs/001-recuperacao-estufas/spec.md, specs/001-recuperacao-estufas/data-model.md e specs/001-recuperacao-estufas/contracts/navigation-and-data-boundary.md
- [X] T002 [P] Registrar o baseline de typecheck, lint e testes usando package.json e os comandos npm run typecheck, npm run lint e npm test, sem alterar dependências
- [X] T003 [P] Mapear referências ativas de campo, talhão e hidroponia em src/navigation/, src/screens/, src/services/, src/types/ e tests/ para comparar com os limites de specs/001-recuperacao-estufas/contracts/navigation-and-data-boundary.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estabelecer o limite de domínio e os testes-base antes das histórias de usuário.

**CRITICAL**: Nenhuma alteração de fluxo deve começar antes desta fase.

- [X] T004 Definir o único modo produtivo ativo como estufa convencional em src/contexts/appSettingsHelpers.ts, preservando dados legados e sem remover enums ou colunas persistidas
- [X] T005 [P] Criar testes do limite produtivo em tests/productionScope.test.ts cobrindo ausência de campo, talhão e hidroponia no modo ativo
- [X] T006 [P] Estender a cobertura de isolamento em tests/tenantGuard.test.ts e tests/authTenantIntegration.test.ts para confirmar que a simplificação não altera o tenant autorizado
- [X] T007 [P] Estender a cobertura offline em tests/offlineStorage.test.ts, tests/offlineUtils.test.ts e tests/syncServiceIntegration.test.ts para confirmar retenção e reconciliação de operações de estufa
- [X] T008 Documentar em src/types/domain.ts e src/types/supabase.ts quais campos legados permanecem somente para compatibilidade histórica e quais relações não podem ser exigidas por fluxos novos

**Checkpoint**: O modo ativo, os limites de dados, tenant, offline e critérios de regressão estão definidos; nenhuma migração de banco é necessária.

---

## Phase 3: User Story 1 - Operar exclusivamente a gestão de estufas (Priority: P1) 🎯 MVP

**Goal**: Remover da experiência ativa todas as entradas de campo, talhões e hidroponia,
mantendo a entrada operacional em estufas convencionais.

**Independent Test**: Usuário autenticado percorre tabs, ações rápidas e rotas diretas e
não encontra campo, talhão, hidroponia ou venda de campo; a entrada de operação abre
estufas.

### Tests for User Story 1

- [X] T009 [P] [US1] Criar testes de contrato de navegação em tests/productionScopeNavigation.test.ts para tabs, ações rápidas, rotas proibidas e entrada de estufas
- [X] T010 [P] [US1] Adicionar cenários de bloqueio seguro para rotas legadas em tests/productionScopeNavigation.test.ts sem expor dados históricos

### Implementation for User Story 1

- [X] T011 [US1] Remover o modo de operação campo, os títulos, ícones e ações de talhão de src/navigation/rootNavigatorConfig.ts
- [X] T012 [US1] Tornar EstufasListScreen a entrada fixa da tab de operação e eliminar a seleção condicional de CampoHubScreen em src/navigation/MainTabsNavigator.tsx
- [X] T013 [US1] Remover os registros de rota TalhoesList, TalhaoForm e CampoVendaForm de src/navigation/AppStackNavigator.tsx sem remover as estruturas persistidas
- [X] T014 [US1] Remover de src/navigation/types.ts os caminhos ativos de campo, talhão, origem campo e layout hidroponia, preservando somente tipos legados necessários à leitura/sincronização histórica
- [X] T015 [US1] Remover opções de campo, talhão e hidroponia das ações e atalhos de src/screens/Dashboard/DashboardScreen.tsx e src/navigation/rootNavigatorConfig.ts
- [X] T016 [US1] Remover imports, componentes e estados exclusivos de Campo de src/screens/Campo/ e de qualquer tela que deixe de ser alcançável, somente após confirmar ausência de referências
- [X] T017 [US1] Executar os testes de tests/productionScope.test.ts e tests/productionScopeNavigation.test.ts e confirmar o critério SC-001

**Checkpoint**: Navegação, telas e ações ativas são exclusivamente de estufa ou compartilhadas.

---

## Phase 4: User Story 2 - Continuar o ciclo operacional da estufa (Priority: P1)

**Goal**: Preservar cadastro e operação de estufas, plantios e colheitas sem seleção de
campo, talhão ou hidroponia.

**Independent Test**: Usuário cadastra/consulta estufa, cria plantio e registra colheita sem
encontrar dependências de domínio removido.

### Tests for User Story 2

- [X] T018 [P] [US2] Estender tests/estufaHealth.test.ts para validar o fluxo de estufa convencional sem modo campo ou hidroponia
- [X] T019 [P] [US2] Criar testes de regressão de plantio e colheita em tests/greenhouseCycle.test.ts para estufa, plantio, colheita, tenant e relações preservadas

### Implementation for User Story 2

- [X] T020 [US2] Remover seleção, validação e parâmetros obrigatórios de talhão de src/screens/Plantios/PlantioFormScreen.tsx, mantendo estufa obrigatória para novos plantios ativos
- [X] T021 [US2] Ajustar src/services/plantioService.ts para gravar e consultar plantios de estufa sem criar associações artificiais com talhão ou hidroponia
- [X] T022 [US2] Ajustar src/screens/Plantios/PlantioDetailScreen.tsx para exibir somente relações operacionais de estufa e tratar registros legados sem tela de campo
- [X] T023 [US2] Ajustar src/screens/Colheitas/ColheitaFormScreen.tsx e src/services/colheitaService.ts para remover ramificações de venda/origem de campo sem quebrar colheitas de estufa
- [X] T024 [US2] Ajustar src/screens/Estufas/EstufasListScreen.tsx e src/screens/Estufas/EstufaFormScreen.tsx para não encaminhar talhaoId nem oferecer conteúdo exclusivo de hidroponia
- [X] T025 [US2] Remover ou isolar consultas de talhão usadas somente pelos fluxos ativos em src/hooks/queries/useTalhoesListData.ts e src/services/talhaoService.ts, preservando leitura histórica fora da operação
- [X] T026 [US2] Executar tests/greenhouseCycle.test.ts, tests/estufaHealth.test.ts e testes existentes de plantio/colheita para confirmar SC-002 e ausência de regressão

**Checkpoint**: Cadastro, plantio e colheita de estufa funcionam independentemente dos módulos removidos.

---

## Phase 5: User Story 3 - Usar os módulos compartilhados da operação (Priority: P1)

**Goal**: Manter insumos, aplicações, manejos, vendas, recebimentos, despesas, clientes,
fornecedores, financeiro e relatórios operacionais de estufa sem dependências exclusivas.

**Independent Test**: Usuário executa um fluxo de cada grupo compartilhado com contexto de
estufa e confirma consistência operacional e financeira.

### Tests for User Story 3

- [X] T027 [P] [US3] Estender tests/vendasListUtils.test.ts e tests/vendaUnitSelection.test.ts para cobrir vendas de estufa sem talhão ou origem hidroponia
- [X] T028 [P] [US3] Estender tests/financialReportHelpers.test.ts, tests/salesAccountingReportHelpers.test.ts e tests/rentabilidadeService.test.ts para relatórios exclusivamente de estufa
- [X] T029 [P] [US3] Criar testes de contrato compartilhado em tests/sharedGreenhouseModules.test.ts para insumos, aplicações, manejos, clientes, fornecedores, despesas e financeiro

### Implementation for User Story 3

- [X] T030 [US3] Remover ramificações de campo, talhão e CampoVendaForm de src/screens/Vendas/VendasListScreen.tsx e manter a venda de estufa operacional
- [X] T031 [US3] Ajustar src/services/vendaService.ts para preservar vínculos de estufa e tratar campos legados sem exigir talhão ou lote hidroponia
- [X] T032 [US3] Ajustar src/screens/Financeiro/ContasReceberScreen.tsx, src/screens/Financeiro/RelatoriosScreen.tsx e src/screens/Financeiro/RelatorioOperacionalScreen.tsx para não oferecer origem ou tela de campo/hidroponia
- [X] T033 [US3] Ajustar src/services/caixaServiceHelpers.ts e telas src/screens/Caixa/ para manter origem financeira de estufa e não exigir entidades removidas
- [X] T034 [US3] Revisar src/screens/Aplicacoes/, src/screens/Manejos/ e src/screens/Despesas/ para retirar seletores e validações exclusivas de campo/talhão/hidroponia
- [X] T035 [US3] Remover conteúdo e estados exclusivos de hidroponia de src/screens/Estufas/EstufaFormScreen.tsx sem alterar atributos convencionais da estufa
- [X] T036 [US3] Executar tests/sharedGreenhouseModules.test.ts, tests/vendasListUtils.test.ts e tests/financialReportHelpers.test.ts e confirmar SC-003, preservação financeira e operação sem dependências exclusivas

**Checkpoint**: Os módulos compartilhados necessários à estufa continuam concluíveis e consistentes.

---

## Phase 6: User Story 4 - Operar com segurança e conectividade intermitente (Priority: P1)

**Goal**: Preservar autenticação, permissões, isolamento multi-tenant, armazenamento offline
e sincronização durante a remoção dos módulos.

**Independent Test**: Dois tenants e perfis distintos executam fluxos online/offline e
confirmam isolamento, reconciliação única e ausência de perda silenciosa.

### Tests for User Story 4

- [X] T037 [P] [US4] Estender tests/accessControl.test.ts, tests/tenantGuard.test.ts e tests/authTenantIntegration.test.ts para rotas removidas e fluxos preservados
- [X] T038 [P] [US4] Estender tests/offlinePayloadCodec.test.ts, tests/offlineStorage.test.ts e tests/offlineUtils.test.ts para operações de estufa após remoção dos módulos
- [X] T039 [P] [US4] Estender tests/syncServiceHelpers.test.ts e tests/syncServiceIntegration.test.ts para não descartar operações históricas nem duplicar operações de estufa
- [X] T040 [P] [US4] Estender tests/productionOriginGuard.test.ts para rejeitar origem campo/hidroponia em novas escritas sem reclassificar dados legados

### Implementation for User Story 4

- [X] T041 [US4] Ajustar src/lib/accessControl.ts e src/services/tenantGuard.ts para aplicar permissões e tenant às rotas e operações de estufa sem liberar caminhos removidos
- [X] T042 [US4] Revisar src/services/offline/offlineWrite.ts e src/services/offline/offlineStorageHandlers.ts para manter operações autorizadas de estufa e não descartar payloads legados silenciosamente
- [X] T043 [US4] Revisar src/services/offline/syncService.ts, src/services/offline/syncServiceCore.ts e src/services/offline/syncServiceHelpers.ts para reconciliação tenant-scoped e sem duplicidade
- [X] T044 [US4] Ajustar src/services/productionOriginGuard.ts para impedir novas origens exclusivas removidas e preservar a leitura de registros históricos
- [X] T045 [US4] Executar tests/accessControl.test.ts, tests/tenantGuard.test.ts, tests/productionOriginGuard.test.ts e tests/syncServiceIntegration.test.ts e confirmar SC-004, SC-005 e FR-009/FR-010

**Checkpoint**: Segurança, isolamento e offline permanecem funcionais nos fluxos preservados.

---

## Phase 7: User Story 5 - Recuperar estabilidade sem alterar o escopo (Priority: P2)

**Goal**: Identificar regressões e problemas de estabilidade relacionados à retirada sem introduzir refatorações fora do escopo.

**Independent Test**: A suíte e o quickstart reproduzem fluxos preservados, rotas removidas,
dados históricos retidos e riscos registrados.

### Tests for User Story 5

- [X] T046 [P] [US5] Criar testes de regressão de superfície em tests/removedProductionScope.test.ts para confirmar ausência de campo, talhão e hidroponia
- [X] T047 [P] [US5] Atualizar tests/fieldCycleDeletionMigration.test.ts e tests/talhaoDeletionMigration.test.ts para garantir que esta iniciativa não executa exclusão histórica
- [X] T048 [P] [US5] Adicionar cenários de diagnóstico e evidência em tests/productionScope.test.ts para cada falha reproduzível encontrada durante a validação

### Implementation for User Story 5

- [X] T049 [US5] Revisar src/services/productionOriginGuard.ts, src/services/estufaService.ts e src/services/plantioService.ts para registrar erros de estabilidade sem ocultar falhas
- [X] T050 [US5] Consolidar a matriz de evidências dos problemas encontrados em specs/001-recuperacao-estufas/quickstart.md sem adicionar tarefas fora do escopo
- [X] T051 [US5] Executar tests/removedProductionScope.test.ts, tests/fieldCycleDeletionMigration.test.ts e tests/talhaoDeletionMigration.test.ts e confirmar SC-006, SC-007 e SC-008

**Checkpoint**: Problemas reproduzíveis estão classificados e os fluxos preservados têm evidência de regressão.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fechar referências órfãs e executar a validação final sem ampliar o escopo.

- [X] T052 [P] Remover imports, tipos e helpers órfãos de src/navigation/, src/screens/, src/services/ e src/types/ após a conclusão das histórias, sem remover campos históricos necessários
- [X] T053 [P] Atualizar a documentação de fronteira em specs/001-recuperacao-estufas/contracts/navigation-and-data-boundary.md se a implementação revelar uma dependência compartilhada adicional
- [X] T054 Executar os comandos npm run typecheck e npm run lint definidos em package.json após a limpeza de referências
- [X] T055 Executar npm run test e npm run validate conforme specs/001-recuperacao-estufas/quickstart.md
- [ ] T056 Realizar em specs/001-recuperacao-estufas/quickstart.md a validação manual Android, iOS e web dos cenários sem acessar banco de produção
- [X] T057 Registrar evidências finais de SC-001 a SC-008 em specs/001-recuperacao-estufas/quickstart.md e bloquear qualquer mudança que não tenha requisito aprovado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências; prepara baseline e inventário.
- **Foundational (Phase 2)**: Depende da Setup e bloqueia todas as histórias.
- **User Stories (Phases 3–7)**: Dependem da Foundation.
- **Polish (Phase 8)**: Depende das histórias escolhidas para entrega.

### User Story Dependencies

- **US1 (P1)**: Depende de Phase 2; é o MVP e define a superfície removida.
- **US2 (P1)**: Depende de US1 para remover parâmetros e rotas sem quebrar a entrada de estufas.
- **US3 (P1)**: Depende de US1 e US2 para desacoplar módulos compartilhados dos fluxos retirados.
- **US4 (P1)**: Depende de US1–US3 para validar segurança e offline sobre o conjunto final de rotas.
- **US5 (P2)**: Depende de US1–US4 para diagnosticar a superfície completa e fechar evidências.

### Within Each User Story

- Testes específicos devem ser criados ou atualizados antes das mudanças correspondentes.
- Mudanças de contexto e tipos precedem telas e serviços que os consomem.
- Serviços precedem integração de telas e fluxos.
- Cada checkpoint deve ser validado antes da próxima história.

### Parallel Opportunities

- T002 e T003 podem ocorrer em paralelo.
- T005, T006, T007 e T008 podem ocorrer em paralelo após T004.
- Em US1, T009 e T010 podem ocorrer em paralelo; T011–T015 podem ser divididas por arquivo após os testes.
- Em US2, T018 e T019 podem ocorrer em paralelo; T020–T025 podem ser divididas por tela/serviço.
- Em US3, T027–T029 podem ocorrer em paralelo; T030–T035 podem ser divididas por módulo.
- Em US4, T037–T040 podem ocorrer em paralelo; T041–T044 podem ser divididas por fronteira.
- Em US5, T046–T048 podem ocorrer em paralelo.
- T052 e T053 podem ocorrer em paralelo após todas as histórias; T054–T056 devem ocorrer depois da limpeza.

---

## Parallel Example: User Story 1

~~~text
Task: T009 [US1] Contract tests in tests/productionScopeNavigation.test.ts
Task: T010 [US1] Safe blocking scenarios in tests/productionScopeNavigation.test.ts

Task: T011 [US1] Simplify src/navigation/rootNavigatorConfig.ts
Task: T013 [US1] Remove field routes from src/navigation/AppStackNavigator.tsx
Task: T015 [US1] Remove field quick actions from src/screens/Dashboard/DashboardScreen.tsx
~~~

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate navigation, route blocking and greenhouse entry independently.
5. Do not proceed to shared-module changes until the MVP regression evidence is reviewed.

### Incremental Delivery

1. Add US1 to establish greenhouse-only navigation.
2. Add US2 to preserve greenhouse plantings and harvests.
3. Add US3 to preserve shared operational and financial modules.
4. Add US4 to prove tenant, permission and offline invariants.
5. Add US5 and Polish for stability evidence and cross-platform validation.

### Safety Rules

- Não executar git add, commit, push, reset, rebase ou operação destrutiva.
- Não alterar banco de produção nem criar migração destrutiva.
- Não remover campos históricos sem uma especificação posterior e aprovação explícita.
- Parar e registrar uma decisão caso uma dependência compartilhada não possa ser separada
  sem alterar o comportamento preservado.

## Notes

- Toda tarefa segue o formato de checklist com ID, marcador de paralelismo quando aplicável,
  etiqueta de história e caminho concreto.
- A etiqueta [Story] mapeia cada tarefa à história correspondente.
- As tarefas de teste existem porque a especificação exige evidências de regressão.
- O plano não inclui commit automático; a revisão humana permanece necessária antes da
  implementação.

