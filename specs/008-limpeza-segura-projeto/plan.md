# Implementation Plan: Limpeza Segura do Projeto

**Branch**: `008-limpeza-segura-projeto` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-limpeza-segura-projeto/spec.md`

## Summary

Inventariar todo o repositório, classificar cada candidato com evidências reproduzíveis e executar somente lotes semanticamente coesos que tenham aprovação de produto, validação técnica e reversão documentada. O trabalho será conduzido por artefatos Markdown versionados no diretório da feature, usando as ferramentas e os gates já existentes no projeto. Áreas protegidas permanecem somente auditáveis; nenhuma dependência, arquitetura, persistência, migration, segredo ou configuração crítica será alterada.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 26.13.0 e PowerShell 7 no fluxo local; Python existente aparece apenas como candidato de inventário, não como nova dependência

**Primary Dependencies**: Expo 57, React Native 0.86, React 19, Supabase JS 2.106 e ferramentas existentes (`git`, `rg`, TypeScript, ESLint, Prettier e Node test runner); nenhuma dependência nova

**Storage**: Artefatos Markdown versionados sob `specs/008-limpeza-segura-projeto/`; arquivos do repositório como objeto da auditoria; nenhum armazenamento de aplicação ou banco alterado

**Testing**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate`, inspeção de referências com `rg`, inspeção do grafo versionado com Git e jornadas manuais proporcionais ao risco

**Target Platform**: Repositório de aplicativo Expo para web, Android e iOS; validação local em Windows/PowerShell e nos alvos afetados por cada lote

**Project Type**: Aplicativo móvel/web único com Supabase, portal de suporte e artefatos de infraestrutura no mesmo repositório

**Performance Goals**: Inventariar 100% das áreas do repositório; manter coleções externas ou geradas de grande volume como unidades agregadas; permitir que um segundo revisor confira o resumo por categoria em até 30 minutos

**Constraints**: Preservar alterações preexistentes na árvore de trabalho; nenhuma remoção antes da dupla aprovação; áreas protegidas são somente auditáveis; sem mudança de dependências, schema, migrations, ambientes, produção, arquitetura ou comportamento; nenhum segredo copiado para evidências

**Scale/Scope**: Baseline de 480 arquivos versionados, incluindo 199 em `src/`, 80 em `tests/`, 35 em `supabase/` e 81 em `specs/`, além de diretórios gerados/ignorados tratados de forma agregada

## Constitution Check

_GATE: Avaliado antes da pesquisa e reavaliado após o desenho da Phase 1._

| Gate constitucional                   | Status | Evidência no desenho                                                                                                                     |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| I. Preservação do comportamento       | PASS   | Todo candidato começa sem autorização de remoção; comportamento ou contrato duvidoso resulta em `investigar` ou trabalho separado.       |
| II. Integridade e segurança dos dados | PASS   | Banco, segredos, configurações sensíveis e persistência são áreas protegidas; relatórios registram metadados, nunca valores sensíveis.   |
| III. Offline-first                    | PASS   | Código de fila, sincronização, cache e reconciliação é de alto risco e exige validação offline específica antes de qualquer lote.        |
| IV. Qualidade verificável             | PASS   | Cada lote exige baseline, evidências cumulativas, validação proporcional ao risco e comparação posterior.                                |
| V. Evolução incremental               | PASS   | Lotes pequenos e semanticamente coesos, sem dependências novas ou refatoração oportunista.                                               |
| VI. Domínio produtivo exclusivo       | PASS   | Fluxos ativos de estufas e componentes compartilhados são preservados; remoção funcional de outros domínios continua fora desta limpeza. |
| VII. Persistência controlada          | PASS   | `supabase/`, migrations e dump de banco são somente auditáveis e não podem ser alterados por esta iniciativa.                            |
| Restrições de Git e produção          | PASS   | O plano não autoriza `git add`, commit, push, reset, rebase, aplicação remota ou alteração de produção.                                  |

Não há violações constitucionais nem clarificações técnicas pendentes.

## Project Structure

### Documentation (this feature)

```text
specs/008-limpeza-segura-projeto/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cleanup-artifact-contract.md
├── checklists/
│   └── requirements.md
├── inventory.md                    # Criado na implementação
├── baselines/                      # Criado na implementação
│   └── initial-baseline.md
├── batches/                        # Criado na implementação
│   └── NNN-descricao.md
└── tasks.md                        # Gerado posteriormente por /speckit-tasks
```

### Source Code (repository root)

