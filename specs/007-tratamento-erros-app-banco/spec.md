# Feature Specification: Tratamento de Erros no App e Banco Legado

**Feature Branch**: `007-tratamento-erros-app-banco`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Melhorar o aplicativo e o banco legado com tratamento de erros claro, seguro, rastreável e recuperável."

## Clarifications

### Session 2026-11-12

- Q: Quando uma operação encadeada falhar depois de uma etapa já persistida, qual comportamento deve ser obrigatório? → A: Usar atomicidade quando possível; caso contrário, informar o estado parcial e registrar uma reconciliação segura.
- Q: Esta feature pode incluir migrations incrementais no banco legado quando forem necessárias para corrigir integridade, constraints ou políticas RLS? → A: Sim, somente quando houver falha reproduzida, validação em ambiente seguro e rollback documentado.
- Q: Onde as evidências sanitizadas de diagnóstico devem ser armazenadas e por quanto tempo? → A: Armazenar eventos estruturados localmente durante falhas offline, sincronizar somente evidências sanitizadas quando online e aplicar retenção limitada, definida no plano.
- Q: Quando uma leitura essencial falhar junto com uma leitura auxiliar, o app deve bloquear a tela inteira ou continuar com uma experiência degradada? → A: Bloquear somente a ação que depende da fonte essencial indisponível e manter disponíveis as partes válidas.
- Q: Quais operações de escrita devem obrigatoriamente ser protegidas contra duplicidade por repetição ou reenvio? → A: Todas as criações e reenvios de operações de negócio, usando uma chave de idempotência por tentativa lógica.
- Q: A validação desta feature utilizará Docker ou uma instância local do Supabase? → A: Não. Docker, Supabase local, `db reset` e geração de tipos com `--local` estão fora do escopo; migrations serão revisadas por contratos estáticos e só poderão ser executadas posteriormente em ambiente autorizado por processo separado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receber orientação quando uma operação falha (Priority: P1)

Como usuário do Estufa2, quero entender o que aconteceu quando uma operação falhar e saber qual próximo passo tomar, para não ficar preso em telas sem resposta ou repetir ações indevidamente.

**Why this priority**: Mensagens vagas e falhas silenciosas impedem o uso dos fluxos essenciais e podem causar duplicidade ou perda de confiança.

**Independent Test**: Simular falhas de validação, sessão expirada, permissão negada, conflito, indisponibilidade e conexão interrompida em operações de leitura e escrita.

**Acceptance Scenarios**:

1. **Given** uma entrada inválida, **When** o usuário tenta salvar, **Then** a tela identifica o campo ou regra incorreta e informa como corrigir sem enviar uma operação inválida.
2. **Given** uma sessão expirada, **When** o usuário tenta concluir uma operação, **Then** o app informa que é necessário entrar novamente e não apresenta a operação como concluída.
3. **Given** uma permissão insuficiente, **When** o usuário tenta executar a ação, **Then** o app informa que a ação não é permitida e não altera dados.
4. **Given** uma falha temporária de conexão ou disponibilidade, **When** a operação pode ser repetida com segurança, **Then** o app diferencia tentativa, pendência e confirmação e oferece uma orientação segura.

### User Story 2 - Preservar a origem e o resultado das falhas (Priority: P1)

Como responsável pelo produto, quero que cada falha mantenha sua origem, ação, contexto seguro e resultado, para diagnosticar problemas sem atribuir o erro ao módulo errado.

**Why this priority**: O app possui telas compostas e operações encadeadas; perder a origem dificulta correções e pode levar a decisões erradas sobre os dados.

**Independent Test**: Executar leituras compostas com falha em cada fonte, escritas com confirmação ausente e operações encadeadas com falha parcial.

**Acceptance Scenarios**:

