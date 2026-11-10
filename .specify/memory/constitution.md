<!--
Sync Impact Report
- Version change: 1.1.0 -> 1.2.0
- Modified principles: PRINCIPLE_1_NAME -> I. Preservação do Comportamento Existente;
  PRINCIPLE_2_NAME -> II. Integridade e Segurança dos Dados;
  PRINCIPLE_3_NAME -> III. Offline-First e Resiliência Operacional;
  PRINCIPLE_4_NAME -> IV. Qualidade Verificável;
  PRINCIPLE_5_NAME -> V. Evolução Incremental e Arquitetura Preservada;
  added VII. Reconstrução Controlada da Persistência
- Added sections: VII. Reconstrução Controlada da Persistência; atualização de Restrições Permanentes e Fluxo de Desenvolvimento
- Removed sections: none
- Follow-up TODOs: definir, em especificação própria, a estratégia de migração ou não migração de dados do ambiente legado
-->

# Estufa2 Constitution

## Core Principles

### I. Preservação do Comportamento Existente

O comportamento funcional existente é um contrato presumido do sistema. Nenhuma
funcionalidade existente pode ser alterada, removida ou reinterpretada sem um requisito
aprovado que descreva a mudança e seus impactos. A arquitetura atual deve ser preservada
até que uma mudança arquitetural seja formalmente especificada e aprovada. Refatorações
fora do escopo aprovado são proibidas, pois a continuidade operacional tem prioridade sobre
melhorias oportunistas.

### II. Integridade e Segurança dos Dados

Toda alteração deve preservar consistência, rastreabilidade e durabilidade dos dados. O
isolamento multi-tenant é obrigatório: leituras, escritas, sincronizações e consultas devem
respeitar o tenant e as permissões do usuário autenticado. Segredos, credenciais e dados
sensíveis não podem ser expostos no cliente, em logs ou em artefatos versionados. Nenhuma
alteração pode ser executada diretamente no banco de produção; migrações e mudanças de
schema exigem especificação, revisão, estratégia de rollback e autorização explícita.
Uma reconstrução em novo projeto Supabase deve preservar os contratos de segurança,
tenant, auditoria e integridade definidos para o produto, mesmo quando o banco legado não
for transportado integralmente.

### III. Offline-First e Resiliência Operacional

O aplicativo deve continuar útil dentro dos limites definidos para operação offline. Dados
locais, filas de sincronização, reprocessamento e resolução de conflitos devem ser tratados
de modo determinístico e sem perda silenciosa de dados. Falhas de rede, indisponibilidade
temporária do Supabase e reinicializações não podem corromper o estado local nem produzir
duplicidade não controlada. A reconciliação online deve respeitar as mesmas regras de
autorização e integridade aplicadas às operações online.

### IV. Qualidade Verificável

Código novo e alterações de comportamento devem ser acompanhados por evidências de teste
adequadas ao risco: testes unitários para lógica isolada, testes de integração para
fronteiras com Supabase, autenticação, persistência e sincronização, e testes de fluxo para
comportamentos críticos do aplicativo. Uma mudança não é considerada concluída sem testes
executados, resultados registrados e análise de regressão compatível com seu impacto.
Tipagem explícita, tratamento de erros, legibilidade e padrões consistentes de TypeScript
devem ser mantidos; complexidade adicional exige justificativa técnica.

### V. Evolução Incremental e Arquitetura Preservada

O projeto evolui por incrementos pequenos, reversíveis e orientados por evidências. Todo
trabalho deve seguir as etapas do Spec-Driven Development: especificação, esclarecimento,
planejamento, decomposição em tarefas, implementação e validação. Dependências só podem
ser alteradas com justificativa técnica, avaliação de impacto e autorização. A Harness
Engineering poderá ser adotada posteriormente, mas não substitui a especificação aprovada,
os gates de qualidade ou a responsabilidade de preservar contratos existentes.

### VI. Domínio Produtivo Exclusivo

O único domínio produtivo suportado pelo Estufa2 é a gestão de estufas agrícolas
convencionais. Funcionalidades exclusivas de cultivo a campo, talhões e hidroponia devem
ser retiradas do aplicativo somente por mudanças formalmente especificadas, aprovadas e
validadas. Plantios, colheitas, insumos, aplicações, manejos, vendas, recebimentos,
despesas, clientes, fornecedores, financeiro e relatórios necessários às estufas devem
ser preservados, assim como componentes compartilhados indispensáveis a esses fluxos. A
definição do domínio não autoriza exclusão automática de dados históricos nem alterações
destrutivas no banco.

### VII. Reconstrução Controlada da Persistência

