# Implementation Plan: Separação do Domínio Produtivo

**Branch**: `004-separacao-dominio-produtivo` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

## Summary

Separar as regras de negócio dos fluxos de plantio, colheita e venda em contratos de domínio verificáveis, preservando o comportamento operacional já aprovado. A mudança será incremental e limitada à organização das regras, seus consumidores e evidências de regressão; não haverá alteração de banco, migrations, dependências ou dados históricos.

## Technical Context

**Language/Version**: TypeScript 6.0.3 com React Native 0.86.3 e React 19.2.3

**Primary Dependencies**: Expo 57, React Navigation 7, Supabase JS 2, TanStack Query 5, AsyncStorage e NetInfo já presentes no projeto

**Storage**: Supabase existente e fila offline local baseada em AsyncStorage; nenhum contrato de persistência novo

**Testing**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate` e testes de regras produtivas, fluxos financeiros, autorização, origem e reconciliação offline

**Target Platform**: Android, iOS e web

**Project Type**: Aplicativo mobile multiplataforma com suporte web

**Performance Goals**: Manter o comportamento atual dos fluxos e não adicionar consultas remotas obrigatórias apenas para resolver regras locais de domínio

**Constraints**: preservar autenticação, tenant, permissões, offline e fluxos ativos de estufa; não alterar schema, migrations, dependências, produção ou dados históricos; não reintroduzir Campo, Talhão ou Hidroponia; separar regras sem mudar resultados aprovados

**Scale/Scope**: plantio, colheita, venda, recebimento, rastreabilidade, financeiro relacionado, fila offline e telas preservadas de estufa

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Preservação do comportamento existente**: PASS. O plano exige equivalência funcional e testes de regressão antes de qualquer consolidação.
- **Integridade e segurança dos dados**: PASS. Tenant e permissões permanecem na fronteira existente; nenhum dado será copiado, convertido, apagado ou reclassificado.
- **Offline-first e resiliência**: PASS. A fila continua usando seus metadados e regras de autorização, com testes de repetição e falha identificável.
- **Qualidade verificável**: PASS. Cada contrato de regra terá testes unitários e os fluxos críticos terão testes de integração ou aceitação adequados ao risco.
- **Evolução incremental e arquitetura preservada**: PASS. A mudança limita-se aos contratos e consumidores do domínio produtivo aprovado.
- **Domínio produtivo exclusivo**: PASS. Campo, Talhão e Hidroponia continuam fora dos caminhos operacionais ativos.
- **Reconstrução controlada da persistência**: PASS. Nenhuma alteração de banco ou schema faz parte desta iniciativa.

## Project Structure

### Documentation

```text
specs/004-separacao-dominio-produtivo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── productive-domain-boundary.md
└── tasks.md
```

### Source Code

```text
src/
├── lib/                         # regras puras e contratos reutilizáveis
├── services/
│   ├── plantioService.ts        # orquestração e persistência de plantio
│   ├── colheitaService.ts       # orquestração e persistência de colheita
│   ├── vendaService.ts          # orquestração, recebimento e venda
│   ├── productionOriginGuard.ts # fronteira de origem operacional
│   └── offline/                 # replay e reconciliação dos fluxos
├── screens/                     # fluxos preservados de estufa
└── types/                       # modelos de domínio existentes

tests/
├── productionOriginGuard.test.ts
├── greenhouseCycle.test.ts
├── vendaDeletionFlow.test.ts
├── vendaReceivedValueMigration.test.ts
├── offlineStorage.test.ts
└── [novos testes de contratos e equivalência]
```

**Structure Decision**: manter o projeto único e extrair primeiro regras puras e contratos de domínio para `src/lib/` ou módulos de serviço pequenos, deixando os serviços atuais como orquestradores de persistência. A escolha final de arquivo será confirmada nas tarefas sem criar uma camada genérica que esconda regras específicas do ciclo.

## Phase 0: Research & Decisions

1. Mapear regras atualmente espalhadas entre plantio, colheita, venda, origem produtiva, pagamento e rastreabilidade.
2. Catalogar entradas online e offline e confirmar onde cada regra deve ser aplicada para evitar divergência entre execução imediata e replay.
3. Identificar contratos históricos que precisam continuar legíveis sem virar caminhos de criação ou edição ativos.
4. Definir critérios de equivalência para estados financeiros, transições do ciclo, vínculos de estufa e erros seguros.

## Phase 1: Design & Contracts

1. Descrever entidades, invariantes e transições em [data-model.md](./data-model.md).
2. Formalizar a fronteira do domínio produtivo em [contracts/productive-domain-boundary.md](./contracts/productive-domain-boundary.md).
3. Registrar cenários executáveis, baseline e comandos em [quickstart.md](./quickstart.md).
4. Reavaliar os gates da Constituição e garantir que o design não exige mudança de persistência ou alteração de contratos históricos.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | O plano reutiliza a estrutura existente e limita a mudança ao domínio aprovado. | N/A |