1. **Given** uma tela que consulta fontes essenciais e auxiliares, **When** uma fonte auxiliar falha, **Then** o app preserva as fontes válidas, identifica a seção degradada e não atribui a falha a outra fonte.
2. **Given** uma escrita cuja resposta não confirma o resultado, **When** o app recebe uma interrupção, **Then** o estado permanece não confirmado e o usuário não vê sucesso falso.
3. **Given** uma falha em uma etapa posterior de uma operação encadeada, **When** a etapa inicial já foi persistida, **Then** o app informa o estado parcial e registra a ação necessária para reconciliação.
4. **Given** duas tentativas concorrentes para o mesmo registro, **When** uma delas perde a versão válida, **Then** o app informa conflito e preserva o registro confirmado.

### User Story 3 - Proteger dados e manter a persistência consistente (Priority: P1)

Como proprietário de uma conta, quero que erros não exponham credenciais nem misturem dados entre contas, e que o banco rejeite operações inconsistentes, para preservar segurança e integridade.

**Why this priority**: Um erro de tratamento pode ser tão grave quanto o erro original se expuser sessão, permitir acesso cruzado ou deixar registros parciais.

**Independent Test**: Usar dois tenants, sessões válidas e inválidas, payloads incompletos e falhas de relacionamento para verificar respostas permitidas e negadas.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado em uma conta, **When** ocorre uma falha, **Then** mensagens e evidências não contêm token, senha, sessão completa ou dados de outra conta.
2. **Given** um payload sem vínculo obrigatório, **When** ele chega à fronteira de persistência, **Then** a operação é rejeitada sem deixar registro parcial.
3. **Given** uma tentativa de ler ou escrever dados de outra conta, **When** a operação é executada, **Then** ela é negada e não revela se o registro existe.
4. **Given** uma falha temporária ou permanente na persistência, **When** a operação é classificada, **Then** o app diferencia nova tentativa segura de erro terminal.

### Edge Cases

- O usuário fecha ou recarrega a tela durante uma escrita.
- A resposta chega depois de uma nova troca de conta ou tenant.
- O mesmo botão é acionado duas vezes antes da primeira resposta.
- Um registro antigo não possui campos opcionais ou possui estado legado.
- Uma leitura essencial falha junto com uma leitura auxiliar.
- A falha contém uma mensagem técnica com credencial, identificador de sessão ou conteúdo sensível.
- A persistência está disponível para leitura, mas rejeita a escrita.
- A validação local e a validação da persistência discordam.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app MUST classificar falhas de validação, autenticação, autorização, conflito, conectividade, disponibilidade, contrato de dados e falha inesperada.
- **FR-002**: O app MUST apresentar mensagem relacionada à ação afetada e um próximo passo seguro para cada falha conhecida.
- **FR-003**: O app MUST preservar a causa e a fonte de uma falha sem expor detalhes sensíveis ao usuário.
- **FR-004**: Leituras compostas MUST distinguir fontes essenciais, auxiliares e opcionais, mantendo a origem real de cada falha.
- **FR-005**: Operações de escrita MUST diferenciar pendente, confirmada, repetível com segurança e terminalmente falha.
- **FR-006**: O app MUST impedir que uma falha de rede seja apresentada como confirmação de persistência.
- **FR-007**: O app MUST impedir ações após sessão expirada ou permissão revogada e orientar o usuário a recuperar o acesso.
- **FR-008**: Evidências e logs MUST remover ou mascarar tokens, senhas, chaves, sessões completas e registros de outros tenants.
- **FR-009**: A persistência MUST rejeitar payloads sem vínculos, estados ou campos obrigatórios, sem produzir registros parciais.
- **FR-010**: A persistência MUST preservar o isolamento por tenant em leituras, escritas, atualizações e exclusões.
- **FR-011**: Operações repetidas MUST possuir comportamento determinístico e não criar duplicidade quando a primeira tentativa já tiver sido confirmada.
- **FR-012**: O app MUST registrar identificador seguro de correlação, ação, fonte, tenant autorizado e resultado, sem registrar segredos.
- **FR-013**: Registros legados compatíveis MUST continuar legíveis e erros em campos opcionais MUST degradar somente a informação afetada.
- **FR-014**: Operações encadeadas MUST usar atomicidade quando suportada pela fronteira de persistência; quando uma etapa já persistida não puder ser revertida com segurança, falhas MUST indicar o estado das etapas concluídas e registrar uma ação de reconciliação segura.
- **FR-015**: A validação da feature MUST cobrir app, contratos estáticos da fronteira de persistência, isolamento entre tenants e regressão dos fluxos essenciais, sem depender de Docker ou banco local.
- **FR-016**: Migrations incrementais do banco legado MUST ser limitadas a falhas reproduzidas, possuir revisão estática automatizada e rollback documentado antes de qualquer aplicação ou validação executável autorizada separadamente.
- **FR-017**: Evidências de diagnóstico MUST ser armazenadas como eventos estruturados sanitizados, permanecer disponíveis localmente durante indisponibilidade, sincronizar somente quando houver conectividade e respeitar uma política de retenção limitada definida no plano.
- **FR-018**: Em leituras compostas, a falha de uma fonte essencial MUST bloquear somente as ações que dependem dela, mantendo disponíveis as informações e ações independentes que permanecerem válidas.
- **FR-019**: Para atender ao comportamento determinístico de FR-011, todas as criações e reenvios de operações de negócio MUST usar uma chave de idempotência por tentativa lógica, com resultado determinístico quando a mesma tentativa for processada novamente.

