# Tasks: Limpeza Segura do Projeto

**Input**: Design documents from `specs/008-limpeza-segura-projeto/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [cleanup-artifact-contract.md](./contracts/cleanup-artifact-contract.md), [quickstart.md](./quickstart.md)

**Tests**: A especificação e a constituição exigem evidências proporcionais ao risco. As tarefas executam a baseline existente, testes focados, suíte completa e jornadas manuais aplicáveis; nenhuma remoção pode avançar com resultado falho ou inconclusivo.

**Organization**: As tarefas são agrupadas por história de usuário. As fases de inventário e proposta podem avançar sem alterar o produto; a execução da limpeza fica bloqueada até a dupla aprovação registrada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo porque grava em arquivo distinto e não depende de tarefa incompleta.
- **[Story]**: História de usuário atendida (`US1`, `US2`, `US3`).
- Todos os caminhos são relativos à raiz do repositório.

## Phase 1: Setup — Baseline documental

**Purpose**: Preparar artefatos da feature e registrar o estado atual sem alterar ou ocultar mudanças preexistentes.

- [x] T001 Criar os diretórios `specs/008-limpeza-segura-projeto/baselines/`, `specs/008-limpeza-segura-projeto/evidence/` e `specs/008-limpeza-segura-projeto/batches/` sem modificar arquivos do produto
- [x] T002 Capturar versões de Node, npm, Git, branch e `git status --short` em `specs/008-limpeza-segura-projeto/baselines/initial-baseline.md`, redigindo qualquer conteúdo sensível
- [x] T003 Executar `npm run typecheck`, `npm run lint` e `npm test` e registrar comandos, códigos de saída e falhas preexistentes em `specs/008-limpeza-segura-projeto/baselines/initial-baseline.md`
- [x] T004 Registrar contagens por área, itens versionados/ignorados e alterações preexistentes bloqueadas para sobreposição em `specs/008-limpeza-segura-projeto/baselines/initial-baseline.md`

**Checkpoint**: Baseline reproduzível registrada; nenhuma alteração anterior foi descartada ou atribuída à limpeza.

---

## Phase 2: Foundational — Contratos e fronteiras de auditoria

**Purpose**: Criar a estrutura mínima que bloqueia classificações incompletas e protege áreas proibidas.

**⚠️ CRITICAL**: Nenhuma história de usuário começa antes desta fase.

- [x] T005 Criar o esqueleto de `specs/008-limpeza-segura-projeto/inventory.md` com resumo, mapa de proteção e todos os campos obrigatórios de `Candidato de limpeza` definidos em `specs/008-limpeza-segura-projeto/data-model.md`
- [x] T006 [P] Registrar áreas protegidas e a justificativa constitucional de cada uma em `specs/008-limpeza-segura-projeto/evidence/protected-areas.md`
- [x] T007 [P] Mapear entradas, scripts do `package.json`, configurações, build, publicação e consumidores operacionais conhecidos em `specs/008-limpeza-segura-projeto/evidence/repository-entrypoints.md`
- [x] T008 Validar `specs/008-limpeza-segura-projeto/baselines/initial-baseline.md` e `specs/008-limpeza-segura-projeto/inventory.md` contra `specs/008-limpeza-segura-projeto/contracts/cleanup-artifact-contract.md`, corrigindo campos ausentes sem alterar itens auditados

**Checkpoint**: Fundação pronta; inventário só aceita candidatos completos e áreas protegidas não podem formar lotes.

---

## Phase 3: User Story 1 — Inventariar e classificar candidatos (Priority: P1) 🎯 MVP

**Goal**: Produzir um inventário rastreável de todo o repositório, classificando itens inconclusivos como `investigar` e sem remover nada.

**Independent Test**: Selecionar amostras de código, raiz, testes, documentação, áreas protegidas e coleções geradas; cada amostra deve possuir caminho, categoria, evidências, dependências, risco, recomendação e estado reproduzíveis.

### Evidence gathering for User Story 1

- [x] T009 [P] [US1] Analisar alcance a partir de `index.ts`, `App.tsx` e consumidores em `src/` e registrar referências diretas, indiretas, dinâmicas e lacunas em `specs/008-limpeza-segura-projeto/evidence/source-reachability.md`
- [x] T010 [P] [US1] Auditar arquivos de raiz e `scripts/` quanto a comandos, configuração, build, publicação e uso manual em `specs/008-limpeza-segura-projeto/evidence/root-and-scripts.md`
- [x] T011 [P] [US1] Auditar `assets/`, `docs/`, `support-portal/`, `Atualização/` e `exemplos de comprovate/` quanto a referências e finalidade operacional em `specs/008-limpeza-segura-projeto/evidence/auxiliary-content.md`
- [x] T012 [P] [US1] Auditar `tests/` quanto a contratos ainda vigentes, regressões protegidas, duplicações aparentes e uso pelos scripts de teste em `specs/008-limpeza-segura-projeto/evidence/test-assets.md`
- [x] T013 [P] [US1] Inventariar `.agents/`, `.specify/`, `specs/`, `.git/`, `supabase/`, segredos, ambientes e infraestrutura apenas para análise em `specs/008-limpeza-segura-projeto/evidence/protected-inventory.md`, sem recomendar remoção nesta feature
- [x] T014 [P] [US1] Inventariar `node_modules/`, `.expo/`, `supabase/.temp/` e outros itens ignorados ou gerados como coleções agregadas em `specs/008-limpeza-segura-projeto/evidence/generated-collections.md`, registrando origem e regeneração

### Classification for User Story 1

- [x] T015 [US1] Consolidar os achados de `specs/008-limpeza-segura-projeto/evidence/` como candidatos `CLN-NNNN` em `specs/008-limpeza-segura-projeto/inventory.md`, sem deixar campos vazios
- [x] T016 [US1] Registrar confirmações operacionais disponíveis e marcar toda ausência de confirmação como `não confirmado` e estado `investigar` em `specs/008-limpeza-segura-projeto/inventory.md`
- [x] T017 [US1] Classificar cada candidato de `specs/008-limpeza-segura-projeto/inventory.md` como manter, remover, consolidar, arquivar ou investigar, aplicando risco `baixo`, `médio`, `alto` ou `crítico`
- [x] T018 [US1] Conferir que candidatos de remoção possuem cumulativamente evidência de referências, validação e confirmação operacional em `specs/008-limpeza-segura-projeto/inventory.md`; reclassificar qualquer lacuna como `investigar`
- [x] T019 [US1] Reproduzir uma amostra de cada área do inventário e registrar divergências ou confirmação em `specs/008-limpeza-segura-projeto/evidence/inventory-review.md`

**Checkpoint**: User Story 1 concluída e testável de forma independente; o MVP entrega o inventário completo sem remover arquivos.

---

## Phase 4: User Story 2 — Aprovar uma limpeza segura e limitada (Priority: P2)

**Goal**: Transformar somente candidatos elegíveis em lotes coesos, revisáveis e duplamente aprovados.

**Independent Test**: Submeter um lote proposto à revisão; ele só pode receber `aprovado` quando não contém área protegida ou sobreposição preexistente, possui três tipos mínimos de evidência, baseline, riscos, validação, reversão e duas decisões independentes.

### Batch proposal for User Story 2

- [x] T020 [US2] Selecionar em `specs/008-limpeza-segura-projeto/inventory.md` somente candidatos não protegidos que satisfazem integralmente o gate de remoção e manter os demais fora dos lotes
- [x] T021 [US2] Agrupar candidatos elegíveis por justificativa semântica, fronteira de risco e reversão coerente e registrar o índice de propostas em `specs/008-limpeza-segura-projeto/batches/README.md`
- [x] T022 [US2] Criar um documento `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md` para cada proposta usando todas as seções obrigatórias do contrato e vinculá-lo aos candidatos correspondentes em `specs/008-limpeza-segura-projeto/inventory.md`
- [x] T023 [US2] Validar cada documento em `specs/008-limpeza-segura-projeto/batches/` contra áreas protegidas, alterações preexistentes, dependências, evidências, baseline, riscos, plano de validação e reversão; marcar falhas como `bloqueado`
- [x] T024 [US2] Registrar `pendente` nas seções de aprovação de produto e validação técnica de cada proposta elegível em `specs/008-limpeza-segura-projeto/batches/`

### Mandatory approval gate for User Story 2

- [x] T025 [US2] **STOP — GATE DE PRODUTO**: apresentar ao usuário o índice e os documentos de `specs/008-limpeza-segura-projeto/batches/`, solicitar aprovação explícita lote a lote e não executar T026 ou qualquer remoção enquanto a resposta estiver pendente
- [x] T026 [US2] Após resposta explícita do usuário, registrar aprovação, rejeição ou alterações solicitadas na seção `Aprovação de produto` de cada arquivo em `specs/008-limpeza-segura-projeto/batches/`
- [x] T027 [US2] Fazer o revisor técnico conferir evidências, riscos, plano de validação e reversibilidade e registrar decisão independente na seção `Validação técnica` de cada arquivo em `specs/008-limpeza-segura-projeto/batches/`
- [x] T028 [US2] Marcar como `aprovado` somente lotes com duas decisões positivas e atualizar estados dos candidatos em `specs/008-limpeza-segura-projeto/inventory.md`; manter todos os demais `bloqueado` ou `rejeitado`

**Checkpoint**: User Story 2 concluída; propostas são auditáveis e nenhum lote sem dupla aprovação pode seguir para execução.

---

## Phase 5: User Story 3 — Executar e validar a limpeza incremental (Priority: P3)

**Goal**: Aplicar um lote aprovado por vez, provar ausência de regressão e reverter ou bloquear qualquer resultado falho ou inconclusivo.

**Independent Test**: Aplicar um único lote duplamente aprovado, confirmar que o diff contém apenas seus candidatos, executar validações focadas/gerais/manuais e demonstrar que o estado final é `validado` ou `revertido` com evidências.

**⚠️ ENTRY GATE**: Esta fase depende da conclusão de T028 e não pode atuar sobre lotes `pendente`, `bloqueado` ou `rejeitado`.

- [x] T029 [US3] Selecionar o primeiro lote `aprovado` em `specs/008-limpeza-segura-projeto/batches/` e capturar sua baseline imediatamente anterior em `specs/008-limpeza-segura-projeto/baselines/BAS-NNN-BAT-NNN.md`
- [x] T030 [US3] Confirmar no arquivo `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md` que as duas aprovações continuam válidas, que não surgiu sobreposição preexistente e que todos os candidatos permanecem elegíveis
- [x] T031 [US3] Aplicar somente as remoções, movimentações ou consolidações enumeradas no lote `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md`, sem tocar áreas protegidas ou mudanças externas ao lote
- [x] T032 [US3] Executar as validações focadas e jornadas proporcionais à fronteira descritas em `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md` e registrar resultados sanitizados no próprio documento
- [x] T033 [US3] Executar `npm run validate`, `git diff --check`, `git diff --stat` e conferência do diff contra a baseline e registrar códigos de saída em `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md`
- [x] T034 [US3] Marcar o lote como `validado` somente se todas as verificações passarem; em falha ou resultado inconclusivo, marcar `bloqueado`, executar apenas a reversão específica documentada e registrar `revertido` em `specs/008-limpeza-segura-projeto/batches/BAT-NNN-descricao.md`
- [x] T035 [US3] Atualizar estados, resultado final e risco residual dos candidatos do lote em `specs/008-limpeza-segura-projeto/inventory.md`
- [x] T036 [US3] Repetir T029–T035 sequencialmente para cada lote aprovado restante, iniciando o próximo somente após o anterior alcançar `validado` ou `revertido`, e atualizar `specs/008-limpeza-segura-projeto/batches/README.md`

**Checkpoint**: User Story 3 concluída; todos os lotes executados possuem resultado reproduzível e nenhum lote dependente avançou após falha.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechar rastreabilidade, segurança das evidências e critérios mensuráveis da iniciativa.

- [x] T037 Atualizar totais por categoria, risco, estado e resultado e listar trabalho futuro separado em `specs/008-limpeza-segura-projeto/inventory.md`
- [x] T038 Fazer um segundo revisor reproduzir uma amostra de cada categoria e registrar duração, resultados e divergências em `specs/008-limpeza-segura-projeto/evidence/final-review.md`
- [x] T039 Verificar ausência de valores sensíveis nos artefatos sob `specs/008-limpeza-segura-projeto/` e registrar somente padrões/nomes sanitizados em `specs/008-limpeza-segura-projeto/evidence/security-review.md`
- [x] T040 Executar Prettier em modo de verificação nos documentos de `specs/008-limpeza-segura-projeto/` e corrigir apenas formatação desses artefatos
- [x] T041 Executar o gate final de `specs/008-limpeza-segura-projeto/quickstart.md` e registrar falhas, limitações e comparação com a baseline em `specs/008-limpeza-segura-projeto/evidence/final-validation.md`
- [x] T042 Confirmar conformidade final com `specs/008-limpeza-segura-projeto/spec.md`, `specs/008-limpeza-segura-projeto/contracts/cleanup-artifact-contract.md` e `.specify/memory/constitution.md` em `specs/008-limpeza-segura-projeto/evidence/completion-report.md`

---

## Phase 7: Limpeza ampliada autorizada

- [x] T043 Registrar a autorização explícita do produto para remover todos os suspeitos removíveis em `specs/008-limpeza-segura-projeto/batches/BAT-003-suspect-content.md`
- [x] T044 Remover `docs/`, `Atualização/`, `exemplos de comprovate/` e `scripts/generate_aquisicao_pptx.js`, preservando persistência e alterações preexistentes
- [x] T045 Remover `src/screens/Campo/components/PermanentFieldCycleDeleteModal.tsx` após nova decisão explícita do produto
- [x] T046 Executar typecheck, lint e testes após a limpeza ampliada
- [x] T047 Atualizar inventário, validação e relatório de conclusão com o resultado real da limpeza ampliada

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: começa imediatamente e não altera o produto.
- **Foundational (Phase 2)**: depende de T001–T004 e bloqueia todas as histórias.
- **User Story 1 (Phase 3)**: depende de T005–T008; entrega o MVP sem remoções.
- **User Story 2 (Phase 4)**: depende de T015–T019; T025 cria uma parada obrigatória para aprovação humana.
- **User Story 3 (Phase 5)**: depende de T028 e aceita somente lotes duplamente aprovados.
- **Polish (Phase 6)**: depende dos lotes desejados alcançarem estado final.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 Inventário -> US2 Aprovação -> [GATE HUMANO] -> US3 Execução -> Fechamento
```

