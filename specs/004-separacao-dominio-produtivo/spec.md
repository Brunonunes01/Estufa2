# Feature Specification: Separação do Domínio Produtivo

**Feature Branch**: `004-separacao-dominio-produtivo`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Criar a spec 004 para separar as regras de domínio produtivo dos fluxos de plantio, colheita e venda, preservando o comportamento aprovado, o isolamento multi-tenant, o offline e os dados históricos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regras produtivas consistentes (Priority: P1)

Como responsável por uma estufa, quero que plantio, colheita e venda sigam regras produtivas consistentes, para que o mesmo dado seja validado da mesma forma em todos os fluxos.

**Why this priority**: Regras duplicadas ou espalhadas podem permitir estados incompatíveis e dificultam a manutenção do único domínio produtivo aprovado.

**Independent Test**: Executar os fluxos de criação, edição, encerramento e venda de um ciclo de estufa e confirmar que as mesmas regras de origem, vínculo, período e estado são aplicadas em cada entrada.

**Acceptance Scenarios**:

1. **Given** um ciclo válido vinculado a uma estufa autorizada, **When** o usuário registra plantio, colheita e venda, **Then** cada operação aceita os vínculos e estados compatíveis com o ciclo.
2. **Given** uma operação com vínculo ausente, origem incompatível ou estado impossível, **When** ela é iniciada, **Then** a operação é bloqueada antes de persistir qualquer alteração.
3. **Given** um usuário com acesso a mais de um tenant, **When** ele opera um ciclo selecionado, **Then** todas as regras usam o mesmo tenant autorizado sem misturar dados.

---

### User Story 2 - Fluxos operacionais preservados (Priority: P1)

Como usuário do aplicativo, quero continuar realizando as tarefas atuais de plantio, colheita e venda, para receber os benefícios da organização interna sem perder funcionalidades aprovadas.

**Why this priority**: A refatoração deve reduzir acoplamento sem alterar o comportamento que já foi validado pelos usuários.

**Independent Test**: Repetir os principais fluxos existentes de estufa em um ambiente não produtivo e confirmar que criação, edição, exclusão autorizada, recebimento e relatórios relacionados continuam disponíveis e coerentes.

**Acceptance Scenarios**:

1. **Given** um usuário autorizado e um ciclo de estufa ativo, **When** ele conclui um fluxo preservado, **Then** o resultado funcional permanece equivalente ao comportamento aprovado antes da mudança.
2. **Given** um usuário somente leitura ou sem permissão de exclusão, **When** ele tenta executar uma ação não autorizada, **Then** a ação é bloqueada sem alterar o registro.
3. **Given** um fluxo preservado, **When** o usuário navega pelas etapas operacionais, **Then** nenhuma etapa exige Campo, Talhão ou Hidroponia.

---

### User Story 3 - Continuidade offline e compatibilidade histórica (Priority: P2)

Como usuário com conectividade intermitente, quero que operações produtivas continuem seguras offline e que registros históricos permaneçam preservados, para trabalhar sem perda ou conversão indevida de dados.

**Why this priority**: A separação das regras não pode criar um caminho diferente de autorização, duplicidade ou descarte de referências legadas.

**Independent Test**: Registrar uma operação válida offline, reconectar, repetir a sincronização e consultar registros históricos relacionados, confirmando aplicação única e preservação do conteúdo histórico.

**Acceptance Scenarios**:

1. **Given** uma operação autorizada iniciada offline, **When** a conexão retorna, **Then** a operação é aplicada uma única vez no tenant e ciclo de origem.
2. **Given** uma operação offline incompatível ou revogada, **When** a reconciliação ocorre, **Then** ela permanece identificada como falha e não é aplicada em outro escopo.
3. **Given** um registro histórico com referências de domínio legado, **When** um usuário acessa os fluxos ativos, **Then** o registro não é apagado, convertido ou exposto como uma nova opção operacional.

### Edge Cases

