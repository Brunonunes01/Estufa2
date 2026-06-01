# Blueprint de Arquitetura UX/UI - SGE (ERP Agrícola e Hidroponia)

Este documento contém o mapeamento completo da nova arquitetura visual e de experiência do utilizador (UX/UI) para a aplicação SGE, transformando-a num SaaS Premium focado em produtividade no campo.

---

## 1. Diretrizes Globais de UX/UI (O Novo Padrão)
A aplicação deve ser otimizada para uso no campo, onde o tempo é escasso, a internet instável e a luz solar intensa.

* **Modo Alto Contraste (Sunlight Mode):** As cores precisam de ser muito nítidas. Evitar cinzento claro em fundo branco. O *Dark Mode* deve ser um preto real (AMOLED) para poupar bateria e aumentar a visibilidade sob o sol.
* **Bottom Sheets (Gavetas Inferiores):** Evitar abrir ecrãs inteiros para editar o estado de uma tarefa ou adicionar uma leitura de pH. Formulários rápidos devem subir da base do ecrã (*Bottom Sheet*), mantendo o contexto visual.
* **Indicador Offline-First:** No topo da aplicação, deve haver um pequeno ícone. Laranja ("A trabalhar Offline"), a girar ("A Sincronizar...") e verde (Sincronizado). Garante paz de espírito ao produtor.

---

## 2. A Nova Navegação (O Esqueleto da App)
A "Bottom Tab Bar" (Barra de Navegação Inferior) focada em ações e acesso rápido.

* **Barra Inferior (Apenas 4 abas e 1 Botão Central FAB):**
  1. `🏠 Início` (Dashboard / Central de Alertas)
  2. `💧 Hidroponia` (O mundo da água e ciclos curtos)
  3. `🌱 Campo` (O mundo das Estufas de Solo e ciclos longos)
  4. `💰 Financeiro` (Vendas e Despesas)
* **🔘 Botão Central (FAB - Floating Action Button):** O "Raio". Abre um menu rápido com as ações diárias mais comuns (Nova Leitura pH, Novo Maneio, Usar Insumo, Registar Venda, Nova Tarefa).
* **Menu Lateral (Drawer) ou Perfil:** Guarda o que não se usa todos os dias (Configurações, Relatórios, Clientes/Fornecedores, Partilha de Conta).

---

## 3. Mapeamento Ecrã a Ecrã

### Módulo 1: Onboarding e Setup (O "Efeito Uau")
* **Ecrã de Login/Registo:** Fundo com imagem de alta qualidade (com overlay escuro). Foco no login simplificado (One-tap login).
* **Wizard de Primeiro Acesso:** * *Passo 1:* "Qual é o seu foco principal?" (Hidroponia, Solo, Ambos).
  * *Passo 2:* "Vamos criar a sua primeira estrutura."
  * *Passo 3:* Sucesso e redirecionamento para o Dashboard.

### Módulo 2: Dashboard (Morning Briefing)
* **Header Pessoal:** Saudação com Widget de clima nativo integrado ("A previsão hoje é de 32°C ☀️. Atenção à rega.").
* **Foco do Dia (Cards de Alerta):** Só aparecem se houver problemas (Ex: "Falta de Leitura há 48h", "Mensalidades Atrasadas").
* **As Minhas Tarefas:** Checklists interativos no próprio ecrã inicial com gamificação (risca o texto e desaparece ao concluir).

### Módulo 3: O Mundo da Hidroponia (Linha de Montagem)
* **Painel Kanban (Lotes):** Três colunas (`Maternidade` -> `Berçário` -> `Bancada Final`). O produtor arrasta o lote entre as fases.
* **Leituras Visuais (pH/EC):** Medidores circulares (Gauges). Se o pH inserido for anómalo (ex: 7.5), a interface muda de cor (laranja/vermelho) e sugere uma ação corretiva.
* **Automação (Motores):** Visual "Smart Home". Cards grandes para cada bomba com interruptor (Liga/Desliga) e temporizador.

### Módulo 4: O Mundo do Campo/Solo (Ciclo Longo)
* **Prontuário da Estufa (Timeline):** Linha do tempo vertical mostrando a "idade" da planta e todos os maneios feitos desde o dia 1.
* **Ações de Maneio Frequente:** Bottom sheets com clique rápido para `Desbrota`, `Rega`, `Tutoramento`.
* **Colheita Contínua:** Ecrã estilo "Ponto de Venda" (PDV). Botões grandes de `+1 Caixa` para somar rapidamente a colheita do dia à medida que percorre a estufa.

### Módulo 5: Estoque e Insumos
* **Lista Inteligente:** Barras de progresso de inventário (vermelho se estiver abaixo do mínimo).
* **Scanner de Código de Barras:** O produtor utiliza a câmara para ler o frasco do insumo, a aplicação identifica o produto e ele apenas introduz a dose utilizada.

### Módulo 6: Financeiro e CRM
* **Separadores Gigantes:** `🤑 Entradas` e `💸 Saídas`.
* **Cobrança Ativa (WhatsApp):** Botão verde nativo nas contas a receber atrasadas. Abre o WhatsApp com texto pré-preenchido para o cliente.
* **Gráficos Visuais:** Gráficos circulares substituem as tabelas monótonas para mostrar a origem do lucro e o destino das despesas.

---

## 4. Regras de Design System (Para a Equipa Frontend)

1. **Empty States:** Se não existirem dados (ex: sem estufas), mostrar uma ilustração encorajadora ("A sua estufa está vazia. Vamos plantar a primeira semente?") com um *Call to Action* claro.
2. **Skeleton Loading:** Utilizar *SkeletonBlocks* (caixas cinzentas a piscar) durante o carregamento do Supabase, em vez de ícones de carregamento circulares infinitos (spinners).
3. **Sem Modais de Ecrã Inteiro:** Usar sempre gavetas deslizantes (`Bottom Sheets`) para pequenas inserções de dados.
