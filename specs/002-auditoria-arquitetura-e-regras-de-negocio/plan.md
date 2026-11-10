# Implementation Plan: Auditoria de Arquitetura e Regras de Negócio

**Branch**: `002-auditoria-arquitetura-e-regras-de-negocio` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Produzir uma auditoria reproduzível dos fluxos ativos de estufas, módulos compartilhados e
dependências legadas relevantes. A entrega será documental: inventário de módulos, mapa de
dependências, catálogo de regras, contratos preservados, matriz de riscos, lacunas de testes
e recomendações de limites de responsabilidade. Nenhum código, banco, migration ou dado será
alterado. A aprovação do relatório será gate obrigatório para a futura especificação do novo
projeto Supabase.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript no aplicativo existente; auditoria documental sem novo código

**Primary Dependencies**: React Native, Expo, Supabase, React Query e suíte Node.js existente

**Storage**: Supabase/PostgreSQL existente e armazenamento offline do aplicativo, avaliados
somente como dependências e contratos; nenhum storage será alterado

**Testing**: testes existentes via `npm test`, typecheck e lint quando disponíveis; análise
documental e rastreabilidade de evidências

**Target Platform**: aplicação móvel e web atualmente suportadas, sem alteração de plataforma

**Project Type**: aplicação móvel/web existente com backend Supabase; feature documental

**Performance Goals**: nenhum impacto de runtime; o relatório deve permitir localizar contratos
e bloqueios para o novo banco em até 30 minutos por revisor técnico

**Constraints**: seguir Constituição 1.2.0; não alterar código, dependências, migrations,
schema, dados, produção ou comportamento; auditoria aprovada bloqueia a especificação do novo
banco até revisão formal

**Scale/Scope**: fluxos ativos de estufas, módulos compartilhados e dependências legadas com
impacto em dados, segurança ou compatibilidade; fora desse limite, registrar exclusão e motivo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Preservação**: PASS — a iniciativa não altera comportamento, arquitetura ou dados.
- **Integridade e segurança**: PASS — tenant, permissões, offline e integridade serão
  inventariados; nenhum banco será acessado ou alterado.
- **SDD**: PASS — a iniciativa possui especificação, clarificações e este plano antes de
  qualquer implementação.
- **Qualidade verificável**: PASS — o relatório terá evidências, lacunas e critérios de
  validação; testes existentes serão tratados como evidência, sem alegar cobertura inexistente.
- **Reconstrução controlada**: PASS — o novo banco permanece bloqueado até aprovação formal
  do relatório.
- **Dependências e Git**: PASS — não haverá alteração de dependências nem operações Git.

## Project Structure

### Documentation (this feature)

```text
specs/002-auditoria-arquitetura-e-regras-de-negocio/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── audit-report.md      # Final audit report assembled during implementation
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── contexts/              # autenticação, tenant e configurações
├── hooks/                 # consultas e coordenação de estado
├── navigation/            # superfícies e contratos de navegação
├── screens/               # fluxos de estufa e módulos compartilhados
├── services/              # domínio, persistência, segurança e offline
└── types/                 # contratos de domínio e Supabase

tests/                     # evidências unitárias e de integração existentes
supabase/
├── migrations/            # histórico legado, somente leitura nesta iniciativa
└── config.toml            # configuração existente, somente referência

specs/002-auditoria-arquitetura-e-regras-de-negocio/
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

**Structure Decision**: A iniciativa usa a estrutura documental da feature para registrar a
auditoria. O código existente é avaliado por fronteiras reais (`screens`, `services`, `contexts`,
`hooks`, `navigation`, `types`, `tests` e `supabase`), sem criar uma nova estrutura de aplicação.

## Complexity Tracking

Não há violações da Constituição nem complexidade adicional de implementação. Qualquer
refatoração identificada será convertida em especificação própria antes de execução.