### Key Entities

- **Erro de serviço**: falha classificada por categoria, ação, fonte, causa preservada, contexto sanitizado e resultado.
- **Resultado de operação**: estado de uma leitura ou escrita, incluindo confirmado, pendente, degradado, repetível ou terminal.
- **Evidência de diagnóstico**: registro sanitizado de execução, ambiente, resultado e referência de validação.
- **Contrato de persistência**: conjunto de campos, relações, estados, permissões e regras de integridade esperados por uma operação.
- **Contexto de tenant**: usuário autenticado, conta selecionada e permissões válidas para a operação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das oito categorias de falha possuem mensagem acionável, próximo passo e evidência sanitizada.
- **SC-002**: 100% das falhas em leituras compostas identificam a fonte correta sem atribuição cruzada.
- **SC-003**: 100% das escritas testadas diferenciam confirmação, pendência, repetição segura e erro terminal.
- **SC-004**: 0 evidências de teste contêm tokens, senhas, chaves, sessões completas ou dados de outro tenant.
- **SC-005**: 100% das operações protegidas testadas negam acesso para usuário sem relação válida com o tenant.
- **SC-006**: 100% dos payloads inválidos testados são rejeitados sem registro parcial.
- **SC-007**: Pelo menos 95% dos cenários de erro executados e registrados na matriz de validação permitem ao usuário identificar a ação corretiva na primeira mensagem; o percentual MUST ser calculado como cenários aprovados dividido pelo total de cenários executados.
- **SC-008**: Os fluxos de login, painel, ciclo, venda e despesa continuam aprovados após a melhoria de tratamento de erros.
- **SC-009**: Nenhum erro tratado pela feature altera o banco novo abortado ou reativa sua reconstrução.

## Assumptions

- O banco legado permanece como único ambiente operacional desta feature.
- A reconstrução do banco novo está cancelada e fora do escopo.
- O app continuará funcionando com os fluxos atuais de autenticação, tenants, offline e persistência.
- Mensagens técnicas detalhadas ficarão restritas a evidências sanitizadas para diagnóstico.
- Falhas transitórias poderão ser repetidas somente quando a operação for idempotente ou explicitamente segura.
- Mudanças de schema do banco legado exigirão migration incremental, validação e rollback documentado.
- Testes automatizados e cenários manuais serão usados conforme o risco da fronteira alterada.
- Docker e Supabase local não serão usados nesta feature; testes executáveis de RLS/migrations e qualquer aplicação remota pertencem a um processo posterior, explicitamente autorizado.

