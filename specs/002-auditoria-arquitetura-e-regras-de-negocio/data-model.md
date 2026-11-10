# Data Model: Auditoria de Arquitetura e Regras de Negócio

Este modelo descreve os registros produzidos pela auditoria. Ele não altera o modelo de
produção nem define tabelas ou migrations para o novo Supabase.

## AuditScope

Representa a fronteira da análise.

- **id**: identificador estável do escopo.
- **name**: nome do fluxo ou área avaliada.
- **domain**: domínio produtivo de estufas, módulo compartilhado ou dependência legada.
- **inScopeReason**: motivo para inclusão na auditoria.
- **excludedAreas**: áreas excluídas e justificativa.
- **evidenceSources**: arquivos, testes e documentos consultados.

### Validation rules

- Todo fluxo ativo de estufa deve possuir um escopo ou estar explicitamente relacionado a
  um escopo compartilhado.
- Dependências legadas só entram no escopo quando houver impacto possível em dados,
  segurança ou compatibilidade.
- Escopos não podem autorizar implementação por si mesmos.

## ModuleAssessment

Representa a avaliação de um módulo, serviço, tela, teste ou configuração.

- **module**: caminho ou identificação do módulo.
- **responsibilities**: responsabilidades observadas.
- **inputsOutputs**: entradas, saídas e fronteiras relevantes.
- **dependencies**: dependências internas, persistência, autenticação ou sincronização.
- **businessRuleDensity**: baixa, média ou alta concentração de regras.
- **couplingLevel**: baixo, médio ou alto acoplamento.
- **testEvidence**: evidências de testes existentes e lacunas.
- **assessmentStatus**: avaliado, parcialmente avaliado ou limitado por evidência.

### Validation rules

- Um módulo com múltiplas responsabilidades deve listar cada uma separadamente.
- `assessmentStatus` limitado exige registrar a causa da limitação.
- A avaliação descreve o estado observado e não implica necessidade automática de
  refatoração.

## BusinessRule

Representa uma regra, invariante ou decisão que influencia um fluxo.

- **id**: identificador da regra.
- **description**: comportamento observável ou invariante.
- **domain**: produção, financeiro, autorização, tenant, offline, sincronização ou outro.
- **locations**: pontos onde a regra é aplicada ou inferida.
- **sourceOfTruth**: fonte atualmente considerada predominante, quando identificável.
- **duplicationStatus**: única, duplicada, conflitante ou desconhecida.
- **legacyCompatibility**: indica se há dependência de comportamento histórico.
- **validationEvidence**: testes ou evidências que sustentam a regra.

### Validation rules

- Regras sem evidência devem ser marcadas como lacuna, não como contrato confirmado.
- Regras duplicadas devem registrar todos os pontos conhecidos.
- Regras históricas não podem ser classificadas como removíveis sem aprovação própria.

## ArchitecturalFinding

Representa um problema, risco ou oportunidade encontrada.

- **id**: identificador do achado.
- **title**: descrição curta.
- **evidence**: observações e referências verificáveis.
- **impact**: efeito potencial sobre comportamento, dados, segurança ou manutenção.
- **priority**: prioridade relativa baseada em risco e valor.
- **dependencies**: pré-condições e relações com outros achados.
- **regressionRisk**: baixo, médio ou alto.
- **recommendation**: limite de responsabilidade ou direção futura, sem implementação.
- **status**: aberto, aceito, adiado, fora do escopo ou resolvido em iniciativa posterior.

### Validation rules

- Nenhum achado pode existir sem evidência e impacto descritos.
- Uma recomendação que altera comportamento deve apontar para futura especificação.
- Achados não podem autorizar alteração de código, dependência, banco ou dados.

## PreservedContract

Representa um comportamento que deve permanecer válido.

- **id**: identificador do contrato.
- **description**: comportamento esperado.
- **consumers**: fluxos, usuários ou módulos que dependem dele.
- **securityScope**: tenant, papel ou permissão envolvida.
- **offlineScope**: comportamento esperado sem conectividade.
- **dataIntegrityInvariants**: condições que não podem ser violadas.
- **evidence**: testes, documentação ou comportamento observado.

### Validation rules

- Contratos financeiros, de tenant, autorização e offline exigem evidência explícita ou
  devem ser classificados como lacuna.
- Contratos preservados não podem ser reinterpretados pela auditoria.

## FutureImprovementCandidate

Representa uma melhoria que poderá ser especificada depois.

- **findingIds**: achados que motivam a melhoria.
- **scope**: limite da mudança candidata.
- **expectedBenefit**: benefício esperado.
- **validationApproach**: evidência necessária antes de concluir.
- **reversibility**: estratégia esperada de reversão.
- **approvalRequired**: sempre verdadeiro para mudanças de comportamento.

### Relationships

- `AuditScope` contém `ModuleAssessment`.
- `ModuleAssessment` referencia `BusinessRule`, `PreservedContract` e outros módulos.
- `ArchitecturalFinding` referencia evidências, módulos, regras e contratos.
- `FutureImprovementCandidate` é derivada de um ou mais `ArchitecturalFinding` e nunca é
  executada automaticamente.
