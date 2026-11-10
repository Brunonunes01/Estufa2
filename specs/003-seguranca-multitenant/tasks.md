---
description: "Task list for tenant authorization and offline security"
---

# Tasks: Segurança e Isolamento Multi-Tenant

**Input**: Design documents from [specs/003-seguranca-multitenant/](.)

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Incluídos porque a especificação exige evidências de isolamento, permissões,
offline e reconciliação sem duplicidade.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar o baseline e os limites de segurança antes de alterar operações.

- [X] T001 Confirmar os contratos de [spec.md](./spec.md), [data-model.md](./data-model.md) e [contracts/tenant-authorization-boundary.md](./contracts/tenant-authorization-boundary.md) sem alterar schema ou produção
- [X] T002 [P] Registrar o baseline de `npm run typecheck`, `npm run lint` e `npm test` no [quickstart.md](./quickstart.md)
- [X] T003 [P] Inventariar os consumidores de `useAuth`, `useTenantId`, `assertTenantId`, `runOfflineWrite` e `flushOfflineQueue` em `src/` e registrar os pontos de integração em [research.md](./research.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir a fronteira reutilizável de tenant e autorização antes dos fluxos de usuário.

**CRITICAL**: Nenhuma alteração de fluxo deve começar antes desta fase.

- [X] T004 [P] Criar testes unitários da matriz `read`, `write`, `delete` e `manageSharing` em [tests/accessControl.test.ts](../../tests/accessControl.test.ts)
- [X] T005 [P] Criar testes de normalização, tenant divergente, tenant ausente e operação protegida em [tests/tenantGuard.test.ts](../../tests/tenantGuard.test.ts)
- [X] T006 [P] Criar cenários-base de sessão, tenant selecionado e membro indisponível em [tests/authTenantIntegration.test.ts](../../tests/authTenantIntegration.test.ts)
- [X] T007 Definir no [src/lib/accessControl.ts](../../src/lib/accessControl.ts) a matriz única de operações e erros seguros, preservando os papéis e flags existentes
- [X] T008 Integrar no [src/services/tenantGuard.ts](../../src/services/tenantGuard.ts) a validação conjunta de tenant selecionado, tenant solicitado e permissão exigida

**Checkpoint**: A fronteira comum rejeita tenant inválido/divergente e permissão insuficiente sem consultar ou alterar dados.

---

## Phase 3: User Story 1 - Operar somente com o tenant autorizado (Priority: P1) 🎯 MVP

**Goal**: Garantir que leituras e escritas dos fluxos ativos de estufa permaneçam no tenant autorizado.

**Independent Test**: Um usuário com acesso ao tenant A não consegue consultar, criar, editar ou remover dados usando o tenant B, tenant vazio ou tenant indisponível.

### Tests for User Story 1

- [X] T009 [P] [US1] Adicionar testes de isolamento para estufas, plantios, colheitas e módulos compartilhados em [tests/tenantGuard.test.ts](../../tests/tenantGuard.test.ts)
- [X] T010 [P] [US1] Adicionar teste de seleção sem fallback cruzado em [tests/authTenantIntegration.test.ts](../../tests/authTenantIntegration.test.ts)
- [X] T011 [P] [US1] Criar teste de contrato para confirmar que rotas removidas da iniciativa 001 continuam ausentes em [tests/productionScopeNavigation.test.ts](../../tests/productionScopeNavigation.test.ts)

### Implementation for User Story 1

- [X] T012 [US1] Reforçar a validação do tenant selecionado e dos tenants disponíveis em [src/contexts/AuthContext.tsx](../../src/contexts/AuthContext.tsx) sem alterar o bootstrap de autenticação válido
- [X] T013 [US1] Fazer [src/hooks/useTenantId.ts](../../src/hooks/useTenantId.ts) rejeitar escopo vazio ou indisponível sem fallback durante operações protegidas
- [X] T014 [US1] Aplicar a guarda conjunta de tenant às leituras e escritas centrais de estufa em [src/services/estufaService.ts](../../src/services/estufaService.ts), [src/services/plantioService.ts](../../src/services/plantioService.ts) e [src/services/colheitaService.ts](../../src/services/colheitaService.ts)
- [X] T015 [US1] Aplicar a mesma guarda aos módulos compartilhados de venda, despesa, insumo, aplicação, manejo, cliente e fornecedor em [src/services/](../../src/services/)
- [X] T016 [US1] Confirmar em [src/navigation/](../../src/navigation/) que a integração de autorização não reintroduz Campo, Talhão, Hidroponia ou `CampoVendaForm`

**Checkpoint**: A User Story 1 funciona independentemente e não permite operação ativa fora do tenant autorizado.

---

## Phase 4: User Story 2 - Respeitar permissões em cada operação (Priority: P1)

**Goal**: Aplicar leitura, escrita, exclusão e compartilhamento de forma consistente para cada perfil.

**Independent Test**: Proprietário, gerente, operador e usuário somente leitura executam a matriz de ações e recebem exatamente as permissões previstas.

### Tests for User Story 2

- [X] T017 [P] [US2] Expandir a matriz de perfis e permissões em [tests/accessControl.test.ts](../../tests/accessControl.test.ts)
- [X] T018 [P] [US2] Criar testes de bloqueio de escrita e exclusão nos fluxos preservados em [tests/accessControlOperations.test.ts](../../tests/accessControlOperations.test.ts)
- [X] T019 [P] [US2] Criar testes de bloqueio de convite, remoção e alteração de membro em [tests/shareServiceIntegration.test.ts](../../tests/shareServiceIntegration.test.ts)

### Implementation for User Story 2

- [X] T020 [US2] Integrar a permissão de leitura/escrita aos guards de formulário e ações rápidas em [src/hooks/useWriteGuard.ts](../../src/hooks/useWriteGuard.ts), [src/navigation/MainTabsNavigator.tsx](../../src/navigation/MainTabsNavigator.tsx) e telas preservadas
- [X] T021 [US2] Aplicar `canDelete` às operações destrutivas de estufa, plantio, colheita, venda e despesa em [src/services/](../../src/services/) sem alterar regras de proprietário existentes
- [X] T022 [US2] Aplicar `canManageSharing` às operações de convite, remoção e alteração de permissões em [src/services/shareServiceCore.ts](../../src/services/shareServiceCore.ts) e [src/screens/Auth/ShareAccountScreen.tsx](../../src/screens/Auth/ShareAccountScreen.tsx)
- [X] T023 [US2] Padronizar mensagens de bloqueio sem expor tenant, registros ou permissões de terceiros em [src/hooks/useWriteGuard.ts](../../src/hooks/useWriteGuard.ts) e [src/services/](../../src/services/)

**Checkpoint**: Cada perfil conclui somente as operações autorizadas, tanto pela UI quanto pela fronteira de serviço.

---

## Phase 5: User Story 3 - Manter segurança durante operação offline (Priority: P2)

**Goal**: Preservar tenant, usuário, autorização e idempotência durante o enfileiramento e a reconciliação offline.

**Independent Test**: Uma operação válida do tenant A é sincronizada uma vez; operações divergentes, revogadas ou de sessão inválida não são aplicadas.

### Tests for User Story 3

- [X] T024 [P] [US3] Criar testes de metadados de tenant/usuário e rejeição de payload inválido em [tests/offlineStorage.test.ts](../../tests/offlineStorage.test.ts)
- [X] T025 [P] [US3] Criar testes de revalidação de permissão durante o flush em [tests/syncServiceIntegration.test.ts](../../tests/syncServiceIntegration.test.ts)
- [X] T026 [P] [US3] Criar testes de idempotência e repetição de sincronização em [tests/syncServiceIntegration.test.ts](../../tests/syncServiceIntegration.test.ts)
- [X] T027 [P] [US3] Adicionar teste do ciclo offline autorizado de estufa em [tests/greenhouseCycle.test.ts](../../tests/greenhouseCycle.test.ts)

### Implementation for User Story 3

- [X] T028 [US3] Preservar usuário, tenant e operação no payload enfileirado em [src/services/offline/offlineWrite.ts](../../src/services/offline/offlineWrite.ts)
- [X] T029 [US3] Revalidar usuário, tenant selecionado e permissão antes de aplicar cada item em [src/services/offline/offlineQueueStorage.ts](../../src/services/offline/offlineQueueStorage.ts) e [src/services/offline/offlineStorageHandlers.ts](../../src/services/offline/offlineStorageHandlers.ts)
- [X] T030 [US3] Diferenciar rejeição de autorização de falha transitória e manter erro identificável em [src/services/offline/syncServiceCore.ts](../../src/services/offline/syncServiceCore.ts) e [src/services/offline/syncService.ts](../../src/services/offline/syncService.ts)
- [X] T031 [US3] Garantir aplicação única de operações offline válidas sem alterar o contrato de retry em [src/services/offline/](../../src/services/offline/)

**Checkpoint**: Offline não funciona como bypass; itens válidos sincronizam uma vez e inválidos não são aplicados silenciosamente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validar regressão, documentação e limites da mudança.

- [X] T032 [P] Atualizar [specs/003-seguranca-multitenant/quickstart.md](./quickstart.md) com resultados da matriz de autorização e do ciclo offline
- [X] T033 [P] Atualizar [specs/003-seguranca-multitenant/contracts/tenant-authorization-boundary.md](./contracts/tenant-authorization-boundary.md) se a implementação revelar dependência adicional
- [X] T034 Executar `npm run typecheck` e `npm run lint` após a implementação
- [X] T035 Executar `npm test` e `npm run validate`, registrando contagem e falhas no [quickstart.md](./quickstart.md)
- [X] T036 Confirmar que nenhuma migration, schema, dependência, produção ou dado histórico foi alterado em [specs/003-seguranca-multitenant/quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências; prepara baseline e inventário.
- **Foundational (Phase 2)**: Depende da Setup e bloqueia todas as histórias.
- **US1 (Phase 3)**: Depende da Foundation e é o MVP.
- **US2 (Phase 4)**: Depende da Foundation; pode reutilizar a guarda de US1.
- **US3 (Phase 5)**: Depende da Foundation e deve integrar as guardas aprovadas em US1/US2.
- **Polish (Phase 6)**: Depende das histórias escolhidas para entrega.

### User Story Dependencies

- **US1 (P1)**: Começa após a Foundation; define o escopo de tenant dos fluxos ativos.
- **US2 (P1)**: Começa após a Foundation; usa a fronteira de tenant e deve manter teste independente.
- **US3 (P2)**: Começa após a Foundation, mas sua integração final depende da matriz de autorização de US1/US2.

### Within Each User Story

- Testes devem ser escritos antes da implementação correspondente.
- Guardas e contratos comuns precedem a integração em serviços e telas.
- Serviços precedem a integração de UI e offline.
- Cada checkpoint deve ser validado antes da próxima história.

### Parallel Opportunities

- T002 e T003 podem ocorrer em paralelo.
- T004, T005 e T006 podem ocorrer em paralelo após T001.
- T009, T010 e T011 podem ocorrer em paralelo.
- T017, T018 e T019 podem ocorrer em paralelo.
- T024, T025, T026 e T027 podem ocorrer em paralelo.
- T032 e T033 podem ocorrer em paralelo após as implementações.

## Parallel Example: User Story 1

```text
Task: T009 [US1] Isolamento de operações em tests/tenantGuard.test.ts
Task: T010 [US1] Seleção sem fallback cruzado em tests/authTenantIntegration.test.ts
Task: T011 [US1] Rotas removidas em tests/productionScopeNavigation.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup e Foundation.
2. Implementar US1 com testes de tenant antes do código.
3. Parar e validar isolamento dos fluxos ativos.
4. Não iniciar offline até a guarda de tenant estar aprovada.

### Incremental Delivery

1. Foundation → contrato comum verificável.
2. US1 → isolamento de tenant nos fluxos ativos.
3. US2 → matriz de permissões por operação.
4. US3 → revalidação offline e idempotência.
5. Polish → validação completa e evidências.

### Safety Rules

- Não alterar produção, migrations, schema ou dados históricos.
- Não reintroduzir Campo, Talhão ou Hidroponia.
- Não adicionar dependências sem especificação própria.
- Parar e registrar decisão se uma operação exigir alterar o contrato de persistência.
