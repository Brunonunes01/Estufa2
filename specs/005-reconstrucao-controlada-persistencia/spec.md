# Feature Specification: Reconstrução Nova da Persistência

**Feature Branch**: `005-reconstrucao-controlada-persistencia`

**Created**: 2026-11-10

**Status**: Cancelada em 2026-11-12

**Input**: User description: "Criar um novo banco com uma baseline de migrations própria, mantendo o banco legado intacto e validando a nova persistência antes de qualquer cutover."

## Clarifications

### Session 2026-11-10

- Q: Como os usuários devem entrar no banco novo sem migração de contas antigas? → A: Haverá um novo cadastro do zero; nenhuma conta antiga será importada ou reutilizada automaticamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar uma baseline confiável (Priority: P1)

Como responsável pelo produto, quero criar o novo ambiente a partir de uma sequência versionada e revisável, para reproduzi-lo sem depender de alterações manuais ou do banco legado.

**Why this priority**: Uma baseline explícita evita um ambiente incompleto, inconsistente ou impossível de auditar.

**Independent Test**: Recriar o ambiente vazio usando somente os artefatos aprovados e confirmar a estrutura necessária aos fluxos ativos.

**Acceptance Scenarios**:

1. **Given** um ambiente vazio e uma baseline aprovada, **When** as etapas são executadas em ordem, **Then** a estrutura documentada é reproduzida.
2. **Given** uma alteração estrutural não documentada, **When** ela é proposta, **Then** é rejeitada até possuir justificativa, revisão e reversão.
3. **Given** o banco legado existente, **When** a baseline nova é criada, **Then** o legado permanece intacto e identificável.

### User Story 2 - Garantir segurança e compatibilidade (Priority: P1)

Como usuário de uma estufa, quero que o novo ambiente preserve vínculos, permissões, auditoria e estados financeiros, para operar sem exposição ou mistura de dados.

**Why this priority**: A reconstrução só é aceitável se mantiver os contratos aprovados nas specs 001–004.

**Independent Test**: Executar cenários autorizados e não autorizados com mais de um tenant e comparar os resultados com os contratos existentes, sem dados de produção.

**Acceptance Scenarios**:

1. **Given** dois tenants e permissões diferentes, **When** cada usuário opera, **Then** somente ações autorizadas no tenant correto são aceitas.
2. **Given** uma tentativa de acessar outro tenant, **When** a operação começa, **Then** ela é bloqueada sem revelar dados externos.
3. **Given** uma operação produtiva válida, **When** é registrada no novo ambiente, **Then** seus vínculos, auditoria e estado financeiro permanecem coerentes.

### User Story 3 - Validar cutover controlado (Priority: P2)

Como responsável técnico, quero validar o novo ambiente em staging antes de qualquer mudança de uso, para interromper ou reverter a adoção sem afetar o legado.

**Why this priority**: Migrations não autorizam promoção automática; a transição precisa de evidências e aprovação.

**Independent Test**: Executar validações em ambiente não produtivo, registrar resultados, simular falhas e confirmar a disponibilidade do legado.

**Acceptance Scenarios**:

1. **Given** uma baseline aplicada em ambiente não produtivo, **When** os testes são executados, **Then** resultados ficam registrados e reproduzíveis.
2. **Given** uma falha durante a validação, **When** o cutover não foi aprovado, **Then** nenhuma promoção ocorre.
3. **Given** todos os critérios aprovados, **When** o cutover é solicitado, **Then** exige aprovação explícita e rollback.

### Definitive Persistence Decision

This feature creates a completely new Supabase database from an empty starting point. It does not migrate, import, copy, transform, reconcile, or delete records from the legacy database. The legacy database remains intact, isolated, and unchanged.

The new persistence must support every active application service used by the conventional greenhouse domain, including authentication, tenant selection, permissions, greenhouse cycles, planting, harvesting, sales, receiving, finance, audit, traceability, and offline synchronization. Compatibility is required at the service contract level, without automatically reproducing legacy migrations or legacy-only structures.

### Additional Acceptance Scenarios

4. **Given** a legacy database with historical users, financial records and operational records, **When** the new database is created, **Then** none of those records are migrated, copied, transformed or deleted, and the legacy database remains unchanged.
5. **Given** an active application service, **When** its persistence contract is inventoried against the new model, **Then** its required entities, relations, constraints, functions and operations are identified before implementation.
6. **Given** a structure exclusive to field cultivation, talhão or hydroponics, **When** the new model is defined, **Then** it is excluded unless it is demonstrably shared and required by a conventional greenhouse service.
7. **Given** two tenants in the new database, **When** database-level isolation tests run for read, write, delete and sharing operations, **Then** cross-tenant access is blocked by RLS and the result is recorded.

### Edge Cases

