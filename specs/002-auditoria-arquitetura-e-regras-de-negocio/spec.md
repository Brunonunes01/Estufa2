# Feature Specification: Auditoria de Arquitetura e Regras de Negócio

**Feature Branch**: `002-auditoria-arquitetura-e-regras-de-negocio`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Antes de iniciar a criação de um novo banco Supabase, auditar as partes do projeto que concentram regras de negócio, apresentam acoplamento ou código confuso, preparando melhorias incrementais sem alterar o comportamento aprovado."

## Clarifications

### Session 2026-11-10

- Q: A auditoria deve abranger somente os fluxos ativos de estufas e seus módulos compartilhados, ou todo o código do repositório, incluindo funcionalidades legadas de campo, talhões e hidroponia? → A: Auditar os fluxos ativos de estufas, módulos compartilhados e dependências legadas relevantes para dados, segurança ou compatibilidade.
- Q: Qual formato deve ter o resultado principal da auditoria? → A: Relatório estruturado com inventário, mapa de dependências, catálogo de regras, matriz de riscos e lacunas de testes.
- Q: O relatório deve apenas identificar e priorizar problemas, ou também propor limites de responsabilidade e possíveis separações para futuras refatorações? → A: Identificar problemas, priorizar riscos e propor limites de responsabilidade para futuras refatorações, sem prescrever implementação detalhada.
- Q: A conclusão e aprovação da auditoria devem ser obrigatórias antes de iniciar a especificação do novo banco? → A: Exigir aprovação da auditoria antes da especificação do novo banco.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identificar concentração de regras de negócio (Priority: P1)

Como responsável pela evolução do Estufa2, quero localizar os módulos que concentram
regras de negócio, persistência, segurança, sincronização e apresentação, para conhecer os
principais riscos antes de reconstruir o banco.

**Why this priority**: Sem essa visão, a nova persistência pode reproduzir acoplamentos,
duplicidades e comportamentos difíceis de validar.

**Independent Test**: A auditoria produz um inventário verificável dos módulos avaliados,
das responsabilidades encontradas e dos riscos classificados por impacto.

**Acceptance Scenarios**:

1. **Given** o código existente e os fluxos preservados de estufas, **When** a auditoria
   examina cada área relevante, **Then** cada módulo é classificado por responsabilidade,
   dependências e grau de concentração de regras.
2. **Given** um módulo com múltiplas responsabilidades, **When** o resultado da auditoria
   é revisado, **Then** as responsabilidades são descritas separadamente sem propor
   automaticamente uma refatoração.
3. **Given** um módulo sem risco relevante identificado, **When** a auditoria é concluída,
   **Then** o módulo é registrado como avaliado e o motivo para não priorizar mudanças é
   documentado.

---

### User Story 2 - Mapear contratos e regras preservadas (Priority: P1)

Como responsável pelo produto, quero documentar os contratos de autenticação, permissões,
isolamento multi-tenant, funcionamento offline, integridade financeira e operação de
estufas, para que qualquer melhoria futura preserve o comportamento aprovado.

**Why this priority**: Esses contratos limitam a liberdade de reorganizar o código e são
pré-requisitos para definir corretamente o novo banco.

**Independent Test**: Um revisor consegue relacionar cada contrato crítico aos fluxos que
o utilizam, aos riscos conhecidos e às evidências existentes ou ausentes.

**Acceptance Scenarios**:

1. **Given** um fluxo de estufa que lê ou grava dados, **When** seus contratos são
   documentados, **Then** tenant, permissões, integridade e comportamento offline são
   identificados.
2. **Given** uma regra financeira ou de sincronização, **When** houver mais de um ponto que
   a aplica, **Then** a possível duplicidade é registrada e sua divergência potencial é
   indicada.
3. **Given** um comportamento histórico necessário à compatibilidade, **When** ele for
   identificado, **Then** é separado das regras de novas operações e não é marcado para
   remoção automática.

---

### User Story 3 - Priorizar melhorias incrementais (Priority: P1)

Como responsável técnico, quero classificar os problemas encontrados por risco, impacto e
dependência, para que as melhorias sejam executadas em incrementos pequenos, testáveis e
reversíveis.

**Why this priority**: A iniciativa deve reduzir a complexidade sem iniciar uma
reescrita ampla ou alterar funcionalidades sem aprovação.

**Independent Test**: A auditoria entrega uma matriz de prioridades com justificativa,
pré-condições, risco de regressão e indicação do que permanece fora do escopo.

**Acceptance Scenarios**:

