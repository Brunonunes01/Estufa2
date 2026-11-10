# Feature Specification: Recuperação e Simplificação do Estufa2

**Feature Branch**: \`001-recuperacao-estufas\`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Recuperar e estabilizar o Estufa2, tornando-o exclusivamente
voltado à gestão de estufas agrícolas, preservando módulos compartilhados, segurança,
offline e integridade dos dados."

## Clarifications

### Session 2026-11-10

- Q: Após a remoção dos módulos, como os dados históricos de campo, talhão e hidroponia
  devem ser acessados? → A: Reter sem acesso operacional; os dados permanecem íntegros,
  mas não haverá telas ou fluxos desses domínios no aplicativo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operar exclusivamente a gestão de estufas (Priority: P1)

Como usuário autorizado do Estufa2, quero encontrar somente operações relacionadas à gestão
de estufas para executar meu trabalho sem confusão com fluxos de cultivo a campo ou talhões.

**Why this priority**: Define o limite principal do produto e reduz o risco de o usuário
iniciar operações fora do escopo agrícola pretendido.

**Independent Test**: Um usuário autorizado percorre a navegação e os fluxos operacionais,
e confirma que não há opções ou caminhos acessíveis para campo, talhão ou hidroponia,
enquanto os fluxos de estufa convencional continuam disponíveis.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com permissões válidas, **When** ele acessa a
   navegação principal, **Then** não encontra opções específicas de cultivo a campo,
   gerenciamento de talhões ou hidroponia.
2. **Given** um usuário autorizado em um fluxo de gestão agrícola, **When** ele navega
   entre operações disponíveis, **Then** só pode iniciar fluxos compatíveis com estufas
   convencionais ou com módulos compartilhados preservados.
3. **Given** um registro histórico associado a campo, talhão ou hidroponia, **When** os
   fluxos correspondentes são removidos, **Then** o registro permanece retido e consistente,
   sem telas ou fluxos operacionais desses domínios no aplicativo.

---

### User Story 2 - Continuar o ciclo operacional da estufa (Priority: P1)

Como responsável por uma estufa, quero cadastrar e acompanhar estufas, plantios e colheitas
para manter o ciclo produtivo funcionando após a simplificação do produto.

**Why this priority**: O ciclo de estufa é o valor central que precisa ser preservado na
recuperação do sistema.

**Independent Test**: Em um tenant de teste, o usuário cadastra ou consulta uma estufa,
registra um plantio, registra uma colheita e verifica a continuidade dos dados e das
informações relacionadas.

**Acceptance Scenarios**:

1. **Given** um usuário com permissão de operação, **When** cadastra ou consulta uma
   estufa, **Then** o fluxo permanece disponível e os dados exibidos pertencem ao tenant
   correto.
2. **Given** uma estufa existente, **When** o usuário registra um plantio, **Then** o
   plantio fica associado à estufa correta e pode ser consultado posteriormente.
3. **Given** um plantio existente, **When** o usuário registra uma colheita, **Then** a
   colheita preserva suas relações e informações necessárias para os demais módulos.

---

### User Story 3 - Usar os módulos compartilhados da operação (Priority: P1)

Como gestor da operação, quero continuar usando insumos, aplicações, manejos, vendas,
recebimentos, despesas, clientes, fornecedores, financeiro e relatórios relacionados a
estufas sem depender de entidades exclusivas de campo ou talhão.

**Why this priority**: A retirada de fluxos de campo não pode interromper as atividades
administrativas, financeiras e produtivas que sustentam a operação das estufas.

**Independent Test**: Com dados de estufa, o usuário executa ao menos um fluxo de cada
grupo compartilhado e verifica que os resultados não exigem cadastro ou seleção de campo ou
talhão.

**Acceptance Scenarios**:

1. **Given** uma operação de estufa com dados válidos, **When** o usuário movimenta
   insumos, aplicações ou manejos, **Then** o fluxo conclui sem exigir entidade exclusiva
   de campo ou talhão.
2. **Given** uma operação comercial ou financeira de estufa, **When** o usuário registra
   venda, recebimento ou despesa, **Then** os valores permanecem consistentes e podem ser
   consultados nos relatórios aplicáveis.
3. **Given** clientes, fornecedores e registros financeiros existentes, **When** o
   usuário consulta ou atualiza informações autorizadas, **Then** os módulos continuam
   operacionais sem perda de vínculos com a operação de estufa.
4. **Given** o módulo de hidroponia existente, **When** o usuário acessa operações
   compatíveis com estufas, **Then** não encontra operações de hidroponia, telas ou
   dependências exclusivas desse módulo.

---

### User Story 4 - Operar com segurança e conectividade intermitente (Priority: P1)

Como usuário de uma operação agrícola, quero manter autenticação, permissões, isolamento
entre tenants e uso offline para continuar trabalhando sem expor dados ou perder registros.

**Why this priority**: Segurança, isolamento de dados e continuidade offline são contratos
permanentes do produto e não podem regredir durante a recuperação.

**Independent Test**: Em tenants distintos, usuários com permissões diferentes executam
consultas e operações online e offline, reconectam-se e verificam que somente dados
autorizados são exibidos e sincronizados.

**Acceptance Scenarios**:

1. **Given** usuários pertencentes a tenants distintos, **When** consultam ou sincronizam
   registros de estufas, **Then** cada usuário acessa somente dados autorizados de seu
   tenant.
2. **Given** uma interrupção de conectividade, **When** o usuário executa uma operação
   offline permitida, **Then** o aplicativo mantém o registro local sem perda silenciosa.
3. **Given** operações pendentes no retorno da conectividade, **When** a sincronização é
   retomada, **Then** os dados são reconciliados sem duplicidades não controladas e sem
   violar permissões.
4. **Given** um usuário sem determinada permissão, **When** tenta acessar uma operação
   restrita, **Then** o acesso é negado sem revelar dados de outro escopo.

---

### User Story 5 - Recuperar estabilidade sem alterar o escopo indevidamente (Priority: P2)

Como responsável pela evolução do produto, quero identificar problemas que ameaçam a
estabilidade e registrar seus impactos para que correções futuras sejam aprovadas e
incrementais.

**Why this priority**: A recuperação exige tornar riscos visíveis sem transformar a
especificação em autorização para refatorações ou mudanças não relacionadas.

**Independent Test**: Uma revisão funcional percorre os fluxos preservados, registra cada
problema reproduzível com seu impacto e separa claramente defeitos de decisões de escopo.

**Acceptance Scenarios**:

1. **Given** um problema observável em um fluxo de estufa ou compartilhado, **When** ele é
   registrado, **Then** a descrição inclui contexto, impacto, evidência e relação com o
   escopo desta iniciativa.
2. **Given** uma possível melhoria fora do escopo, **When** ela é identificada durante a
   recuperação, **Then** fica registrada como item separado e não altera o comportamento
   automaticamente.
3. **Given** uma alteração de comportamento proposta, **When** ela é avaliada, **Then** só
   pode avançar após requisito aprovado e evidências de teste adequadas.

### Edge Cases

- Um registro antigo referencia campo ou talhão que não está mais disponível na navegação:
  os dados históricos permanecem armazenados e consistentes, sem serem apagados ou
  convertidos silenciosamente.
- Um módulo compartilhado ainda exige campo ou talhão para concluir uma operação de
  estufa: o caso deve ser identificado como dependência ou risco; a operação não deve
  criar dados incompletos nem inventar uma associação.
- Um usuário tenta abrir diretamente um fluxo removido por endereço salvo, atalho ou
  histórico: o sistema não oferece a operação e não expõe dados fora das permissões.
- A remoção de uma opção de navegação torna um relatório histórico inacessível: os dados
  permanecem retidos e íntegros, sem criação de uma tela operacional para recuperá-los no
  aplicativo.
- Uma operação offline é repetida antes da sincronização: a reconciliação deve evitar
  duplicidade não controlada e manter a intenção do usuário identificável.
- Um tenant possui dados mistos de estufa, campo e talhão: os dados de estufa e os
  históricos de campo/talhão devem permanecer consistentes entre si.
- A remoção de hidroponia encontra uma dependência compartilhada com estufas: o
  componente compartilhado deve permanecer, enquanto somente a parte exclusiva de
  hidroponia é removida conforme mudança aprovada.

## Escopo e Classificação das Funcionalidades

### Funcionalidades exclusivas de estufa

- Cadastro, consulta e operação de estufas.
- Plantios e colheitas associados a estufas.
- Insumos, aplicações e manejos quando relacionados à operação de estufas.
- Vendas, recebimentos, despesas e relatórios derivados de operações de estufa.

### Funcionalidades exclusivas de campo ou talhão

- Cadastro, consulta e gestão operacional de talhões.
- Fluxos de cultivo a campo que dependam de áreas abertas ou entidades exclusivas de campo.
- Operações cuja finalidade principal seja administrar entidades ou ciclos exclusivos de
  campo/talhão.
- Operações, telas e dependências exclusivas de hidroponia.

Essas funcionalidades não devem aparecer na navegação, nas telas nem nos fluxos
operacionais do produto após a iniciativa. Sua remoção da experiência operacional não
implica exclusão, migração destrutiva ou descarte automático dos dados históricos.

### Funcionalidades compartilhadas

- Autenticação, permissões, isolamento multi-tenant e perfis de acesso.
- Funcionamento offline, sincronização e recuperação após perda de conectividade.
- Clientes, fornecedores, financeiro, vendas, recebimentos, despesas e relatórios quando
  puderem operar com dados de estufa.
- Integridade, consulta e preservação de registros históricos.

Funcionalidades compartilhadas devem continuar operacionais sem exigir entidade exclusiva de
campo ou talhão para os cenários de estufa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O aplicativo MUST apresentar, na navegação e nos fluxos operacionais,
  somente funcionalidades de estufa convencional e funcionalidades compartilhadas
  compatíveis com estufas.
- **FR-002**: O aplicativo MUST impedir que funcionalidades, telas e dependências
  exclusivas de campo, talhão ou hidroponia sejam iniciadas ou exigidas pela navegação,
  pelos fluxos operacionais ou por acessos diretos.
- **FR-003**: O aplicativo MUST manter disponíveis os fluxos de cadastro e operação de
  estufas, plantios e colheitas.
- **FR-004**: O aplicativo MUST manter disponíveis, para cenários de estufa, insumos,
  aplicações, manejos, vendas, recebimentos, despesas, clientes, fornecedores, financeiro
  e relatórios aplicáveis.
- **FR-005**: Os módulos compartilhados MUST concluir operações de estufa sem exigir uma
  associação obrigatória a entidade exclusiva de campo ou talhão.
- **FR-006**: Funcionalidades exclusivas de hidroponia MUST ser removidas do aplicativo,
  incluindo sua navegação, telas e dependências exclusivas, mediante mudança formalmente
  especificada, aprovada e validada.
- **FR-007**: O aplicativo MUST preservar dados históricos de campo e talhão, sem exclusão
  automática como consequência da remoção dos fluxos operacionais.
- **FR-008**: A remoção de fluxos MUST preservar a consistência dos registros existentes,
  das relações entre registros e das informações financeiras.
- **FR-009**: O aplicativo MUST preservar autenticação, permissões e isolamento de dados
  entre usuários e tenants em todos os fluxos mantidos e durante a sincronização.
- **FR-010**: O aplicativo MUST permitir que operações autorizadas continuem funcionando
  offline dentro dos limites existentes, sem perda silenciosa ou duplicidade não controlada
  após a reconexão.
- **FR-011**: Problemas existentes que comprometam a estabilidade MUST ser registrados com
  evidência reproduzível, impacto, escopo afetado e indicação se constituem defeito,
  dependência, risco ou decisão pendente.
- **FR-012**: Nenhuma alteração de comportamento MUST ser incorporada sem requisito
  aprovado, testes adequados e verificação de regressão dos fluxos preservados.
- **FR-013**: A iniciativa MUST NOT executar exclusões destrutivas de dados, alterações no
  banco de produção ou substituição da arquitetura existente; a remoção de dependências
  exclusivas dos módulos retirados MUST ocorrer somente conforme mudança aprovada.

### Key Entities

- **Estufa**: unidade produtiva principal do escopo, com seus dados operacionais e
  relações autorizadas.
- **Plantio**: ciclo produtivo associado a uma estufa, usado para acompanhar produção.
- **Colheita**: resultado de um plantio, com informações necessárias ao acompanhamento
  operacional, comercial e financeiro.
- **Registro compartilhado**: entidade de clientes, fornecedores, insumos, aplicações,
  manejos, vendas, recebimentos, despesas ou relatórios que pode apoiar operações de
  estufa.
- **Registro histórico de campo ou talhão**: dado legado que deve permanecer consistente
  mesmo quando o fluxo operacional correspondente deixa de estar disponível.
- **Tenant e usuário autorizado**: contexto de isolamento e permissão que determina quais
  dados e ações podem ser acessados.
- **Operação offline pendente**: ação autorizada realizada sem conectividade, aguardando
  reconciliação sem perda ou duplicidade não controlada.

## Dependências, Riscos e Decisões Pendentes

### Dependências

- A identificação correta das relações entre operações de estufa, registros compartilhados
  e entidades legadas de campo, talhão ou hidroponia.
- O inventário das funcionalidades, telas e dependências exclusivas de campo, talhão e
  hidroponia antes de sua remoção formal.
- A disponibilidade de ambientes seguros para validar fluxos, permissões, sincronização e
  preservação de dados sem tocar no banco de produção.
- A existência de evidências de teste dos fluxos preservados e dos cenários offline.

### Riscos

- Um módulo compartilhado pode possuir dependência implícita de campo, talhão ou
  hidroponia, impedindo a operação de estufa após a remoção da navegação.
- A remoção de referências visíveis pode quebrar relatórios ou consultas históricas sem
  excluir dados, criando perda de acesso ou inconsistência percebida.
- Dados mistos por tenant podem revelar relações incompletas durante a sincronização ou
  reconciliação offline.
- A avaliação de estabilidade pode descobrir problemas preexistentes fora do escopo e
  induzir refatorações não aprovadas.

### Decisões pendentes

- Definir a ordem e os limites da remoção formal das funcionalidades, telas e dependências
  exclusivas de campo, talhão e hidroponia.
- Definir a forma de registrar e priorizar problemas de estabilidade identificados sem
  transformá-los automaticamente em mudança de escopo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma revisão dos fluxos acessíveis a usuários autorizados, 100% das opções
  de campo, talhão e hidroponia estão ausentes da navegação, telas e fluxos operacionais
  aprovados.
- **SC-002**: Em um conjunto de cenários de regressão aprovado, 100% dos fluxos de cadastro
  de estufas, plantios e colheitas concluem sem exigir campo, talhão ou hidroponia.
- **SC-003**: Em um conjunto de cenários de operação, 100% dos fluxos preservados de vendas,
  recebimentos, despesas e relatórios de estufa permanecem concluíveis e consistentes.
- **SC-004**: Em testes com pelo menos dois tenants e perfis com permissões distintas, 0%
  dos cenários permitem leitura ou alteração de dados pertencentes a outro tenant ou fora
  da permissão do usuário.
- **SC-005**: Em todos os cenários offline definidos para a iniciativa, 100% das operações
  autorizadas mantêm seus dados após reconexão, sem duplicidades não controladas.
- **SC-006**: Em uma verificação de dados históricos, 0 registros de campo, talhão ou
  hidroponia são excluídos automaticamente como consequência da remoção dos fluxos.
- **SC-007**: Todo problema de estabilidade reproduzido durante a iniciativa possui registro
  com evidência, impacto, classificação e decisão sobre seu tratamento.
- **SC-008**: Nenhuma mudança de comportamento é considerada aprovada sem evidência dos
  testes relevantes e verificação explícita dos fluxos de estufa preservados.

## Assumptions

- A autenticação, as permissões, o isolamento multi-tenant e o comportamento offline atuais
  são contratos a preservar, ainda que problemas existentes sejam documentados para
  avaliação posterior.
- Dados históricos podem continuar armazenados mesmo quando seus fluxos de criação,
  manutenção ou navegação operacional deixam de estar disponíveis.
- A ausência de especificação detalhada sobre retenção significa que nenhum dado histórico
  será excluído nesta iniciativa.
- Funcionalidades, telas e dependências exclusivas de campo, talhão e hidroponia serão
  removidas somente por mudanças formalmente especificadas, aprovadas e validadas.
- A validação ocorrerá em ambientes não produtivos e com dados controlados, sem alteração
  no banco de produção.
- O conjunto de plataformas atualmente suportadas permanece inalterado nesta etapa.
- Correções de estabilidade não descritas como necessárias para este escopo serão
  registradas como riscos ou decisões pendentes, não implementadas incidentalmente.