```text
App.tsx, index.ts                   # Entradas principais do aplicativo
src/                               # Código do produto; auditável e removível somente por lote aprovado
├── components/
├── constants/
├── contexts/
├── hooks/
├── lib/
├── navigation/
├── screens/
├── services/
├── theme/
├── types/
└── utils/
tests/                             # Provas de regressão; alto risco para remoção
scripts/                           # Automação local e de build
assets/                            # Recursos usados por app/build
docs/                              # Documentação operacional e técnica
support-portal/                    # Aplicação auxiliar com entrada própria
supabase/                          # Área protegida, somente auditável
├── migrations/
├── tests/
└── .temp/                         # Unidade gerada/ignorada
specs/, .specify/, .agents/        # Governança e especificações, somente auditáveis
node_modules/, .expo/              # Coleções geradas/ignoradas, inventariadas como unidades
arquivos de configuração na raiz  # Alto risco ou protegidos conforme finalidade
```

**Structure Decision**: Não criar ferramenta nova nem modificar a arquitetura da aplicação para executar uma limpeza pontual. O inventário, as aprovações e os resultados ficam junto da feature; cada remoção aprovada atua diretamente sobre o artefato original e deve ser isolável no diff do lote. Diretórios protegidos ou gerados aparecem no inventário com granularidade agregada quando a análise item a item não agrega valor.

## Implementation Strategy

### Phase A — Baseline e mapa de proteção

1. Registrar estado do Git, contagens, comandos de validação e falhas preexistentes sem modificar ou ocultar mudanças do usuário.
2. Enumerar entradas, scripts, configurações, convenções, documentação operacional e áreas protegidas.
3. Tratar `.git/`, `.specify/`, `.agents/`, `specs/`, histórico de migrations, segredos, ambientes e infraestrutura crítica como somente auditáveis.
4. Registrar coleções externas ou geradas, como `node_modules/`, `.expo/` e `supabase/.temp/`, como unidades agregadas com origem e regra de regeneração.

### Phase B — Inventário e evidências

1. Criar uma linha por candidato ou grupo homogêneo conforme o contrato de artefatos.
2. Verificar referências diretas, imports, entradas, scripts, configurações, carregamento dinâmico, documentação e uso operacional.
3. Classificar itens inconclusivos como `investigar`; ausência de referência isolada nunca autoriza remoção.
4. Separar descobertas funcionais, arquiteturais, de dependência ou persistência em trabalho futuro, sem incorporá-las aos lotes.

### Phase C — Proposta e aprovação de lotes

1. Agrupar somente candidatos com a mesma justificativa, fronteira de risco e reversão coerente.
2. Registrar baseline aplicável, arquivos exatos, evidências, validações, impactos, riscos residuais e reversão.
3. Obter aprovação do responsável pelo produto para o escopo e validação de um revisor técnico para evidências, riscos e reversibilidade.
4. Bloquear qualquer lote com campos pendentes, área protegida, alteração preexistente sobreposta ou evidência inconclusiva.

### Phase D — Execução incremental

1. Aplicar um lote aprovado por vez, preservando alterações preexistentes e sem mudanças incidentais.
2. Executar primeiro as validações focadas e depois os gates gerais definidos para o risco do lote.
3. Comparar resultados com a baseline; falha nova, diferença inexplicada ou perda de capacidade bloqueia o lote e aciona a reversão documentada.
4. Atualizar imediatamente o estado de cada candidato, as evidências posteriores e os riscos residuais.

### Phase E — Fechamento auditável

1. Conferir que todo candidato possui estado final inequívoco e que nenhum item `investigar` foi alterado.
2. Publicar totais por categoria e decisão, lotes validados/revertidos e trabalho futuro separado.
3. Fazer um segundo revisor reproduzir uma amostra de cada categoria e confirmar que o resumo é verificável em até 30 minutos.
4. Executar o gate final sem suprimir falhas e registrar limitações conhecidas.

## Post-Design Constitution Check

O desenho da Phase 1 mantém todos os gates como **PASS**:

- O modelo de dados exige evidência cumulativa, dupla aprovação e transições explícitas antes de `aplicado`.
- O contrato proíbe alterações em áreas protegidas e impede que conteúdo sensível seja copiado para artefatos.
- O quickstart começa capturando a árvore de trabalho existente, evitando atribuir mudanças anteriores à limpeza.
- A matriz de validação aumenta conforme o risco e exige cenários offline, multi-tenant, build ou operação quando aplicáveis.
- Os artefatos são internos e versionáveis; não há API, banco, dependência, serviço ou infraestrutura nova.
- O processo não autoriza operações de Git restritas, alterações em produção ou reescrita do histórico.

## Complexity Tracking

Não aplicável. O plano não introduz violações constitucionais nem componentes de software novos.