1. **Given** um problema de alta complexidade ou risco, **When** ele é priorizado,
   **Then** sua prioridade contém impacto, dependências e evidências que justificam a
   classificação.
2. **Given** uma melhoria que pode alterar comportamento, **When** ela é registrada,
   **Then** fica explícito que exige especificação e aprovação próprias antes da execução.
3. **Given** uma oportunidade de refatoração sem benefício comprovado, **When** a matriz
   é revisada, **Then** ela é mantida fora do escopo atual.

---

### User Story 4 - Definir limites para o novo banco (Priority: P2)

Como responsável pela reconstrução da persistência, quero receber os contratos e
dependências que o novo banco deverá atender, sem criar ainda o banco ou suas migrations.

**Why this priority**: O novo projeto Supabase deve refletir responsabilidades claras e
contratos aprovados, não as ambiguidades do legado.

**Independent Test**: A documentação final permite iniciar uma especificação posterior do
novo banco sem depender de suposições sobre regras ocultas no código.

**Acceptance Scenarios**:

1. **Given** uma entidade ou fluxo necessário às estufas, **When** seus limites são
   documentados, **Then** sua finalidade, dependências e invariantes são identificadas.
2. **Given** um dado ou comportamento legado, **When** seu destino é analisado, **Then** a
   auditoria distingue preservação, migração futura, arquivamento e decisão pendente.
3. **Given** uma dependência que não pode ser separada com segurança, **When** ela é
   encontrada, **Then** a dependência é registrada como risco e bloqueia uma decisão
   prematura sobre o banco.

### Edge Cases

- Um único módulo pode conter regras de mais de um domínio; a classificação deve registrar
  cada responsabilidade, sem presumir que o arquivo inteiro pertença a um único domínio.
- Uma regra pode estar duplicada entre tela, serviço, sincronização e banco; a auditoria
  deve registrar todos os pontos conhecidos e indicar possíveis conflitos.
- Um comportamento legado pode parecer incorreto, mas ser necessário para dados históricos;
  ele não deve ser classificado como removível sem requisito aprovado.
- Um teste existente pode cobrir apenas uma parte da regra; a cobertura parcial deve ser
  registrada como lacuna, não como garantia de segurança.
- Um módulo compartilhado pode parecer relacionado a campo ou hidroponia, mas ainda ser
  necessário à operação convencional de estufas; sua remoção exige análise de dependências.
- A ausência de acesso a um ambiente Supabase não deve ser tratada como evidência de que o
  código não possui integração com persistência.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A auditoria MUST produzir um inventário dos fluxos ativos de estufas,
  módulos compartilhados e dependências legadas relevantes para dados, segurança ou
  compatibilidade.
- **FR-002**: A auditoria MUST identificar responsabilidades de apresentação, domínio,
  persistência, autenticação, autorização, multi-tenant, offline e sincronização.
- **FR-003**: A auditoria MUST registrar arquivos, módulos ou fluxos que concentrem mais de
  uma responsabilidade de negócio ou infraestrutura.
- **FR-004**: A auditoria MUST identificar regras de negócio duplicadas, conflitantes,
  implícitas ou difíceis de testar.
- **FR-005**: A auditoria MUST mapear os contratos necessários para plantios, colheitas,
  insumos, aplicações, manejos, vendas, recebimentos, despesas, clientes, fornecedores,
  financeiro e relatórios de estufas.
- **FR-006**: A auditoria MUST verificar os contratos de autenticação, permissões,
  isolamento multi-tenant, funcionamento offline e integridade dos dados.
- **FR-007**: A auditoria MUST separar comportamento atual aprovado, comportamento legado,
  problemas identificados e melhorias ainda não aprovadas.
- **FR-008**: Cada problema identificado MUST conter evidência, impacto provável,
  prioridade, dependências e risco de regressão.
- **FR-009**: A auditoria MUST classificar como fora do escopo qualquer alteração que exija
  mudança de comportamento sem requisito aprovado.
- **FR-010**: A auditoria MUST registrar os contratos e dependências que o futuro novo
  projeto Supabase deverá atender, sem criar schema, migration ou configuração de banco.
- **FR-011**: A auditoria MUST preservar a distinção entre dados históricos e operações
  novas, sem autorizar exclusão, transformação ou migração de dados.
- **FR-012**: A entrega MUST propor uma ordem de melhorias incrementais, testáveis e
  reversíveis, sem executar essas melhorias nesta iniciativa.
- **FR-013**: A entrega MUST registrar lacunas de testes e evidências necessárias para
  validar futuras mudanças de comportamento.
