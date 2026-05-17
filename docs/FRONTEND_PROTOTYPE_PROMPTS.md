# Prompts para Prototipo Frontend - SGE Estufas

## Contexto do Produto

O app e um SGE mobile-first para produtores em estufas. Ele organiza operacao agricola, estoque, vendas, contas a receber, despesas, tarefas e relatorios. O usuario principal e o gestor/produtor; usuarios secundarios podem ser operadores com acesso compartilhado.

O prototipo deve parecer um aplicativo de trabalho diario no campo: rapido, objetivo, confiavel e facil de usar em celular. Priorize telas densas, escaneaveis e acionaveis. Evite landing page, hero decorativo ou composicao de marketing.

Stack atual usada como referencia: React Native/Expo, React Native Paper, MaterialCommunityIcons, Firebase, React Navigation. O prototipo pode ser web/mobile, mas deve manter experiencia de app.

## Direcao Visual Global

Use um visual agricola profissional, limpo e operacional.

- Mobile-first, largura ideal de 390 a 500 px; em desktop centralizar o app em um frame de ate 500 px.
- Fundo claro neutro, superficies brancas, texto escuro e verdes como cor de acao principal.
- Paleta sugerida: verde principal, verde escuro para cabecalhos, azul para informacao/manejo, laranja para alertas/tarefas, vermelho para despesas/risco, cinza para textos secundarios.
- Tipografia forte nos titulos e numeros; cards com informacao objetiva.
- Use icones Material Community ou Lucide equivalentes: greenhouse, basket, cash-minus, hand-coin, flask, sprout, calendar-check, account-group, truck, chart-box, cog.
- Cards com raio moderado, borda sutil, sombra leve. Evite cards aninhados demais.
- Todas as telas devem ter estados: carregando, vazio, erro simples e acao principal clara.
- Navegacao: topo com titulo central e botao home nas telas internas; Dashboard sem header padrao, com cabecalho proprio.
- Incluir banner offline no topo quando sem conexao: "Sem conexao. Trabalhando offline. Os dados serao sincronizados quando a internet voltar."

## Arquitetura de Navegacao

Rotas principais:

- Auth: Login, Cadastro.
- Dashboard: centro de comando.
- Perfil/Minha Propriedade e Configuracoes.
- Compartilhar Acesso.
- Estufas: lista, cadastro/edicao, detalhe hub, historico.
- Plantios: novo/editar ciclo, detalhe do ciclo, historico do ciclo.
- Atividades: manejo, aplicacao, colheita/venda, tarefas.
- Comercial/financeiro: vendas, contas a receber, despesas, relatorios, relatorio operacional.
- Cadastros auxiliares: insumos, entrada de estoque, clientes, fornecedores.
- Wizard: selecionar ciclo, escolher atividade do dia.

## Prompt Mestre

Use este prompt antes de pedir qualquer tela isolada:

```text
Crie um prototipo mobile-first de um app chamado SGE Estufas, um sistema de gestao de estufas para produtores rurais. A interface deve ser profissional, operacional e rapida de usar em campo, com largura de app mobile, cabecalhos compactos, cards de metricas, listas escaneaveis, botoes de acao claros e icones.

O app gerencia estufas, ciclos de plantio, manejos, aplicacoes de insumos, colheitas/vendas, contas a receber, despesas, estoque de insumos, clientes, fornecedores, tarefas agricolas e relatorios. Use portugues do Brasil.

Estilo visual: fundo claro, cards brancos com borda sutil, verde como cor principal, verde escuro para cabecalhos, azul para manejo/informacao, laranja para alertas/tarefas, vermelho para despesas/risco. Use tipografia forte para numeros e titulos. Nao crie landing page. A primeira tela autenticada deve ser o Dashboard operacional.

Inclua componentes reutilizaveis: ScreenHeaderCard, MetricCard, EmptyState, LoadingButton, chips de status, cards de acao rapida, listas com filtros, formulario em secoes, FAB de novo cadastro e banner offline no topo.
```

## Tela 1 - Login

