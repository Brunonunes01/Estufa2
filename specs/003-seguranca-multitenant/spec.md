# Feature Specification: Segurança e Isolamento Multi-Tenant

**Feature Branch**: `003-seguranca-multitenant`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Com base na auditoria 002, consolidar segurança, permissões e isolamento multi-tenant nos fluxos ativos de estufa, preservando operação offline e dados históricos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operar somente com o tenant autorizado (Priority: P1)

Como usuário autenticado do Estufa2, quero que toda consulta e operação de estufa use o tenant selecionado e autorizado, para não misturar dados entre propriedades.

**Why this priority**: O isolamento entre tenants é requisito permanente de segurança e a base para todos os demais fluxos operacionais.

**Independent Test**: Com dois tenants e um usuário que possui acesso a apenas um deles, executar consultas e tentativas de escrita usando os dois identificadores e confirmar que somente o tenant autorizado é aceito.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com um tenant selecionado, **When** consulta estufas, plantios, colheitas ou módulos compartilhados, **Then** somente registros do tenant selecionado são retornados.
2. **Given** uma operação que informa um tenant diferente do tenant selecionado, **When** a operação é iniciada, **Then** ela é rejeitada sem consultar, alterar ou revelar dados do tenant divergente.
3. **Given** um tenant vazio, inválido ou não disponível para o usuário, **When** uma operação protegida é iniciada, **Then** ela é rejeitada com mensagem segura e sem fallback para outro tenant.

### User Story 2 - Respeitar permissões em cada operação (Priority: P1)

Como proprietário ou membro compartilhado de uma propriedade, quero que minhas permissões de leitura, escrita, exclusão e compartilhamento sejam aplicadas de forma consistente, para que eu só realize ações autorizadas.

**Why this priority**: O papel do usuário define o limite de dano e de acesso dentro do tenant; inconsistências entre telas e operações podem permitir alterações indevidas.

**Independent Test**: Com perfis proprietário, gerente, operador e somente leitura, executar uma matriz de leitura, criação, edição, exclusão e compartilhamento em fluxos de estufa e confirmar os resultados esperados para cada perfil.

**Acceptance Scenarios**:

1. **Given** um usuário somente leitura, **When** tenta criar, editar ou excluir um registro de estufa, **Then** a ação é bloqueada sem alteração persistida.
2. **Given** um operador com permissão de escrita e sem permissão de exclusão, **When** cria ou edita um registro e tenta excluí-lo, **Then** criação e edição são permitidas e exclusão é bloqueada.
3. **Given** um membro sem permissão de compartilhamento, **When** tenta convidar, remover ou alterar permissões de outro membro, **Then** a ação é bloqueada sem expor dados de administração.
4. **Given** um usuário autorizado, **When** acessa um fluxo preservado de estufa, **Then** as permissões são aplicadas sem reintroduzir rotas ou entidades removidas na iniciativa 001.

### User Story 3 - Manter segurança durante operação offline (Priority: P2)

Como usuário de uma operação com conectividade intermitente, quero que ações offline mantenham o mesmo tenant e permissões da sessão autorizada, para continuar trabalhando sem criar operações fora do escopo.

**Why this priority**: A fila offline não pode se tornar uma rota de bypass das regras de autorização aplicadas no uso conectado.

**Independent Test**: Desconectar um usuário autorizado, registrar operações de estufa, tentar inserir uma operação com tenant divergente e reconectar; confirmar retenção somente das operações válidas e reconciliação sem duplicidade.

**Acceptance Scenarios**:

1. **Given** uma operação de estufa autorizada iniciada offline, **When** a conectividade é interrompida, **Then** a operação permanece localmente vinculada ao usuário e tenant corretos.
2. **Given** uma operação offline com tenant divergente ou permissão insuficiente, **When** ela é preparada para sincronização, **Then** é rejeitada ou mantida como falha identificável sem ser aplicada ao tenant.
3. **Given** uma operação offline válida aguardando sincronização, **When** a conectividade retorna, **Then** ela é reconciliada uma única vez e permanece no escopo autorizado.

### Edge Cases

