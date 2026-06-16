# Mapa completo do frontend + prioridades de UX do Estufa2

## Objetivo
Este documento serve para melhorar o frontend sem perder escopo funcional.

A regra principal aqui é:
- não redesenhar só telas bonitas
- não esquecer módulos críticos
- não simplificar removendo capacidade do sistema
- melhorar clareza, velocidade de uso e consistência visual preservando operação, financeiro, CRM, estoque, permissões e modos de produção

## Resumo executivo
O app já tem bastante escopo e não pode ser tratado como um frontend simples de poucas telas.

Hoje o frontend cobre:
- autenticação
- multi-tenant / troca de conta
- compartilhamento de acesso e perfis
- dashboard operacional
- operação por estufa
- operação por campo/talhão
- operação hidroponia
- estoque / insumos
- fornecedores
- clientes
- vendas
- contas a receber
- despesas
- caixa
- BI e relatórios
- perfil da propriedade
- configurações
- tarefas
- fluxos guiados (wizard)

Conclusão prática:
qualquer melhoria de UX precisa seguir inventário completo por módulo, ou o risco de esquecer cliente, financeiro, permissões, histórico, relatórios e fluxos especiais é alto.

---

## 1. Arquitetura geral da navegação

### Tabs principais
Pelo `MainTabsNavigator`:
- Início
- Operação
- Estoque
- Financeiro
- Perfil

### Modos de operação
Pelo `rootNavigatorConfig` e `AppStackNavigator`:
- `ciclo_longo`
- `campo`
- `hidroponia`

O tab “Operação” muda conforme o modo:
- ciclo_longo -> Estufas
- campo -> Campo
- hidroponia -> Hidroponia

### Ações rápidas globais
Existem quick actions diferentes por modo, incluindo:
- novo plantio
- novo manejo
- entrada de insumo
- registrar venda
- nova tarefa
- leitura pH/CE
- novo lote hidro
- novo talhão

Implicação de UX:
- o app já tem navegação contextual por modo
- melhorias visuais precisam respeitar variação por modo
- não dá para desenhar uma única home genérica sem considerar contexto operacional

---

## 2. Inventário completo de módulos e telas

## 2.1 Autenticação e acesso

### Telas
- Login
- Register
- ShareAccount

### Função no produto
- entrada no sistema
- criação de conta
- vinculação entre contas/estufas
- gestão de parceiros e membros
- geração e resgate de código de compartilhamento
- troca de perfil de acesso
- remoção de membros

### Risco de UX
Alto.
A tela `ShareAccountScreen.tsx` é muito grande e concentra fluxos sensíveis:
- gerar convite
- resgatar convite
- listar contas vinculadas
- listar membros da conta
- alterar perfil
- remover acesso

### Melhorias sugeridas
- separar claramente “Convidar”, “Entrar em outra conta” e “Gerenciar membros”
- destacar contexto atual da conta selecionada
- reduzir densidade visual
- explicitar perfis com linguagem mais simples: Proprietário, Gerente, Operador, Consulta
- usar cards/steps para convite em vez de bloco único
- melhorar busca e ações na lista de membros

---

## 2.2 Dashboard / Início

### Tela
- DashboardScreen

### Função no produto
- hub principal do sistema
- resumo financeiro
- alertas críticos
- tarefas do dia
- ações rápidas
- troca de tenant
- atalhos por modo

### O que aparece no código
- hero stats
- money grid
- alerts list
- today tasks
- quick actions
- module grid
- fluxos rápidos para colheita, manejo, layout hidro, motores, despesas, contas a receber, tarefas

### Risco de UX
Muito alto.
É a tela com maior chance de sobrecarga cognitiva porque mistura:
- status operacional
- status financeiro
- ações rápidas
- navegação
- alertas
- tarefas
- contexto por modo