```text
Crie a tela de Login do SGE Estufas.

Layout mobile. Fundo claro. No topo, icone de estufa grande, nome "SGE Estufas" e subtitulo curto "Gestao inteligente da sua producao". Em seguida um card de login com campos: email, senha, botao "Entrar" e link "Criar conta".

Campos:
- Email com placeholder "exemplo@email.com".
- Senha com placeholder "Sua senha secreta".

Estados:
- Botao mostra loading ao entrar.
- Erro em alerta/toast: "Email ou senha invalidos".

Use visual confiavel, agricola e simples. Nao usar ilustracao de marketing.
```

## Tela 2 - Cadastro

```text
Crie a tela de Cadastro do SGE Estufas.

Formulario em card central com titulo "Criar conta". Campos: nome, email, senha. Botao principal "Cadastrar". Link secundario "Fazer Login".

Campos:
- Nome: placeholder "O seu nome".
- Email: placeholder "exemplo@dominio.com".
- Senha: placeholder "Minimo 6 caracteres".

Apos cadastro, o usuario entra no app. Mantenha estilo igual ao Login.
```

## Tela 3 - Dashboard / Centro de Comando

```text
Crie a tela principal autenticada "Centro de Comando" do SGE Estufas.

Esta e a tela mais importante. Deve ser um painel operacional mobile, nao uma landing page.

Cabecalho:
- Fundo verde escuro.
- Titulo "Centro de Comando".
- Saudacao "Ola, Gestor".
- Badge de perfil: "Administrador" ou "Operador".
- Botao pequeno "Estufas" com icone greenhouse.
- Linha de hero stats: Estufas, Ciclos ativos, Tarefas hoje.

Conteudo:
- Se houver mais de uma conta/propriedade, mostrar secao "Conta Ativa" com chips selecionaveis.
- Botao grande verde "Registrar Atividade do Dia" com icone magic-staff.
- Banner informativo de sincronizacao: "Resumo centralizado: 28/04/2026" ou "Resumo em agregacao local".
- Card "Tarefas de Hoje" com lista curta e botao para concluir.
- Card "Alertas" com itens criticos: carencia de defensivo, estoque baixo, tarefa atrasada.
- Secao "Acoes Rapidas" em grid 2 colunas:
  - Colher / Vender
  - Registrar Manejo
  - Nova Despesa
  - Contas a Receber
  - Tarefas
  - Estufas
- Para admin, mostrar grid financeiro:
  - Total a receber
  - Total recebido
  - Total a pagar
- Secao "Modulos" em grid 2 colunas:
  - Relatorios, Vendas, Despesas, Insumos, Clientes, Fornecedores, Compartilhar, Tarefas, Ajustes.

Cada item deve ter icone, cor semantica e toque facil. Priorize leitura rapida.
```

## Tela 4 - Lista de Estufas

```text
Crie a tela "Hubs de Estufa".

Cabecalho com titulo "Hubs de Estufa", subtitulo "Monitore status, ciclo e venda por unidade com um toque" e botao "Nova" com icone plus/greenhouse.

Lista de cards de estufa. Cada card deve mostrar:
- Nome da estufa.
- Status badge: ATIVA, PARADA, MANUTENCAO.
- Local/cidade/propriedade quando existir.
- Area util em m2.
- Quantidade de plantios ativos.
- Cultura principal do ciclo atual ou "Sem ciclos ativos".
- Acoes: "Abrir Hub", "Ciclo" ou "Novo Ciclo", "Vender".

Estados:
- Empty state: "Nenhuma estufa cadastrada" com botao "Cadastrar estufa".
- Modo especial quando veio de acao rapida: se mode=colheita, o card deve chamar "Selecionar para venda"; se mode=manejo, "Selecionar para manejo".
```

## Tela 5 - Cadastro/Edicao de Estufa