- Uma migration é aplicada parcialmente e precisa ser interrompida com segurança.
- A estrutura legada contém campos sem equivalente aprovado no novo modelo.
- Uma permissão permite leitura, mas bloqueia escrita, exclusão ou compartilhamento.
- Credenciais ausentes ou inválidas impedem a validação remota.
- Dados históricos legados não podem ser apagados, convertidos ou reclassificados automaticamente.
- Uma falha temporária de integração não pode ser registrada como aprovação.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST possuir uma baseline versionada e ordenada para criar o novo ambiente.
- **FR-002**: Cada alteração estrutural MUST possuir justificativa, revisão e critério de reversão.
- **FR-003**: O novo ambiente MUST conter somente entidades, vínculos e regras autorizados pelas specs 001–004 e por esta spec.
- **FR-004**: O isolamento de tenant MUST bloquear leitura, escrita, exclusão e compartilhamento fora do escopo autorizado.
- **FR-005**: O novo ambiente MUST preservar permissões, auditoria, rastreabilidade, estados financeiros e vínculos produtivos.
- **FR-006**: A criação e validação MUST ocorrer em ambiente não produtivo antes de qualquer cutover.
- **FR-007**: O banco legado MUST permanecer intacto e fora de alterações incidentais.
- **FR-008**: Sem decisão formal de migração, nenhum dado legado pode ser copiado, transformado, descartado ou reclassificado.
- **FR-009**: O processo MUST registrar resultados, falhas conhecidas, pendências e evidências de rollback.
- **FR-010**: O cutover MUST exigir aprovação explícita e critérios de entrada, saída e reversão.
- **FR-011**: Credenciais ausentes ou inválidas MUST bloquear validações remotas sem expor segredos ou simular aprovação.
- **FR-012**: A baseline MUST ser reproduzível sem alterações manuais não registradas.

### Additional Functional Requirements

- **FR-013**: The new database MUST start empty and MUST NOT migrate, import, copy, transform, reconcile, or delete legacy users, historical records, financial records, or operational records.
- **FR-014**: The legacy database MUST remain intact, isolated from the new database, and unchanged throughout this initiative.
- **FR-015**: The project MUST maintain an inventory of every entity, relation, constraint, function, permission and operation required by active conventional greenhouse services before implementing the new persistence.
- **FR-016**: The new model MUST exclude structures exclusive to field cultivation, talhão and hydroponics, retaining only shared components demonstrably required by active conventional greenhouse services.
- **FR-017**: Database-level RLS policies MUST enforce tenant isolation for read, write, delete and sharing operations, with positive and negative isolation tests executed directly against the database.
- **FR-018**: The new persistence MUST preserve compatibility with the active contracts for authentication, tenant selection, permissions, production, finance, audit, traceability and offline operations.
- **FR-019**: The new baseline MUST NOT automatically reuse or replay legacy migrations; each included object MUST be explicitly inventoried, justified and recreated in the new baseline.

### Additional Functional Requirements — User Provisioning

- **FR-020**: O novo ambiente MUST provisionar usuários por cadastro novo do zero, sem importar, copiar, reconciliar ou reutilizar automaticamente contas, credenciais ou memberships do banco legado.

### Key Entities *(include if feature involves data)*

- **Baseline de persistência**: conjunto ordenado de alterações aprovadas.
- **Ambiente de validação**: instalação não produtiva para aplicar a baseline e testar.
- **Regra de segurança**: vínculo entre identidade, tenant, permissão e operação.
- **Registro de validação**: evidências, resultados, falhas, pendências e aprovações.
- **Plano de cutover**: critérios, responsáveis, rollback e autorização.
- **Ambiente legado**: banco preservado para referência e continuidade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das estruturas dos fluxos ativos são reproduzidas em ambiente vazio pela baseline aprovada.
- **SC-002**: 100% dos cenários entre tenants diferentes são bloqueados sem exposição de dados.
- **SC-003**: 100% das alterações possuem justificativa, revisão e reversão registradas.
- **SC-004**: 100% dos testes críticos em staging possuem resultado registrado antes do cutover.
- **SC-005**: 0 registros legados são alterados sem decisão formal de migração.
- **SC-006**: Falhas de credencial ou integração permanecem identificadas como pendências.
- **SC-007**: O cutover só é autorizado com aprovação explícita e rollback disponível.

### Additional Measurable Outcomes

- **SC-008**: 100% dos usuários, registros históricos, registros financeiros e operações legadas permanecem fora do novo banco durante esta iniciativa.
- **SC-009**: 100% dos serviços ativos do domínio de estufas possuem seus requisitos de persistência inventariados e compatíveis com o novo modelo antes da implementação.
- **SC-010**: 100% das estruturas exclusivas de campo, talhão e hidroponia são excluídas da baseline nova, salvo componentes compartilhados formalmente justificados.
- **SC-011**: 100% dos testes de isolamento executados diretamente no banco bloqueiam acessos entre tenants para leitura, escrita, exclusão e compartilhamento.
- **SC-012**: 0 migrations antigas são reutilizadas ou reaplicadas automaticamente na criação do novo banco.

### Additional Measurable Outcomes — User Provisioning

- **SC-013**: 100% das contas e memberships usadas no novo ambiente são criadas pelo fluxo de cadastro novo, sem dependência de registros de usuários legados.

## Decision Record — Cancellation

Esta iniciativa foi cancelada em 2026-11-12 antes de qualquer cutover. O projeto novo
Supabase `okzvcnslwttslkngvexr` deixou de ser o alvo operacional; o aplicativo permanece
no banco legado `fdbzhrpnyrqinmxowgzf`. As migrations locais criadas para o projeto novo
foram removidas, enquanto `supabase/migrations/` permanece preservado.

Consulte o [registro formal da decisão](./decision-record.md). Qualquer rollback remoto ou
retomada desta reconstrução exige nova autorização e uma especificação própria.

## Assumptions

- O domínio continua limitado a estufas convencionais e módulos compartilhados necessários.
- As specs 001–004 são os contratos de referência.
- O banco legado não será alterado nesta iniciativa.
- A decisão inicial é criar a baseline sem migração automática; migração futura exigirá spec própria.
- Credenciais de desenvolvimento/staging poderão ser fornecidas posteriormente.
- Nenhum ambiente novo será promovido sem aprovação explícita.