- **US1 (P1)** é independente como entrega: produz inventário e evidências sem modificar o produto.
- **US2 (P2)** depende do inventário, mas é independente como entrega: produz propostas e decisões sem executar lotes.
- **US3 (P3)** depende de lotes aprovados; cada lote é executado e validado independentemente dos demais.

### Within Each User Story

- Evidências são produzidas antes da classificação.
- Classificação completa precede propostas de lote.
- Baseline, validação e reversão precedem aprovações.
- Aprovação de produto e validação técnica precedem qualquer alteração.
- Um lote deve alcançar `validado` ou `revertido` antes do próximo.

### Parallel Opportunities

- T006 e T007 podem avançar em paralelo após a baseline.
- T009–T014 podem avançar em paralelo porque gravam em arquivos de evidência distintos.
- Validações de documentos de lotes diferentes em T023 podem ser distribuídas, desde que ninguém altere o mesmo arquivo.
- T038 e T039 podem avançar em paralelo após todos os lotes atingirem estado final.
- T031–T036 nunca são paralelas entre lotes: execução e validação são deliberadamente sequenciais.

---

## Parallel Example: User Story 1

```text
Task T009: analisar alcance do código em evidence/source-reachability.md
Task T010: auditar raiz e scripts em evidence/root-and-scripts.md
Task T011: auditar conteúdo auxiliar em evidence/auxiliary-content.md
Task T012: auditar testes em evidence/test-assets.md
Task T013: inventariar áreas protegidas em evidence/protected-inventory.md
Task T014: inventariar coleções geradas em evidence/generated-collections.md
```