```text
Crie a tela "Cadastro da Estufa".

Formulario em secoes com visual mobile.

Secao Identificacao:
- Nome da estufa, placeholder "Ex: Estufa 01".
- Status em controle segmentado: Ativa, Manutencao, Desativada.
- Data de inicio da operacao.

Secao Estrutura:
- Comprimento (m), placeholder "Ex: 50".
- Largura (m), placeholder "Ex: 8".
- Altura (m), placeholder "Ex: 3".
- Area calculada/area util.
- Tipo de cobertura, placeholder "Ex: Filme difusor, Sombrite".

Secao Localizacao:
- Propriedade, placeholder "Ex: Sitio Sao Joao".
- Cidade/UF, placeholder "Ex: Jales - SP".
- Latitude e Longitude.
- Botao "Usar minha localizacao".
- Botao "Marcar no mapa".

Secao Responsavel:
- Responsavel, placeholder "Nome do responsavel".
- Observacoes, placeholder "Detalhes adicionais sobre a estufa...".

Rodape fixo ou botao final:
- Botao principal "Salvar Estufa".
- Em edicao, botao perigoso "Excluir Estufa" protegido por modal de senha de administrador.
```

## Tela 6 - Detalhe da Estufa / Hub

```text
Crie a tela "Detalhes da Estufa" como um hub operacional.

Topo:
- Nome da estufa.
- Badge de status com ponto colorido.
- Botao editar.
- Endereco/localidade.
- Botao compartilhar localizacao quando houver coordenadas.

Metricas:
- Area util.
- Ciclos totais.
- Ciclos finalizados.

Secao "Atalhos do Hub":
- Ciclo Atual / Novo Ciclo.
- Registrar Venda.
- Aplicacao.
- Diario de Manejo.
- Vendas.
- Contas a Receber.

Secao "Ciclo Atual":
- Se houver plantio ativo: cultura, variedade, lote, data de plantio, status, custo acumulado/previsao.
- Botao "Abrir Ciclo".
- Se nao houver: empty state com botao "Criar Plantio".

Secao "Historico de Ciclos":
- Card/link para abrir historico completo.

Inclua modal de senha admin para exclusoes criticas, caso representado no prototipo.
```

## Tela 7 - Novo Plantio / Ciclo

```text
Crie a tela "Novo Plantio" ou "Editar Plantio".

Formulario para criar ciclo produtivo dentro de uma estufa.

Campos:
- Estufa selecionada.
- Cultura, placeholder "Ex: Tomate".
- Variedade, placeholder "Ex: Italiano".
- Origem da semente/muda, placeholder "Ex: Viveiro X, Lote Fornecedor Y".
- Quantidade plantada, placeholder "Ex: 500".
- Unidade da quantidade: Mudas, Sementes, Bandejas, Gramas, Kg.
- Se unidade for Bandejas, mostrar campos: quantidade de bandejas e mudas por bandeja (128, 200, 288).
- Preco estimado por unidade/muda/bandeja, placeholder "Ex: 1,50".
- Ciclo estimado em dias, placeholder "Ex: 90".
- Data de plantio.
- Observacoes, placeholder "Condicoes climaticas no dia, tipo de adubacao de base...".

Mostrar resumo calculado:
- Quantidade total.
- Custo inicial estimado.
- Previsao de colheita.

Botao principal "Salvar Ciclo". Em edicao, permitir cancelar/finalizar ciclo conforme status.
```

## Tela 8 - Painel do Ciclo / Detalhe do Plantio

```text
Crie a tela "Painel do Ciclo".

Topo:
- Cultura e variedade.
- Lote/codigo.
- Status: Em andamento, Em colheita, Finalizado, Cancelado.
- Estufa vinculada.

Metricas:
- Dias de ciclo.
- Quantidade plantada.
- Custo acumulado.
- Receita/vendas.
- Saldo estimado.

Acoes principais:
- Registrar Manejo.
- Aplicar Insumo.
- Registrar Colheita/Venda.
- Ver Historico.

Conteudo:
- Linha do tempo resumida com ultimos eventos: plantio criado, manejo, aplicacao, colheita, venda, tarefa.
- Alertas do ciclo: carencia, tarefas pendentes, estoque baixo relacionado.

Se ciclo estiver finalizado/cancelado, bloquear novas vendas e aplicacoes com aviso claro.
```