- O tenant selecionado deixa de estar disponível durante uma operação: a ação deve falhar com segurança, sem trocar automaticamente para o tenant proprietário ou para o primeiro tenant da lista.
- A sessão expira enquanto existem operações pendentes: as operações não devem ser aplicadas sem nova autenticação e validação de escopo.
- Uma permissão é reduzida enquanto a fila offline ainda contém uma ação: a sincronização deve revalidar a autorização antes de aplicar a ação.
- Um registro histórico contém referências legadas de Campo, Talhão ou Hidroponia: a guarda não deve apagar, converter ou expor esse registro por uma rota operacional nova.
- Uma chamada recebe identificador de tenant com espaços ou formato vazio: valores válidos devem ser normalizados; valores vazios devem ser rejeitados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST associar cada leitura, escrita, exclusão e sincronização de operação ativa a um tenant autorizado.
- **FR-002**: O sistema MUST rejeitar operações cujo tenant informado seja vazio, inválido, divergente do tenant selecionado ou não esteja entre os tenants disponíveis ao usuário.
- **FR-003**: O sistema MUST aplicar permissões distintas para leitura, escrita, exclusão e gerenciamento de compartilhamento.
- **FR-004**: O sistema MUST impedir que usuários somente leitura alterem registros ativos de estufa ou módulos compartilhados.
- **FR-005**: O sistema MUST impedir que membros sem permissão de exclusão removam registros, mesmo quando possuem permissão de escrita.
- **FR-006**: O sistema MUST impedir que membros sem permissão de compartilhamento gerenciem convites ou permissões de outros membros.
- **FR-007**: O sistema MUST aplicar as mesmas validações de tenant e permissão às operações offline antes da sincronização.
- **FR-008**: O sistema MUST revalidar tenant e permissão no momento da reconciliação de uma operação offline pendente.
- **FR-009**: O sistema MUST evitar duplicidade não controlada ao reconciliar novamente uma operação offline autorizada.
- **FR-010**: O sistema MUST negar acesso sem revelar dados quando a sessão estiver ausente, expirada ou sem tenant autorizado.
- **FR-011**: O sistema MUST manter os fluxos ativos restritos à gestão de estufas convencionais e aos módulos compartilhados aprovados na iniciativa 001.
- **FR-012**: O sistema MUST preservar registros históricos e referências legadas de Campo, Talhão e Hidroponia, sem torná-los caminhos operacionais ativos.
- **FR-013**: O sistema MUST apresentar mensagens de bloqueio compreensíveis ao usuário sem incluir dados de outro tenant ou detalhes sensíveis de autorização.
- **FR-014**: A mudança MUST preservar o comportamento de autenticação, seleção de tenant e armazenamento offline já aprovado, salvo diferenças explicitamente descritas nesta especificação.

### Key Entities

- **Usuário autenticado**: pessoa com sessão válida e identidade usada para autorizar leituras, escritas e sincronizações.
- **Tenant**: propriedade ou operação agrícola que delimita os dados e ações disponíveis.
- **Membro do tenant**: vínculo do usuário com um tenant, papel e permissões específicas.
- **Operação protegida**: leitura, escrita, exclusão, compartilhamento ou sincronização que exige tenant e autorização válidos.
- **Operação offline pendente**: ação autorizada armazenada localmente aguardando reconciliação, vinculada ao usuário e tenant de origem.
- **Registro histórico legado**: dado preservado de domínio removido, sem acesso operacional ativo nesta feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos cenários de teste com tenant divergente, vazio ou não autorizado, nenhuma leitura ou escrita de dados do tenant alvo é realizada.
- **SC-002**: Em 100% da matriz de perfis validada, cada ação de leitura, escrita, exclusão e compartilhamento respeita a permissão definida para o usuário.
- **SC-003**: 100% das operações offline autorizadas são reconciliadas apenas no tenant de origem e no máximo uma vez por operação válida.
- **SC-004**: 100% das operações offline inválidas por tenant, sessão ou permissão permanecem rejeitadas ou identificadas como falha, sem aplicação silenciosa.
- **SC-005**: Usuários autorizados concluem os fluxos preservados de estufa sem encontrar dependência obrigatória de Campo, Talhão ou Hidroponia.
- **SC-006**: Nenhum teste de segurança ou sincronização exige exclusão, conversão ou alteração de registros históricos legados.

## Assumptions

- A autenticação e a seleção de tenant existentes serão reutilizadas.
- Os papéis e flags de permissão já disponíveis representam a fonte funcional de autorização desta feature.
- A gestão de estufas convencionais permanece o único domínio produtivo ativo.
- Dados históricos e estruturas legadas não serão migrados, apagados ou reclassificados nesta feature.
- A validação será feita em ambientes de desenvolvimento ou teste, sem acesso ou alteração de banco de produção.
- Qualquer alteração de schema, política de banco ou estratégia de migração será tratada em especificação própria.