Depois que todas terminarem, T015 consolida os resultados no único arquivo compartilhado `inventory.md`.

---

## Implementation Strategy

### MVP First — User Story 1

1. Completar Setup e Foundational.
2. Executar T009–T019.
3. Parar e revisar o inventário sem remover arquivos.
4. O MVP já entrega visibilidade verificável do que manter, investigar ou propor.

### Approval-Gated Increment

1. Executar US2 até T024 para produzir propostas.
2. Em T025, parar e solicitar decisão explícita do usuário lote a lote.
3. Registrar as decisões e concluir a revisão técnica em T026–T028.
4. Somente depois executar US3, um lote aprovado por vez.

### Incremental Delivery

1. Baseline + inventário completo.
2. Propostas sem alteração do produto.
3. Primeiro lote aprovado e validado como piloto.
4. Demais lotes aprovados, sempre sequenciais.
5. Fechamento auditável e trabalho futuro separado.

---

## Notes

- `[P]` indica arquivos distintos e ausência de dependência incompleta.
- A ausência de referência isolada nunca autoriza remoção.
- Itens sem confirmação operacional permanecem `investigar`.
- A implementação deve parar em T025; autorização desta geração de tarefas não equivale à aprovação de lote.
- Não executar `git add`, commit, push, reset, rebase, checkout destrutivo ou alteração de produção.
- Mudanças funcionais, arquiteturais, de dependência ou persistência viram trabalho separado.