### Melhorias sugeridas
- reduzir blocos simultâneos na primeira dobra
- priorizar 3 áreas: estado do dia, ações rápidas, riscos
- separar “navegação” de “ação operacional imediata”
- esconder informação secundária atrás de expand/collapse
- destacar alertas críticos antes de métricas frias
- reforçar leitura por papel/permissão

---

## 2.3 Perfil e propriedade

### Tela
- PerfilScreen

### Função no produto
- dados da propriedade
- responsável
- cidade/estado
- área
- geolocalização
- link para configurações
- link para compartilhamento
- ID de suporte

### Risco de UX
Médio.
A tela mistura:
- perfil da propriedade
- atalhos administrativos
- GPS
- ações de compartilhamento

### Melhorias sugeridas
- separar em blocos: Conta e acessos / Dados da propriedade / Geolocalização
- deixar CTA primário “Salvar dados” mais evidente
- melhorar leitura dos campos de localização
- reduzir aparência de formulário longo corrido

---

## 2.4 Configurações

### Tela
- SettingsScreen

### Função no produto
- dados básicos de conta
- segurança / troca de senha crítica
- notificações
- modo de produção
- sincronização offline
- preferências do sistema

### Risco de UX
Alto.
É uma tela administrativa com muitos assuntos diferentes.

### Melhorias sugeridas
- dividir por seções mais fortes:
  - Conta
  - Segurança
  - Notificações
  - Operação
  - Offline e sincronização
- deixar status offline/sync mais visível
- melhorar feedback de ações concluídas
- reduzir texto explicativo repetitivo

---

## 2.5 Operação por estufa

### Telas
- EstufasList
- EstufaForm
- EstufaDetail
- EstufaHistory

### Função no produto
- listar unidades de produção
- filtrar pelo contexto da ação
- criar/editar estufa
- detalhar status, saúde operacional e localização
- acessar histórico da unidade

### O que o código mostra
A lista já funciona também como seletor contextual para:
- colheita
- plantio
- manejo
- layout hidro

### Risco de UX
Alto.
A mesma tela muda de significado dependendo do fluxo. Isso é poderoso, mas pode confundir se a hierarquia visual não for clara.

### Melhorias sugeridas
- títulos/contexto sempre muito explícitos no topo
- CTA contextual mais óbvio por modo (“Selecionar para venda”, “Selecionar para manejo”, etc.)
- badges mais claros de saúde operacional
- separar melhor status da unidade, ciclo ativo e ações disponíveis

---

## 2.6 Campo

### Telas
- CampoHubScreen
- TalhoesListScreen

### Função no produto
- operar produção por talhão
- abrir novo plantio de campo
- navegar ciclos por talhão
- acessar manejo/aplicação/colheita via assistente ou atalhos

### O que o código mostra
- filtros por talhão
- ciclos ativos
- quick cards para novo plantio, assistente, colher/vender, talhões

### Risco de UX
Médio/alto.
Bom potencial, mas exige muita clareza para usuário entender a diferença entre:
- talhão
- ciclo
- atividade
- assistente

### Melhorias sugeridas
- deixar o fluxo principal mais óbvio: escolher talhão -> ver ciclos -> agir
- melhorar distinção visual entre área física e ciclo produtivo
- destacar quando o filtro está escondendo dados

---

## 2.7 Plantios

### Telas
- PlantioForm
- PlantioDetail
- PlantioHistory

### Função no produto
- iniciar/editar ciclo
- cadastrar lote, cultura, variedade, origem, quantidade, bandejas, mudas, custo, ciclo, perfis de caixa
- detalhar ciclo ativo
- histórico do ciclo
- cancelar/excluir com regra de permissão

### Risco de UX
Muito alto.
`PlantioFormScreen.tsx` é uma tela longa, com muitas regras e estados:
- criar vs editar
- estufa vs talhão
- quantidade e unidade
- perfis de caixa
- exclusão forte com senha
- cancelamento com preservação de histórico

