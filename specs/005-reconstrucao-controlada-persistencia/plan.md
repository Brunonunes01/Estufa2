# Implementation Plan: Reconstrução Nova da Persistência

**Branch**: `005-reconstrucao-controlada-persistencia` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [specs/005-reconstrucao-controlada-persistencia/spec.md](./spec.md)

## Summary

Criar do zero uma nova baseline de persistência para o domínio aprovado do Estufa2, organizada em migrations reproduzíveis, com segurança multi-tenant, auditoria, integridade produtiva e compatibilidade com os contratos atuais. O banco legado será somente referência e permanecerá intacto; nenhuma cópia, transformação ou descarte de dados ocorrerá nesta iniciativa.

## Technical Context

**Language/Version**: SQL PostgreSQL 15 para migrations; TypeScript 6.0.3 para tipos e validações do cliente

**Primary Dependencies**: Supabase CLI, PostgreSQL, Supabase JS 2 e Expo/React Native já presentes no projeto

**Storage**: Novo projeto Supabase criado vazio; banco legado separado e somente leitura/referência durante esta iniciativa

**Testing**: Supabase CLI local, PostgreSQL local, testes SQL de RLS/integridade, `npm run typecheck`, `npm run lint` e `npm test`

**Target Platform**: Ambiente local/staging para validação; Android, iOS e web somente após a baseline ser validada

**Project Type**: Aplicativo mobile multiplataforma com backend relacional e sincronização offline

**Performance Goals**: Consultas de tenant e operações produtivas comuns devem permanecer adequadas ao uso atual, sem consultas remotas obrigatórias adicionais para regras locais

**Constraints**: criar tudo do zero; não alterar o legado; não migrar dados automaticamente; preservar RLS, tenant, auditoria, offline e domínio de estufas; não incluir Campo, Talhão ou Hidroponia como domínio operacional novo; não aplicar migrations remotas sem credenciais e aprovação

**Scale/Scope**: entidades de autenticação/tenant, estufas, ciclos, plantios, colheitas, vendas, recebimentos, despesas, insumos, aplicações, manejos, tarefas, rastreabilidade, caixa, compartilhamento e suporte necessário aos fluxos ativos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Preservação do comportamento existente**: PASS. Os contratos das specs 001–004 são referências; a nova persistência não altera o cliente nesta etapa.
- **Integridade e segurança dos dados**: PASS. Tenant, permissões, RLS, auditoria e vínculos serão tratados como requisitos de primeira classe.
- **Offline-first e resiliência**: PASS. A baseline preservará identificadores, estados e contratos necessários à fila offline; falhas de credencial não serão mascaradas.
- **Qualidade verificável**: PASS. A criação terá testes locais de schema, RLS, integridade e regressão de contratos.
- **Evolução incremental e arquitetura preservada**: PASS. A baseline será criada em fases ordenadas e cada migration será revisável.
- **Domínio produtivo exclusivo**: PASS. A baseline nova conterá apenas estufas e módulos compartilhados necessários.
- **Reconstrução controlada da persistência**: PASS. O legado permanecerá intacto; staging, rollback e aprovação precederão qualquer cutover.
- **Workflow de commits**: PASS. Estes artefatos não serão commitados sem confirmação explícita do usuário.

## Project Structure

### Documentation (this feature)

```text
specs/005-reconstrucao-controlada-persistencia/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── persistence-baseline.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
supabase/
├── config.toml
└── migrations/                 # baseline nova, criada em migrations novas

src/types/
├── domain.ts                   # modelos usados pelo aplicativo
└── supabase.ts                 # tipos regenerados após ambiente disponível

tests/
├── persistence/                # schema, RLS e integridade
├── contract/                   # contratos de tenant e domínio
└── integration/                # ambiente local/staging
```

**Structure Decision**: manter a estrutura Supabase existente como ponto de integração, mas criar uma sequência nova e identificável de migrations para o novo banco. O diretório legado não será reescrito nem usado como destino de conversão de dados.

## Migration Design

1. **Foundation**: extensões, tipos comuns, timestamps, perfis, cadastro inicial do zero, tenants e memberships.
2. **Authorization**: funções de escopo, permissões, RLS base e compartilhamento.
3. **Greenhouse domain**: estufas, safras, plantios, colheitas e vínculos de ciclo.
4. **Operations**: clientes, fornecedores, insumos, aplicações, manejos e tarefas.
5. **Finance**: vendas, itens, recebimentos, cheques, despesas, caixa e resumos.
6. **Traceability and support**: auditoria, rastreabilidade e suporte necessário.
7. **Hardening**: constraints, índices, triggers e testes de integridade.

Cada etapa deverá ser pequena, ordenada, identificável e acompanhada de teste. Nomes e campos finais serão fechados no modelo de dados e nas tarefas.

## Validation Gates

- Gate 1: baseline SQL revisada e reproduzível em ambiente vazio.
- Gate 2: RLS e isolamento multi-tenant aprovados por testes positivos e negativos.
- Gate 2A: cadastro novo cria identidade, proprietário inicial e memberships sem consultar ou importar usuários legados.
- Gate 3: vínculos produtivos, estados financeiros e auditoria aprovados por testes de contrato.
- Gate 4: cliente e fila offline validados contra o ambiente local/staging.
- Gate 5: rollback documentado e cutover aprovado explicitamente.

## Complexity Tracking

Não há violações constitucionais justificadas. A separação em migrations por domínio aumenta a quantidade de arquivos, mas torna o banco novo revisável, reproduzível e reversível.