## Tela 9 - Wizard Atividade do Dia

```text
Crie o fluxo "Registrar Atividade do Dia" em duas etapas.

Etapa 1: Selecionar Ciclo
- Lista de ciclos ativos.
- Cada card mostra cultura, variedade, lote, estufa, status e data de plantio.
- Busca/filtro opcional por cultura ou estufa.
- Ao selecionar, avanca para etapa 2.

Etapa 2: Escolher Atividade
- Header "Ciclo Selecionado" com cultura e lote.
- Subtitulo "O que voce deseja registrar para este ciclo?"
- Grid 2 colunas com cards grandes:
  - Manejo, icone notebook-edit, azul.
  - Aplicacao, icone flask, verde escuro.
  - Colheita / Venda, icone basket, verde.
  - Despesa, icone cash-minus, vermelho.
```

## Tela 10 - Registro de Manejo

```text
Crie a tela "Registro de Manejo".

Topo:
- Plantio selecionado.
- Data do registro.

Tipo de manejo em pills:
- Clima.
- Praga/Doenca.
- Outro.

Campos comuns:
- Descricao do manejo.
- Responsavel.

Se tipo for Clima:
- Temperatura.
- Umidade.

Se tipo for Praga/Doenca:
- Severidade: baixa, media, alta.
- Campo para descricao do problema.

Botao principal "Salvar Manejo".
```

## Tela 11 - Historico de Manejos

```text
Crie a tela "Diario de Manejo".

Lista cronologica de manejos de um plantio.
Cada item deve mostrar:
- Icone por tipo.
- Tipo: CLIMA, PRAGA/DOENCA, OUTRO.
- Data.
- Descricao.
- Responsavel.
- Temperatura/umidade quando houver.
- Severidade com cor quando houver.

Adicionar filtros por tipo e empty state "Nenhum manejo registrado".
```

## Tela 12 - Aplicacao de Insumos

```text
Crie a tela "Aplicacao".

Formulario operacional para registrar defensivo ou fertilizacao.

Topo:
- Plantio selecionado.
- Tipo em cards/pills:
  - Defensivo Fitossanitario, icone shield-bug.
  - Fertilizacao / Nutricao, icone sprout.

Campos:
- Plantio/ciclo.
- Numero de tanques, placeholder "Ex: 1".
- Volume por tanque, placeholder "Opcional".
- Produto/Insumo em picker com estoque atual.
- Dose por tanque, placeholder "0.00".
- Unidade do insumo visivel.
- Botao "Adicionar Produto".

Mostrar mistura/lista de itens adicionados:
- Nome do insumo.
- Dose por tanque.
- Quantidade aplicada.
- Unidade.
- Custo estimado.
- Acao remover.

Alertas:
- Se estoque insuficiente, mostrar aviso vermelho.
- Se defensivo tem dias de carencia, mostrar data fim de carencia.

Botao principal "Salvar Aplicacao".
```

## Tela 13 - Historico de Aplicacoes

```text
Crie a tela "Historico de Aplicacoes".

Lista por data, cada card com:
- Tipo de aplicacao: defensivo ou fertilizacao.
- Data.
- Metodo/volume/tanques.
- Produtos aplicados com quantidade e unidade.
- Custo calculado.
- Status de seguranca: Em carencia ou Liberado.

Filtros: todos, defensivos, fertilizacao, em carencia.
```

## Tela 14 - Colheita / Registrar Venda

```text
Crie a tela "Registrar Venda".

Esta tela registra colheita e venda no mesmo fluxo.

Campos:
- Plantio/ciclo.
- Cliente.
- Data da venda/colheita.
- Quantidade.
- Unidade: kg, caixa, unidade, maco.
- Se unidade for caixa, mostrar peso bruto e peso liquido.
- Preco unitario.
- Valor total calculado em destaque.
- Forma de pagamento: Pix, Dinheiro, Cartao, Boleto, Transferencia, Prazo, Outro.
- Status de pagamento: Pago, Pendente.
- Data de vencimento se pagamento for pendente/prazo.
- Observacoes.

Mostrar resumo:
- Quantidade x preco.
- Preco por kg quando unidade for caixa e peso liquido existir.
- Cliente e lote.

Botao principal "Salvar Venda".
Em edicao, titulo deve indicar "Editar Venda".
```