### Melhorias sugeridas
- quebrar em seções visuais:
  1. Identificação do ciclo
  2. Produção
  3. Caixa / embalagem
  4. Planejamento
  5. Observações
- CTA fixo no rodapé
- resumo do lote no topo durante edição
- melhorar UX de exclusão/cancelamento
- usar componentes auxiliares para campos dependentes

---

## 2.8 Manejos e aplicações

### Telas
- ManejoForm
- ManejosHistory
- AplicacaoForm
- AplicacoesHistory
- WizardSelectPlantio
- WizardSelectActivity

### Função no produto
- registrar atividade agrícola
- acessar histórico por ciclo
- usar assistente para escolher ciclo e atividade

### Risco de UX
Médio/alto.
Esses fluxos dependem de contexto de plantio e podem ficar melhores com condução mais guiada.

### Melhorias sugeridas
- padronizar telas de registro de atividade
- reforçar cabeçalho contextual: lote, cultura, local, data
- melhorar assistente em formato step-by-step
- deixar histórico mais escaneável por data/tipo

---

## 2.9 Colheitas

### Tela
- ColheitaForm

### Função no produto
- registrar venda ligada ao ciclo/estufa
- editar venda quando necessário

### Risco de UX
Alto.
É fluxo crítico porque encosta no operacional e no financeiro.

### Melhorias sugeridas
- separar claramente bloco de produção x bloco financeiro
- destacar cliente, quantidade, unidade, valor, forma/status de pagamento
- validação mais explícita antes de salvar

---

## 2.10 Estoque / insumos

### Telas
- InsumosList
- InsumoForm
- InsumoEntry

### Função no produto
- gerenciar cadastro de insumos
- entrada de estoque
- operação de abastecimento do sistema

### Risco de UX
Médio.

### Melhorias sugeridas
- listas com filtros rápidos por categoria/status
- destaque para saldo e ação principal
- fluxo de entrada mais rápido e com menos atrito
- ações contextuais melhores por item

---

## 2.11 Fornecedores

### Telas
- FornecedoresList
- FornecedorForm

### Função no produto
- cadastro e manutenção de fornecedores

### Risco de UX
Médio.

### Melhorias sugeridas
- mesma linguagem visual de clientes
- padronizar campos e cards
- melhorar empty state e CTA

---

## 2.12 Clientes

### Telas
- ClientesList
- ClienteForm

### Função no produto
- CRM básico de clientes
- edição de contato
- tipo de relacionamento
- exportação de PDF de contas pagas/pendentes por cliente

### O que o código mostra
A lista de clientes não é só cadastro; ela também cruza vendas e gera relatório.

### Risco de UX
Alto.
É um módulo de CRM + financeiro leve.

### Melhorias sugeridas
- criar visual de cliente mais escaneável
- destacar ações principais: editar, ver histórico, gerar relatório
- reduzir peso de informação secundária no card
- considerar filtros por tipo e busca mais forte

---

## 2.13 Financeiro - núcleo comercial

### Telas
- VendasList
- ContasReceber
- DespesasList
- DespesaForm
- CaixaResumo
- CaixaExtrato

### Função no produto
- listar vendas
- buscar, filtrar, exportar, compartilhar
- cruzar clientes, estufas, talhões, plantios, caixa e despesas
- acompanhar recebíveis
- registrar despesas
- ver caixa consolidado e extrato

### O que o código mostra
`VendasListScreen.tsx` é um dos maiores hotspots do frontend. Ele concentra:
- busca textual
- filtros
- período
- status financeiro
- relatórios
- exportação
- cruzamento de múltiplas entidades
- origem campo/estufa/hidroponia

### Risco de UX
Muito alto.
Esse é um dos pontos mais importantes do sistema para reorganizar.

### Melhorias sugeridas
- quebrar a tela em blocos claros:
  - resumo
  - busca e filtros
  - lista
  - ações de relatório