- Um ciclo é encerrado enquanto uma colheita ou venda ainda está pendente; o sistema deve bloquear apenas a transição incompatível e preservar os dados já válidos.
- Uma colheita antiga não possui algum atributo novo; o sistema deve manter a leitura compatível sem inventar valores.
- Uma venda possui recebimento parcial, cheque pendente ou correção financeira; os estados devem permanecer distintos e não duplicar valores.
- Uma operação recebe um identificador de estufa pertencente a outro tenant; ela deve falhar sem consultar ou alterar dados do tenant divergente.
- A sincronização é repetida após sucesso; nenhum registro ou movimento adicional deve ser criado.
- Dados legados mencionam Campo, Talhão ou Hidroponia; eles permanecem fora da superfície operacional ativa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter uma regra única e verificável para validar vínculos entre estufa, ciclo, plantio, colheita e venda.
- **FR-002**: O sistema MUST impedir operações com origem, tenant, ciclo ou estado incompatível antes de persistir alterações.
- **FR-003**: O sistema MUST preservar as operações aprovadas de criação, edição, exclusão autorizada, recebimento, relatórios e auditoria dos fluxos de estufa.
- **FR-004**: O sistema MUST aplicar leitura, escrita, exclusão e compartilhamento conforme as permissões do tenant ativo em todos os fluxos produtivos.
- **FR-005**: O sistema MUST preservar a operação offline com os mesmos vínculos de usuário, tenant, ciclo e autorização usados online.
- **FR-006**: O sistema MUST revalidar autorização, tenant e estado do registro antes de aplicar uma operação offline pendente.
- **FR-007**: O sistema MUST garantir que uma operação offline autorizada seja aplicada no máximo uma vez após reconciliação bem-sucedida.
- **FR-008**: O sistema MUST preservar estados financeiros distintos para valor combinado, recebido, pendente, cheque em mãos e cheque compensado.
- **FR-009**: O sistema MUST manter compatibilidade de leitura para registros históricos sem apagar, converter ou reclassificar dados automaticamente.
- **FR-010**: O sistema MUST manter Campo, Talhão e Hidroponia fora dos caminhos operacionais ativos desta iniciativa.
- **FR-011**: O sistema MUST apresentar mensagens compreensíveis para bloqueios sem revelar dados de outro tenant ou detalhes internos desnecessários.
- **FR-012**: A mudança MUST evitar alteração de schema, migrations, dependências, dados históricos ou ambiente de produção nesta iniciativa.
- **FR-013**: Cada regra produtiva extraída MUST possuir evidência automatizada ou de fluxo que demonstre equivalência e comportamento de erro.

### Key Entities *(include if feature involves data)*

- **Ciclo de estufa**: conjunto operacional que relaciona estufa, plantio, colheita, vendas e estados de execução.
- **Regra produtiva**: validação de vínculo, origem, período ou transição de estado aplicável a uma operação.
- **Operação financeira**: registro de venda e seus estados de recebimento, mantendo valores combinados e efetivamente recebidos separados.
- **Operação offline pendente**: ação autorizada, vinculada ao usuário, tenant e ciclo de origem, aguardando reconciliação.
- **Registro histórico legado**: dado preservado que pode conter referências antigas, mas não cria caminho operacional ativo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos fluxos de plantio, colheita e venda testados usam as mesmas regras para vínculos, origem e transições de estado.
- **SC-002**: 100% das tentativas com tenant, origem, vínculo ou permissão incompatível são bloqueadas antes de qualquer alteração persistida.
- **SC-003**: Pelo menos 95% dos cenários de aceitação preservados concluem sem mudança perceptível no resultado funcional aprovado.
- **SC-004**: 100% das operações offline autorizadas testadas são aplicadas uma única vez no tenant e ciclo de origem.
- **SC-005**: 100% das operações offline revogadas, divergentes ou inválidas permanecem rejeitadas ou identificadas como falha.
- **SC-006**: Nenhum teste de regressão introduz uma rota operacional ativa para Campo, Talhão ou Hidroponia.
- **SC-007**: Nenhum registro histórico é apagado, convertido ou reclassificado automaticamente durante a iniciativa.

## Assumptions

- A autenticação, o isolamento multi-tenant e a fila offline aprovados na [spec 003](../003-seguranca-multitenant/spec.md) serão reutilizados.
- A gestão de estufas convencionais continuará sendo o único domínio produtivo ativo.
- Os fluxos atuais de plantio, colheita, venda, recebimento, financeiro e relatórios são o comportamento de referência.
- A iniciativa será validada em ambiente não produtivo e não autoriza alteração de banco, migrations ou dados históricos.
- A separação das regras será incremental e poderá ser interrompida se exigir mudança de contrato de persistência ou de comportamento aprovado.
- Qualquer decisão sobre migração, arquivamento ou remoção de dados legados será tratada em especificação própria.