Uma reconstrução do banco deve ser tratada como uma iniciativa de governança e produto,
com especificação, esclarecimento, plano, tarefas, implementação e validação próprios. O
novo projeto Supabase deve possuir uma baseline coerente com o domínio aprovado, enquanto
o ambiente legado permanece preservado, identificável e fora de alterações incidentais.
Nenhuma tabela, política RLS, função, índice, trigger ou relação pode ser incluída ou
omitida por suposição; cada elemento deve possuir justificativa no modelo aprovado. A
criação, configuração ou promoção de um novo ambiente exige validação local/staging,
evidência de segurança multi-tenant, testes de integração e autorização explícita para
qualquer cutover.

## Restrições Permanentes

- O código-fonte e a configuração existente não podem ser reescritos ou refatorados fora
  do escopo de um requisito aprovado.
- Operações destrutivas ou de reescrita de histórico, incluindo `git add`, `commit`, `push`,
  `reset`, `rebase` e equivalentes, não fazem parte do fluxo autorizado por esta
  Constituição.
- Alterações no banco de produção são proibidas. Ambientes de desenvolvimento e validação
  devem ser usados para testar migrações e mudanças de persistência.
- Dependências, versões de runtime e configuração de infraestrutura permanecem estáveis
  salvo autorização específica baseada em justificativa técnica.
- O princípio do menor privilégio aplica-se ao cliente, às políticas do Supabase, às
  funções de backend, aos dados locais e às ferramentas de desenvolvimento.
- O banco legado e o novo projeto Supabase são ambientes distintos; não se presume
  migração, equivalência ou descarte de dados sem decisão formal documentada.
- Uma baseline nova não autoriza apagar, reescrever ou compactar o histórico de migrations
  existente. O histórico legado deve permanecer disponível para auditoria e referência.
- Nenhum projeto Supabase novo pode ser promovido a ambiente de produção sem validação em
  ambiente não produtivo, evidências de rollback/cutover e aprovação explícita.
- A gestão de estufas agrícolas convencionais é o único domínio produtivo do produto;
  qualquer remoção de campo, talhões ou hidroponia exige especificação, aprovação e
  validação próprias, sem exclusão automática de dados históricos.

## Fluxo de Desenvolvimento e Gates de Qualidade

Cada mudança deve possuir uma especificação aprovada antes da implementação. A revisão
deve confirmar escopo, compatibilidade com o comportamento existente, impacto em dados e
segurança multi-tenant, comportamento offline, estratégia de testes e possibilidade de
reversão. A implementação deve permanecer limitada às tarefas derivadas da especificação.

Para a reconstrução da persistência, a especificação deve separar claramente: modelo
novo, compatibilidade exigida pela aplicação, dados que serão migrados, dados que ficarão
no legado, ambiente de validação e critérios de cutover. A ausência de uma decisão de
migração significa que nenhum dado deve ser copiado, transformado ou descartado.

Antes da integração, devem existir evidências dos testes relevantes e uma verificação de
que não houve alteração não autorizada em funcionalidades, dependências, schema ou
permissões. Falhas, limitações e riscos conhecidos devem ser documentados; não podem ser
ocultados por supressão de testes, logs ou validações. Mudanças sem requisito aprovado
devem ser adiadas, não incorporadas incidentalmente durante uma correção.

## Commit Workflow

Commits must be grouped by completed specification and task scope. `git add` and `git commit`
require explicit confirmation from the user before execution. Pending tasks must remain
identified and must not be reported as completed. Push, reset, rebase, and equivalent
history-rewriting operations remain unauthorized unless separately approved.

## Governance

Esta Constituição define os princípios superiores de engenharia do Estufa2 e prevalece
sobre práticas locais conflitantes. Uma emenda deve ser proposta como mudança de
governança, explicar a motivação, o impacto sobre princípios existentes e a estratégia de
adoção, e receber aprovação antes de ser aplicada. A revisão deve verificar se a nova
redação continua permanente, declarativa, testável e independente de uma funcionalidade
específica.

As versões seguem Semantic Versioning para governança: MAJOR para remoção ou redefinição
incompatível de princípios; MINOR para novos princípios ou expansão material de obrigações;
PATCH para correções editoriais e esclarecimentos sem mudança normativa. Toda emenda deve
atualizar a versão, a data da última alteração e o relatório de impacto no topo do arquivo.

Em cada revisão de especificação, plano, tarefas e implementação, os responsáveis devem
verificar conformidade com esta Constituição. Violações devem bloquear a mudança até serem
corrigidas ou formalmente tratadas por uma emenda aprovada. A conformidade não autoriza,
por si só, mudanças de escopo, de dependências, de schema ou de produção.

**Version**: 1.3.0 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10