## Tela 15 - Vendas

```text
Crie a tela "Relatorios de Vendas".

Cabecalho:
- Titulo "Vendas".
- Subtitulo "Painel gerencial com status de recebimento, saldo e exportacao profissional em PDF."
- Botao "Nova Venda".

Metricas:
- Total vendido.
- Total recebido.
- Total pendente.
- Quantidade de vendas.

Filtros:
- Todos, Pago, Pendente.
- Periodo/mes.
- Busca por cliente/cultura.

Lista:
- Cliente ou "Venda sem cliente".
- Cultura/lote.
- Data.
- Quantidade e unidade.
- Valor unitario e total.
- Metodo de pagamento.
- Badge PAGO/PENDENTE.
- Acoes: editar, exportar/recibo, abrir ciclo.

Botao para exportar PDF.
```

## Tela 16 - Contas a Receber

```text
Crie a tela "Contas a Receber".

Cabecalho:
- Titulo "Contas a Receber".
- Subtitulo "Acompanhe pendencias, priorize cobrancas e registre baixa de pagamentos."

Metricas:
- Total pendente.
- Ticket medio.
- Quantidade de contas.

Lista de contas:
- Cliente.
- Data de vencimento.
- Dias de atraso quando vencido.
- Venda/cultura/lote.
- Quantidade x valor unitario.
- Valor total.
- Metodo de pagamento.
- Badge: Pendente, Atrasado.

Acao principal em cada item:
- "Registrar Recebimento".

Modal de baixa:
- Forma de pagamento: Pix, Dinheiro, Cartao, Boleto, Cheque, Outro.
- Botao "Confirmar baixa".
- Link "Editar venda".

Empty state: "Nenhuma conta pendente".
```

## Tela 17 - Despesas

```text
Crie a tela "Despesas".

Cabecalho com titulo, subtitulo e botao "Nova".

Metricas:
- Total no periodo.
- Pendentes.
- Pagas.

Filtros:
- Mes/periodo.
- Status: todas, pagas, pendentes.
- Categoria.

Lista de despesas:
- Icone por categoria.
- Descricao.
- Categoria.
- Valor.
- Data da despesa.
- Vencimento se pendente.
- Badge Pago/Pendente.
- Acoes editar/excluir.

Empty state "Nenhuma despesa lancada".
```

## Tela 18 - Lancar Despesa

```text
Crie a tela "Lancar Despesa".

Formulario:
- Descricao, placeholder "Ex: Conta de Luz".
- Valor, placeholder "0,00".
- Categoria: Energia Eletrica, Mao de Obra / Diaria, Manutencao, Combustivel / Frete, Agua, Impostos, Outros.
- Status: Ja Paguei, Pendente (Conta a Pagar).
- Data da despesa.
- Se status pendente, Data de vencimento.
- Observacoes, placeholder "Detalhes...".
- Opcional: vincular a uma estufa ou ciclo.

Botao "Salvar Despesa".
```

## Tela 19 - Estoque de Insumos

```text
Crie a tela "Estoque de Insumos".

Cabecalho com titulo, subtitulo e botoes "Novo Insumo" e "Entrada".

Metricas:
- Total de itens.
- Itens abaixo do minimo.
- Valor em estoque.

Lista de insumos:
- Nome.
- Tipo/categoria: fertilizante, defensivo, biologico, substrato, outro.
- Fabricante.
- Estoque atual + unidade.
- Estoque minimo recomendado.
- Custo unitario.
- Lote e validade quando houver.
- Badge "Baixo estoque" quando estoqueAtual <= estoqueMinimo.
- Acoes: editar, registrar entrada.

Filtros por categoria e busca.
```

## Tela 20 - Cadastro de Insumo