- diminuir densidade dos cards
- deixar status financeiro muito visível
- simplificar modal de filtros
- padronizar linguagem entre vendas, receber, caixa e despesas
- considerar tabs internas no financeiro

---

## 2.14 BI e relatórios

### Telas
- Relatorios
- RelatorioOperacional
- EstufaPerformance
- CaixasPesoCiclo

### Função no produto
- visão analítica e exportável
- leitura de receita, despesa, lucro, margem, categorias, top vendas, performance

### Risco de UX
Alto.
Relatórios costumam virar telas densas e pouco escaneáveis.

### Melhorias sugeridas
- trabalhar hierarquia visual forte para indicadores
- resumir topo com highlights executivos
- esconder detalhes longos atrás de seções expansíveis
- melhorar escolha de período
- tornar exportação mais visível, porém não dominante

---

## 2.15 Tarefas

### Tela
- TarefasScreen

### Função no produto
- acompanhar e registrar tarefas agrícolas

### Risco de UX
Médio.

### Melhorias sugeridas
- destacar tarefa do dia
- melhorar estados por status/prioridade
- CTA rápido para concluir/atualizar

---

## 2.16 Hidroponia

### Telas
- HidroponiaLotes
- HidroponiaEstufaLayout
- HidroponiaMotores
- HidroponiaLoteForm
- HidroponiaLoteDetail
- HidroponiaMovimentarLote
- HidroponiaLeituraForm
- HidroponiaColheitaForm
- HidroponiaVerduras
- HidroponiaVendaForm

### Função no produto
- operação hidroponia completa
- lotes/produções
- layout da estufa
- motores
- leituras pH/CE
- movimentação entre estruturas/setores
- colheita e venda
- cadastro de verduras

### O que o código mostra
`HidroponiaLotesScreen.tsx` já funciona como mini-hub de módulo com:
- resumo
- filtros por status
- links para verduras, leitura, layout, motores e financeiro

### Risco de UX
Muito alto.
É praticamente um subproduto dentro do app, com suas próprias telas e lógica.

### Melhorias sugeridas
- tratar hidroponia como domínio próprio com design consistente entre telas
- usar navegação interna mais clara entre Lotes / Layout / Motores / Leituras / Financeiro
- melhorar nomenclatura operacional para usuário leigo
- reduzir exposição de IDs técnicos em cards quando possível

---

## 3. Regras transversais que NÃO podem ser esquecidas

## 3.1 Multi-tenant
O app trabalha com conta selecionada / tenant selecionado.
Qualquer melhoria precisa mostrar claramente:
- em qual conta o usuário está
- quando ele trocou de contexto
- a quem pertencem os dados exibidos

## 3.2 Permissões e papéis
Existem diferenças reais entre:
- owner / proprietário
- manager / gerente
- operator / operador
- viewer / consulta

O frontend deve:
- esconder o que não faz sentido
- desabilitar o que for visível porém restrito
- explicar o bloqueio em linguagem simples
- não exibir CTA enganoso para ação que o usuário não pode concluir

## 3.3 Offline e sincronização
O sistema tem fila offline/sync.
Isso precisa aparecer melhor na UX, especialmente em:
- configurações
- formulários
- feedback pós-salvamento

## 3.4 Modos de produção
A UI muda conforme:
- ciclo longo
- campo
- hidroponia

A melhoria não pode padronizar tudo de forma cega. Cada modo precisa manter sua operação principal claramente acessível.

## 3.5 Histórico e segurança
Algumas ações não são só CRUD simples.
Exemplos:
- cancelar lote mantendo histórico
- excluir com senha crítica
- alterar acesso de parceiros

Esses fluxos precisam de UX clara e segura.

---

## 4. Hotspots de UX mais críticos

### Prioridade 1 — crítica
1. DashboardScreen
2. VendasListScreen
3. ShareAccountScreen
4. PlantioFormScreen
5. RelatoriosScreen

