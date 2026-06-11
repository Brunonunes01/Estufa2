# Especificação Completa do App SGE (Sistema de Gestão Estratégica)

> **MANDATO DE DESIGN E INOVAÇÃO:** O objetivo deste projeto NÃO é replicar a interface atual. O sistema atual é funcional, mas a experiência do usuário (UX) e o visual (UI) precisam ser totalmente repensados. 
> 
> **Diretrizes para o Lovable.dev:**
> 1. **Inovação Total:** Crie layouts modernos, limpos e profissionais. Fuja do modelo "lista de formulários" padrão.
> 2. **Visualização de Dados:** Use gráficos, dashboards interativos e indicadores visuais de progresso (progress bars, status coloridos) em vez de apenas texto.
> 3. **Hierarquia de Informação:** Priorize o que o produtor precisa ver no campo (dados rápidos e botões grandes).
> 4. **Modernidade:** Utilize cards com sombras suaves, tipografia moderna, ícones consistentes e micro-interações que tragam vida ao app.
> 5. **UX Fluida:** Reduza o número de cliques para realizar ações comuns (como registrar uma venda ou leitura).

Este documento detalha as funcionalidades e a lógica de negócio que DEVEM ser preservadas, mas a forma como elas são apresentadas deve ser inovadora e superior.

---

## 1. Visão Geral e Arquitetura
O SGE é um sistema de gestão agrícola multicliente que suporta três modos principais de produção. O sistema possui sincronização offline e controle de acesso baseado em funções.

### Modos de Produção:
1.  **Hidroponia:** Focado em lotes de produção, ocupação de bancadas, leituras de pH/CE e controle de motores.
2.  **Campo:** Focado em talhões (áreas georreferenciadas com polígonos) e ciclos de plantio.
3.  **Ciclo Longo (Estufas):** Gestão tradicional baseada em estufas físicas e ciclos de plantio.

### Estrutura de Navegação (Tab Bar):
- **Início (Dashboard):** Centro de comando com indicadores e alertas.
- **Operação (Contextual):** Muda conforme o modo (Hidroponia, Campo ou Estufas).
- **Estoque:** Gestão de insumos e materiais.
- **Financeiro:** Gestão de vendas, despesas e fluxo de caixa.
- **Perfil:** Dados da propriedade, configurações e compartilhamento.

---

## 2. Tela: Dashboard (Centro de Comando)
A tela principal onde o produtor toma decisões.

### Componentes e Botões:
- **Seletor de Conta (Multi-tenant):** Botão/Chip para alternar entre propriedades (Minha vs Compartilhada).
- **HeroStats:** Cards de resumo rápido:
    - Total de Estufas/Talhões.
    - Ciclos Ativos.
    - Tarefas Pendentes para hoje.
- **Botão "Registrar Atividade do Dia" (Wizard):** Atalho para o fluxo passo-a-passo.
- **Banner de Status de Sincronização:** Indica se há dados pendentes para subir ou se está offline.
- **Lista de Tarefas de Hoje:** 
    - Card com descrição da tarefa.
    - Checkbox para concluir tarefa no local.
    - Botão "Ver todas as tarefas".
- **Lista de Alertas Críticos:**
    - Indica carências de insumos ou estufas sem ciclo ativo.
    - Botão "Ver Estufa" para ir direto ao detalhe.
- **Quick Actions (Grid de botões):**
    - **No Modo Hidroponia:** Nova Leitura pH/EC, Iniciar Produção, Vender Hidroponia, Nova Despesa, Motores, Movimentar Bancadas.
    - **No Modo Campo/Estufa:** Colher/Vender, Registrar Manejo, Nova Despesa, Contas a Receber, Tarefas.
- **Money Grid (Visão Financeira):**
    - Cards de: Total Recebido, Total a Receber, Total a Pagar.
- **Grade de Módulos (Menu):** Links rápidos para Relatórios, Vendas, Despesas, Insumos, Clientes, Fornecedores, Compartilhar e Ajustes.

---

## 3. Módulo: Hidroponia
Foco em produtividade por bancada e controle técnico.

### Telas e Funcionalidades:
- **Hub de Hidroponia (Lotes):** Lista de produções ativas com filtros por status e pesquisa.
- **Painel do Lote (Detalhe):**
    - Resumo: Bancadas ocupadas, Total de plantas, Saldo livre para venda.
    - **Botões de Ação:** 
        - Iniciar Produção (Mover plantas para nova bancada).
        - Registrar Venda.
        - Configurar Bancadas (Layout).
    - **Lista de Bancadas em Produção:** 
        - Cada card mostra Cultura, Variedade, Fase, Quantidade e Botões para "Movimentar" ou "Liberar/Colher".
    - **Histórico e Rastreabilidade:** Timeline de eventos (quando foi semeado, movido, etc.).
- **Layout da Estufa:** Representação visual (grid) das bancadas.
- **Motores:** Monitoramento de status (Ativo/Inativo) por setor.
- **Nova Leitura pH/EC:** Formulário para registrar pH, Condutividade Elétrica e Temperatura da solução.