```text
Crie a tela "Cadastro de Insumo".

Campos:
- Nome.
- Fabricante.
- Categoria: fertilizante, defensivo, biologico, substrato, outro.
- Tipo.
- Unidade: kg, L, un, g, ml.
- Estoque atual.
- Estoque minimo.
- Custo unitario.
- Lote.
- Data de validade.
- Dias de carencia.
- Registro MAPA.

Botao "Salvar Insumo".
```

## Tela 21 - Entrada de Estoque

```text
Crie a tela "Entrada de Estoque".

Formulario:
- Selecionar insumo com estoque atual no label.
- Quantidade comprada, placeholder "Ex: 50 kg".
- Custo unitario da compra, placeholder "Custo por kg/L/un".
- Fornecedor opcional.
- Data da entrada.

Mostrar preview antes de salvar:
- Estoque atual.
- Entrada.
- Estoque apos.
- Custo medio ponderado atualizado.

Botao "Registrar Entrada".
```

## Tela 22 - Clientes

```text
Crie a tela "Clientes".

Cabecalho:
- Titulo "Clientes".
- Subtitulo "Gerencie carteira, contatos e tipo de relacionamento."
- Botao "Novo".

Lista:
- Nome.
- Tipo de relacionamento.
- Cidade/UF.
- Telefone.
- Email.
- Documento.
- Responsavel.
- Ultima venda ou valor em aberto se quiser simular.
- Acoes: editar, ver vendas.

Empty state: "Nenhum cliente cadastrado".
FAB para novo cliente.
```

## Tela 23 - Cadastro de Cliente

```text
Crie a tela "Cadastro de Cliente".

Formulario em secoes:
- Dados: nome, tipo, documento, contato responsavel.
- Contato: telefone, email.
- Endereco: CEP, endereco, numero, bairro, cidade, estado, complemento.
- Observacoes.

Botao "Salvar Cliente".
```

## Tela 24 - Fornecedores

```text
Crie a tela "Fornecedores".

Cabecalho com titulo, subtitulo e botao "Novo".

Lista:
- Nome.
- Categoria.
- Contato.
- Telefone.
- Email.
- Observacoes resumidas.
- Acoes editar.

Empty state "Nenhum fornecedor cadastrado".
```

## Tela 25 - Cadastro de Fornecedor

```text
Crie a tela "Cadastro de Fornecedor".

Campos:
- Nome.
- Categoria.
- Contato.
- Telefone.
- Email.
- Observacoes.

Botao "Salvar Fornecedor".
```

## Tela 26 - Tarefas Agricolas

```text
Crie a tela "Tarefas Agricolas".

Topo:
- Titulo "Tarefas Agricolas".
- Botao "Nova Tarefa".

Filtros:
- Data: Hoje, Atrasadas, Proximos 7 dias, Todas.
- Plantio: todos os plantios ou um plantio especifico.
- Prioridade: todas, baixa, media, alta, critica.

Formulario/modal de nova tarefa:
- Plantio.
- Tipo: Irrigacao, Adubacao, Manejo, Colheita, Inspecao, Outro.
- Prioridade: Baixa, Media, Alta, Critica.
- Data prevista.
- Status inicial: Pendente ou Em andamento.
- Observacoes, placeholder "Ex: revisar irrigacao da estufa 2".

Lista:
- Tipo da tarefa.
- Plantio/cultura.
- Data prevista.
- Prioridade colorida.
- Status.
- Observacoes.
- Acoes: iniciar, concluir, cancelar, excluir, abrir plantio.

Cancelamento deve abrir modal pedindo motivo, placeholder "Ex: chuva forte, atividade reagendada".
Empty state: "Sem tarefas abertas".
```

## Tela 27 - Relatorios / BI

```text
Crie a tela "BI & Relatorios".

Cabecalho:
- Titulo "BI & Relatorios".
- Subtitulo operacional.
- Botao/link "Analise de Ciclo de Producao".

Filtros:
- Mes.
- Ano.

Metricas:
- Receita total.
- Despesa total.
- Lucro liquido.
- Margem.

Secoes:
- Grafico simples de receita vs despesa.
- Despesas por categoria com barras horizontais.
- Ranking de culturas/estufas por rentabilidade.
- Botao "Exportar PDF".

Use dados simulados se necessario no prototipo.
```