- **FR-014**: A entrega MUST consolidar os achados em um relatório estruturado contendo,
  no mínimo, inventário de módulos, mapa de dependências, catálogo de regras, matriz de
  riscos e lacunas de testes.
- **FR-015**: A entrega MUST propor limites de responsabilidade e possíveis separações
  para futuras refatorações, sem prescrever implementação detalhada ou alterar o código.
- **FR-016**: A especificação do novo banco MUST permanecer bloqueada até que o relatório
  desta auditoria seja revisado e formalmente aprovado.

### Key Entities

- **Módulo**: Unidade funcional ou técnica avaliada, com responsabilidades, entradas,
  saídas e dependências conhecidas.
- **Regra de negócio**: Invariante ou decisão que determina o comportamento de um fluxo,
  incluindo regras financeiras, de produção, autorização e sincronização.
- **Contrato preservado**: Comportamento que deve continuar válido para usuários, tenants,
  dados históricos ou operação offline.
- **Risco arquitetural**: Problema documentado que pode gerar regressão, inconsistência,
  duplicidade, perda de dados ou dificuldade de evolução.
- **Melhoria candidata**: Alteração potencialmente útil, ainda não aprovada para
  implementação e sujeita a especificação própria.
- **Dependência de persistência**: Relação entre um fluxo do aplicativo e dados,
  operações ou garantias esperadas do banco atual ou futuro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos fluxos preservados de estufa listados na iniciativa possuem módulo
  responsável, contratos críticos e dependências conhecidas documentados.
- **SC-002**: 100% dos módulos avaliados são classificados quanto a responsabilidades,
  concentração de regras e risco, ou possuem justificativa documentada para exclusão da
  análise.
- **SC-003**: Todas as regras duplicadas ou potencialmente conflitantes encontradas são
  registradas com seus pontos de ocorrência e impacto provável.
- **SC-004**: Cada melhoria priorizada possui evidência, risco de regressão, dependências
  e critério de validação antes de qualquer implementação.
- **SC-005**: Nenhuma alteração de comportamento, migration, configuração de banco ou
  exclusão de dados ocorre como resultado direto desta iniciativa.
- **SC-006**: Um revisor técnico consegue identificar, em até 30 minutos, quais contratos
  o novo banco deverá atender e quais decisões ainda impedem sua especificação.
- **SC-007**: As melhorias priorizadas podem ser decompostas em incrementos independentes,
  cada um com testes e possibilidade de reversão definidos em especificações posteriores.
- **SC-008**: O relatório final contém as cinco seções estruturais definidas, sem exigir
  consulta a arquivos não referenciados ou conhecimento informal dos responsáveis.
- **SC-009**: Cada recomendação arquitetural registrada identifica claramente o problema
  que resolve, o limite de responsabilidade proposto e a necessidade de especificação
  posterior antes da implementação.
- **SC-010**: Não existe especificação aprovada do novo banco antes do registro explícito
  da aprovação do relatório de auditoria.

## Assumptions

- A aplicação existente continua sendo a referência para comportamento atual até que uma
  mudança seja formalmente aprovada.
- A gestão de estufas convencionais permanece o único domínio produtivo suportado.
- Autenticação, permissões, isolamento multi-tenant, offline e integridade financeira são
  contratos obrigatórios, mesmo quando a auditoria encontrar implementação confusa.
- O banco Supabase atual e suas migrations são referências históricas, não autorização
  para executar alterações ou reproduzir automaticamente seu desenho no novo projeto.
- A auditoria será realizada com o código, testes, documentação e configurações disponíveis
  no repositório, priorizando fluxos ativos de estufas, módulos compartilhados e
  dependências legadas relevantes; indisponibilidade de ambiente externo será registrada
  como limitação.
- Nenhuma refatoração, alteração de dependência, criação de migration ou mudança de banco
  faz parte desta iniciativa.
- O resultado da auditoria servirá de entrada para especificações futuras de refatoração e
  de reconstrução do banco, que deverão ser aprovadas separadamente.
- A aprovação desta auditoria é um gate obrigatório para iniciar a especificação do novo
  banco, mas não aprova automaticamente qualquer refatoração ou migration.

## Out of Scope

- Criar ou configurar o novo projeto Supabase.
- Criar, reescrever, aplicar ou remover migrations.
- Migrar, transformar, excluir ou corrigir dados no banco atual ou em um novo banco.
- Refatorar código, mover regras ou alterar componentes nesta etapa.
- Alterar dependências, arquitetura, autenticação, permissões ou comportamento funcional.
- Implementar a reconstrução do banco ou gerar tarefas de implementação para ela.