---

## 4. Módulo: Campo e Estufas (Ciclo Longo)
Foco em áreas físicas e acompanhamento de ciclos de longa duração.

### Telas e Funcionalidades:
- **Talhões (Campo):** Lista de talhões com área (ha) e cultura.
    - **Formulário de Talhão:** Nome, Área, Tipo de Solo e **Desenho de Polígono no Mapa**.
- **Estufas (Legacy):** Lista de estufas físicas.
    - **Formulário de Estufa:** Nome, Dimensões (Comp x Larg x Alt), Tipo de Cobertura, Localização (GPS e Mapa Satélite), Status (Ativa/Manutenção/Desativada).
- **Painel do Ciclo (Plantio Detail):**
    - Card de Rentabilidade: Lucro Bruto, Receita Vendas (+), Custos Totais (-).
    - Selo de Rastreabilidade (Lote ID).
    - **Botões Principais:** Registrar Venda, Aplicar Insumo, Diário (Manejo).
    - **Links Secundários:** Editar Ciclo, Contas a Receber, Relatórios de Venda, Histórico Completo do Ciclo.

---

## 5. Módulo: Financeiro (Vendas e Despesas)
Gestão de entradas e saídas.

### Vendas:
- **Lista de Vendas:** Filtros avançados (Cliente, Perfil, Status Pago/Pendente, Data).
- **Métricas de Venda:** Recebido, A Receber, A Pagar, Saldo Atual, Saldo Projetado, Ticket Médio.
- **Ações de Venda:**
    - Botão **PDF:** Gera comprovante térmico/PDF da venda.
    - Botão **Exportar PDF/Excel:** Relatório gerencial completo ou contábil.
    - Botão **Compartilhar:** Envia resumo via WhatsApp.

### Despesas:
- **Formulário de Despesa:** Descrição, Valor, Categoria (Energia, Água, Mão de Obra, etc.), Status (Pago/Pendente), Data Vencimento, Saída de Caixa (Pessoa), Anexo de Comprovante (Foto/PDF).
- **Caixa:** Resumo de saldo por pessoa (operadores do caixa).

---

## 6. Módulo: Estoque (Insumos)
Controle de fertilizantes, defensivos e materiais.

- **Lista de Estoque:** Visualização de saldo atual, unidade e custo unitário.
- **Entrada de Estoque:** Fluxo para adicionar saldo, informando Fornecedor, Lote, Validade e Novo Custo (atualiza custo médio).
- **Aviso de Mínimo:** Alertas automáticos quando o estoque está baixo.

---

## 7. Cadastros e Configurações
- **Clientes:** Cadastro completo (Endereço, Documento, Contato).
- **Fornecedores:** Cadastro básico.
- **Compartilhar Acesso (Share Code):**
    - Geração de código para convidar outros usuários.
    - Permissões (Leitura, Escrita, Operador).
- **Ajustes:** Troca de tema (Dark/Light), Alterar modo de produção ativo, Dados do Perfil.

---

## 8. Assistente de Atividades (Wizard)
Um fluxo guiado para facilitar o registro de dados no campo.
- **Passo 1 (Seleção de Ciclo):** Lista todos os ciclos (Plantios/Lotes) ativos. O usuário clica no ciclo desejado.
- **Passo 2 (Escolha da Atividade):** Apresenta botões grandes para:
    - **Manejo:** Registro de clima, pragas ou observações.
    - **Aplicação:** Lançamento de defensivos ou fertilizantes.
    - **Colheita/Venda:** Registro de saída de produto.
    - **Despesa:** Lançamento financeiro atrelado ao ciclo.

---

## 9. Sistema de Rastreabilidade (Traceability)
Funcionalidade transversal que registra "quem fez o quê e quando".
- **Log de Eventos:** Toda criação, edição ou mudança de status gera um evento de rastreabilidade.
- **Token Público:** As vendas podem gerar um link/QR Code público onde o consumidor final vê o histórico do produto (desde a semeadura até a venda).
- **Auditoria:** Possibilidade de ver o histórico de alterações de um lote específico.

---

## 10. Botões e Componentes de Interface "Invisíveis" mas Essenciais:
- **FAB (Floating Action Button):** "Ações Rápidas" flutuante que abre um modal com os principais lançamentos.
- **Offline Banner:** Avisa quando o app está operando sem rede.
- **Botão Home (no Header):** Presente em quase todas as telas para volta rápida ao Dashboard.
- **Pull-to-refresh:** Implementado em todas as listas.
- **Squeleton Loading:** Para carregamento suave dos dados.

---

## Campos Obrigatórios nos Formulários (Resumo):
- **Plantio:** Cultura, Variedade, Data Início, Quantidade Inicial, Estufa/Talhão.
- **Venda:** Cliente (ou avulso), Itens (Quantidade x Valor), Forma de Pagamento, Status (Pago/Pendente).
- **Insumo:** Nome, Tipo, Unidade Padrão, Estoque Inicial.
- **Estufa:** Nome, Cidade, Latitude/Longitude (via Mapa).