## Tela 28 - Relatorio Operacional

```text
Crie a tela "Relatorio Operacional".

Objetivo: analisar rentabilidade de um ciclo de producao.

Filtro principal:
- Selecionar plantio/ciclo com label "Cultura (Lote) - status".

Resumo:
- Receita do ciclo.
- Custos com insumos.
- Despesas vinculadas.
- Lucro bruto.
- Margem.
- Custo por unidade/kg.

Conteudo:
- Linha do tempo operacional.
- Vendas do ciclo.
- Aplicacoes do ciclo.
- Manejos do ciclo.
- Despesas relacionadas.

Acao: "Gerar PDF".
```

## Tela 29 - Compartilhar Acesso

```text
Crie a tela "Compartilhar Acesso".

Objetivo: permitir que o dono da propriedade compartilhe acesso com operador/convidado.

Secoes:
- Card "Gerar codigo de convite" com explicacao curta, papel do convidado e permissoes.
- Botao "Gerar Codigo".
- Mostrar codigo grande em formato de convite, exemplo "X7K9P2", com botao copiar/compartilhar.
- Campo "Entrar com codigo", placeholder "Ex: X7K9P2".
- Botao "Vincular acesso".
- Lista de acessos compartilhados com nome, papel, data e status.

Permissoes devem aparecer como checkboxes/toggles: ler, escrever, excluir, gerenciar compartilhamento.
```

## Tela 30 - Perfil / Minha Propriedade

```text
Crie a tela "Minha Propriedade".

Formulario:
- Nome do produtor, placeholder "O seu nome".
- Nome da propriedade, placeholder "Ex: Sitio Sao Joao".
- Cidade/Estado, placeholder "Ex: Jales - SP".
- Tamanho em hectares, placeholder "Ex: 12".
- Latitude e longitude desabilitados quando capturados.
- Botao "Capturar localizacao".
- Botao "Compartilhar localizacao".

Topo com link para Configuracoes.
Botao principal "Salvar Perfil".
```

## Tela 31 - Configuracoes

```text
Crie a tela "Configuracoes".

Secoes:
- Conta: nome editavel, email desabilitado, botao salvar.
- Seguranca: senha atual, nova senha, confirmacao, botao atualizar senha admin.
- Notificacoes: toggles para tarefas do dia, alertas de estoque, contas vencidas, carencia de defensivos.
- Aparencia: modo claro/escuro/sistema.
- Sistema: versao do app, status de sincronizacao, sair da conta.

Use SectionHeading para separar blocos.
```

## Regras de UX para Todas as Telas

- Botoes principais sempre no fim da tela ou em area fixa, com texto direto.
- Campos obrigatorios devem ser visualmente claros.
- Numeros financeiros em R$ e datas em dd/mm/aaaa.
- Badges de status devem usar cores consistentes:
  - Verde: ativo, pago, liberado, concluido.
  - Laranja: pendente, atencao, manutencao.
  - Vermelho: atrasado, erro, excluido, estoque critico.
  - Azul: informacao, manejo, selecao.
- Formularios longos devem ser divididos em secoes.
- Listas devem ter busca/filtros quando acumulam muitos itens.
- Sempre incluir empty state com chamada para criar o primeiro registro.
- Acoes destrutivas devem exigir confirmacao e, para admin, senha.

## Entidades para Dados Mockados

Use estes exemplos no prototipo:

- Estufas: Estufa 01, Estufa 02, Viveiro Mudas.
- Culturas: Tomate Italiano, Alface Crespa, Pimentao Amarelo, Morango.
- Clientes: Mercado Central, Restaurante Sabor Verde, Feira Municipal.
- Fornecedores: AgroInsumos Vale, NutriCampo, Embalagens Brasil.
- Insumos: NPK 10-10-10, Calda Bordalesa, Biofertilizante, Substrato Carolina.
- Tarefas: revisar irrigacao, aplicar nutricao, inspecionar pragas, colher lote.