### Prioridade 2 — muito importante
6. SettingsScreen
7. EstufasListScreen
8. ColheitaFormScreen
9. ClientesListScreen
10. HidroponiaLotesScreen

### Prioridade 3 — importante
11. PerfilScreen
12. CampoHubScreen
13. Despesas / Caixa / ContasReceber
14. Estoque / Insumos
15. Fornecedores
16. Tarefas

---

## 5. Estratégia recomendada de melhoria

## Fase 1 — sistema visual e componentes base
Antes de refazer telas individualmente, padronizar:
- títulos e subtítulos
- cards
- CTAs principais/secundários
- chips e badges
- campos de formulário
- headers de lista
- empty/loading/error states
- barras de ação fixa
- seções expansíveis

## Fase 2 — padrões reutilizáveis por tipo de tela
Criar padrões para:
- lista com busca/filtro/ações
- formulário longo dividido em seções
- detalhe com resumo + ações
- histórico/timeline
- dashboard com prioridade visual
- relatórios com highlights + detalhes

## Fase 3 — implementação por módulo
Ordem sugerida:
1. Dashboard
2. Financeiro (Vendas, Contas a Receber, Despesas, Caixa)
3. Compartilhamento e permissões
4. Plantios / Colheitas / Manejos / Aplicações
5. Clientes
6. Estufas / Campo
7. Hidroponia
8. Perfil / Configurações / suporte
9. Estoque / fornecedores / tarefas

---

## 6. Backlog de melhorias objetivas por domínio

## Dashboard
- reduzir número de cards acima da dobra
- reorganizar ações rápidas
- destacar alertas críticos
- melhorar leitura de métricas financeiras
- separar navegação de ação operacional

## Compartilhamento / acesso
- dividir em subtelas/blocos claros
- reforçar conta atual
- simplificar convites e perfis
- melhorar gestão de membros

## Plantios / formulários longos
- wizard leve ou seções colapsáveis
- resumo fixo do lote
- CTA persistente
- validação inline
- confirmação clara de ações destrutivas

## Financeiro
- simplificar filtros
- padronizar cards/resumos
- fortalecer status financeiro visual
- melhorar export/report UX
- separar resumo x detalhamento

## Clientes
- busca e segmentação melhores
- card menos carregado
- ação de relatório mais clara
- preparar espaço para histórico financeiro do cliente

## Estufas / Campo / Hidroponia
- reforçar contexto operacional
- diferenciar local físico de ciclo/lote
- melhorar seletor contextual de ação
- tornar saúde/status mais rápidos de ler

## Configurações / Perfil
- reorganizar seções
- reduzir densidade
- destacar sync/offline
- mostrar papel/permissão com mais clareza

---

## 7. O que NÃO fazer
- não apagar módulos para “simplificar”
- não esconder financeiro dentro de telas genéricas
- não misturar cliente com venda sem hierarquia
- não tratar hidroponia como simples extensão visual de estufa comum
- não redesenhar dashboard sem respeitar modos de produção
- não remover sinais de permissão/segurança

---

## 8. Próximo passo recomendado
Próximo passo ideal:
1. criar um mini design system para o app
2. redesenhar primeiro os 5 hotspots críticos
3. aplicar padrões nos demais módulos sem perder regra de negócio

## Sugestão prática de execução
Sprint 1:
- Dashboard
- Vendas
- ShareAccount

Sprint 2:
- PlantioForm
- Relatorios
- Settings

Sprint 3:
- Clientes
- Estufas / Campo
- Hidroponia hub

---

## Conclusão
Sim, dá para melhorar bastante o front para facilitar o uso.

Mas a forma correta é fazer isso com mapa completo do sistema, porque o app já tem escopo de produto real e não só de app simples.

Este documento é a base para melhorar UX sem esquecer:
- clientes
- estoque
- fornecedores
- estufas
- plantios
- campo
- hidroponia
- vendas
- contas a receber
- despesas
- caixa
- relatórios
- permissões
- offline
- perfil e configuração
