# Implementation Plan: Segurança e Isolamento Multi-Tenant

**Branch**: `003-seguranca-multitenant` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-seguranca-multitenant/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Consolidar a autorização dos fluxos ativos de estufa em torno do tenant selecionado,
permissões explícitas por operação e revalidação da fila offline. A implementação deve
reutilizar a autenticação, a seleção de tenant, os papéis e o armazenamento offline atuais,
adicionando uma fronteira única de validação sem alterar schema, migrations, dados legados
ou a superfície removida pela iniciativa 001.

## Technical Context

**Language/Version**: TypeScript 6.0.3 com React Native 0.86.3 e React 19.2.3

**Primary Dependencies**: Expo 57, React Navigation 7, Supabase JS 2, AsyncStorage,
NetInfo e TanStack Query 5 já presentes no projeto

**Storage**: Supabase existente e fila local baseada em AsyncStorage; nenhum schema novo

**Testing**: `npm run typecheck`, `npm run lint`, `npm test` e `npm run validate`, com
testes unitários de autorização, integração de tenant e sincronização offline

**Target Platform**: Android, iOS e web

**Project Type**: Aplicativo mobile multiplataforma com suporte web

**Performance Goals**: A autorização não deve adicionar consultas remotas obrigatórias por
operação; decisões locais de tenant/permissão devem permanecer síncronas e determinísticas

**Constraints**: preservar autenticação, tenant, offline e comportamento dos módulos de
estufa; não alterar banco de produção, schema, migrations ou dependências; não reintroduzir
Campo, Talhão ou Hidroponia; não descartar dados históricos

**Scale/Scope**: serviços ativos de estufa e módulos compartilhados, autenticação, seleção
de tenant, permissões e fila offline; inclui testes de segurança e reconciliação

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Preservação do comportamento existente**: PASS. A mudança centraliza validações sem
  alterar fluxos autorizados de estufa ou a seleção de tenant.
- **Integridade e segurança dos dados**: PASS. Toda operação deve manter tenant e permissão;
  não há migração, exclusão ou alteração de produção.
- **Offline-first e resiliência**: PASS. A fila será revalidada no enfileiramento e na
  reconciliação, preservando falhas identificáveis e evitando duplicidade.
- **Qualidade verificável**: PASS. A matriz de perfis, tenants, sessão e fila offline terá
  testes automatizados e validação composta.
- **Evolução incremental**: PASS. O plano limita-se à fronteira de autorização e seus
  consumidores diretos, sem refatoração ampla de domínio.
- **Domínio produtivo exclusivo**: PASS. Nenhuma rota ou entidade removida pela 001 será
  reintroduzida.
- **Reconstrução controlada da persistência**: PASS. O banco legado permanece intacto; RLS,
  schema e migração ficam fora desta feature.

## Project Structure

### Documentation (this feature)

```text
specs/003-seguranca-multitenant/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  The concrete source layout for this feature is defined below.
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  No alternative project structures apply.
-->

```text
src/
├── contexts/                  # sessão, tenants disponíveis e tenant selecionado
├── hooks/                     # consumo de autorização nos fluxos de UI
├── lib/                       # resolução e asserção de permissões
├── navigation/                # superfície ativa preservada
├── services/                  # guardas de tenant, domínio e offline
│   └── offline/               # fila, handlers e sincronização
└── types/                     # tipos de domínio e compatibilidade histórica

tests/
├── accessControl.test.ts
├── tenantGuard.test.ts
├── authTenantIntegration.test.ts
├── offlineStorage.test.ts
└── syncServiceIntegration.test.ts
```

**Structure Decision**: Manter o projeto único existente. A autorização será reforçada nos
limites já compartilhados de `src/lib`, `src/services/tenantGuard.ts`, `src/services/offline/`,
`src/hooks/useAuth.ts` e `src/contexts/AuthContext.tsx`; os serviços de domínio só receberão
integrações pontuais quando necessário para preservar o tenant e a permissão. Os testes
permanecem no diretório `tests/`.

## Phase 0: Research & Decisions

1. Confirmar o modelo atual de papéis e flags de permissão carregados do vínculo de tenant.
2. Mapear todos os pontos de entrada da fila offline, seus metadados de usuário/tenant e o
   momento atual de filtragem durante o flush.
3. Definir uma única matriz de operações (`read`, `write`, `delete`, `manageSharing`) e os
   erros seguros para tenant ausente, divergente ou sem permissão.
4. Confirmar que a solução não exige nova consulta remota em cada operação nem alteração de
   RLS/schema nesta iniciativa.

## Phase 1: Design & Contracts

1. Descrever as entidades e transições de autorização em [data-model.md](./data-model.md).
2. Formalizar a fronteira de tenant, permissões, rotas preservadas e fila em
   [contracts/tenant-authorization-boundary.md](./contracts/tenant-authorization-boundary.md).
3. Registrar cenários executáveis e resultados esperados em [quickstart.md](./quickstart.md).
4. Reavaliar os gates da Constituição antes de gerar as tarefas de implementação.

## Phase 2: Implementation Readiness

O plano termina na geração dos artefatos de design. A decomposição em tarefas deve ocorrer
com `$speckit-tasks`, depois da revisão do contrato e do modelo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nenhuma | Não há violação constitucional identificada | N/A |
