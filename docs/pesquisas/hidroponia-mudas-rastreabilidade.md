# Pesquisa de Produto: Hidroponia, Viveiro de Mudas e Rastreabilidade

Data: 2026-04-28

## Objetivo

Expandir o SGE Estufas para atender produtores de ciclos curtos, especialmente hidroponia, folhosas, ervas, baby leaf, viveiros de mudas e revendedores de mudas. A conclusão principal da pesquisa e que o app atual esta modelado para "ciclo de plantio longo por estufa", enquanto esses novos clientes trabalham com "lotes rapidos por etapa, bancada, canal, bandeja, pedido e rastreabilidade".

## Fontes Principais

- Embrapa - Hortaliças Hidropônicas: https://www.embrapa.br/hortalica-nao-e-so-salada/hortalicas-hidroponicas
- Embrapa - Produção de alface hidropônica, viabilidade técnico-econômica: https://www.embrapa.br/busca-de-publicacoes/-/publicacao/132517/producao-de-alface-hidroponica-um-estudo-de-viabilidade-tecnico-economica
- Embrapa - Produção de mudas de hortaliças: https://www.embrapa.br/agroindustria-de-alimentos/busca-de-publicacoes/-/publicacao/1050963/producao-de-mudas-de-hortalicas
- MAPA - Produção de sementes e mudas: https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-agricolas/sementes-e-mudas/producao-de-sementes-e-mudas
- MAPA - RENASEM: https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-agricolas/sementes-e-mudas/registro-nacional-de-sementes-e-mudas-2013-renasem
- MAPA - Boas Práticas Agrícolas: https://www.gov.br/agricultura/pt-br/assuntos/sustentabilidade/producao-integrada/boas-praticas-agricolas
- ANVISA - Rastreabilidade de vegetais in natura: https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2018/aprovada-in-sobre-rastreabilidade-de-vegetais-in-natura
- MAPA/SISLEGIS - INC Anvisa/SDA nº 2/2018: https://sistemasweb.agricultura.gov.br/sislegis/action/detalhaAto.do?method=visualizarAtoPortalMapa&chave=1000872877
- MAPA - Protocolo 001 de rastreabilidade: https://www.gov.br/agricultura/pt-br/assuntos/inspecao/produtos-vegetal/arquivos/protocolo-001-rastreabilidade/view
- Anvisa - Rotulagem de alimentos: https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem

## O Que Muda no Produto

Hoje o app funciona bem para tomate, pepino, pimentao e culturas com ciclo longo: cria estufa, cria plantio, registra manejo/aplicacao/colheita/venda.

Para hidroponia, folhosas e mudas, o trabalho e diferente:

- o ciclo e curto e repetitivo;
- a producao e escalonada semanalmente ou diariamente;
- uma mesma estufa pode ter varias bancadas, canais, perfis, fases e lotes simultaneos;
- o produtor pensa em capacidade, furos, bandejas, celulas, perdas, pedidos e entregas;
- a rastreabilidade precisa sair na etiqueta, caixa, bandeja, nota ou QR Code;
- o "produto final" pode ser alface pronta, maço de erva, baby leaf, bandeja de mudas ou muda individual;
- o lote pode nascer de semente, bandeja, bancada, pedido ou lote recebido de fornecedor.

Portanto, a proposta nao deve ser apenas adicionar configuracoes simples. O app precisa ganhar "perfis produtivos" e "modelos de ciclo".

## Modelos de Cliente

### 1. Produtor de Culturas Longas

Exemplos: tomate, pepino, pimentao, morango, berinjela.

Modelo atual atende bem:

- estufa;
- plantio/ciclo;
- manejo;
- aplicacao;
- colheita;
- venda;
- despesa;
- rentabilidade do ciclo.

Melhorias necessarias:

- manter como modo "Ciclo Longo";
- permitir subdivisoes da estufa;
- reforcar rastreabilidade por lote.

### 2. Produtor Hidroponico NFT / Folhosas

Exemplos: alface, rucula, agriao, cebolinha, salsa, coentro, manjericao, baby leaf.

Caracteristicas:

- producao sem solo, em substrato ou solucao nutritiva;
- normalmente em estufas, tuneis ou ambiente fechado;
- forte controle de solucao nutritiva, agua, pH, condutividade eletrica, temperatura e umidade;
- fases separadas: germinacao/maternidade, bercario/pre-crescimento e crescimento final;
- ciclos curtos, com alface hidroponica frequentemente organizada em torno de semanas, nao meses;
- capacidade e medida por furos, canais, perfis, bancadas e reservatorios;
- colheita muitas vezes e total por lote ou bancada.

Campos que o app precisa:

- tipo de sistema: NFT, DWC, floating, substrato, semi-hidroponia;
- estufa > setores > bancadas > canais/perfis;
- capacidade por bancada: quantidade de furos ou plantas;
- fase atual: germinacao, bercario, crescimento final, pronto para colheita, colhido;
- lote de semente;
- data de semeadura, transplante para bercario, transplante para bancada final e colheita prevista;
- solucao nutritiva: reservatorio, receita, pH, CE, temperatura da solucao, volume, troca/complemento;
- perdas por fase;
- produtividade por bancada/canal;
- rastreabilidade por lote colhido.

### 3. Viveiro / Produtor de Mudas

Exemplos: mudas de alface, tomate, pimentao, repolho, berinjela, couve, salsa, cebolinha.

Caracteristicas:

- producao em bandejas com 128, 200, 288 celulas ou outras configuracoes;
- cliente muitas vezes entrega a semente ou encomenda variedade especifica;
- o foco e pedido, bandeja, germinacao, qualidade da muda, reserva e entrega;
- o ciclo termina no transplantio/entrega, nao na colheita de alimento;
- qualidade sanitaria e uniformidade sao centrais;
- para comercializacao de mudas, MAPA informa que produtor/comerciante deve observar RENASEM, responsavel tecnico quando aplicavel, viveiro inscrito e normas de sementes e mudas.

Campos que o app precisa:

- pedido de mudas;
- cliente;
- especie/cultura;
- cultivar/variedade;
- lote de semente;
- origem da semente: propria, cliente, fornecedor;
- numero de bandejas;
- celulas por bandeja;
- sementes por celula;
- data de semeadura;
- previsao de entrega/transplante;
- germinacao estimada e germinacao real;
- perdas/refugos;
- bandejas prontas;
- status: solicitado, semeado, germinado, em desenvolvimento, pronto, entregue, cancelado;
- certificado/termo/conformidade quando aplicavel;
- numero RENASEM do produtor ou comerciante, se o usuario quiser controlar isso no app.

### 4. Revendedor de Mudas

Caracteristicas:

- pode nao produzir, apenas receber lotes de fornecedores e vender para clientes;
- rastreabilidade e principalmente entrada/saida;
- precisa registrar fornecedor, lote recebido, quantidade, nota/documento, estoque, cliente, lote vendido e data de expedicao;
- deve manter identificacao original da muda e documentos relacionados quando aplicavel.

Campos que o app precisa:

- compra/entrada de lote;
- fornecedor;
- RENASEM/identificacao do fornecedor quando houver;
- documento fiscal;
- especie/cultivar;
- lote;
- quantidade recebida;
- estoque atual;
- venda/saida;
- comprador;
- quantidade expedida;
- lote expedido;
- documento fiscal.

## Rastreabilidade: O Que o App Deve Atender

A INC Anvisa/SDA nº 2/2018 define rastreabilidade para produtos vegetais frescos destinados a alimentacao humana. O principio e cada ente da cadeia manter registros da etapa sob sua responsabilidade e identificar o produto, embalagem, caixa, sacaria ou envoltorio de forma unica. A identificacao pode ser etiqueta alfanumerica, codigo de barras, QR Code ou outro mecanismo.

### Produtos Abrangidos Relevantes Para o App

Da lista da norma e do protocolo MAPA, entram no escopo:

- folhosas e ervas: alface, agriao, almeirao, rucula, couve, cebolinha, coentro, manjericao, salsa, hortela, oregano, etc.;
- hortaliças nao folhosas: tomate, pepino, pimentao, abobrinha, berinjela, pimenta, quiabo, etc.;
- frutas como morango e outras.

### Registros Minimos Para Producao Primaria

O app deve permitir registrar:

- produto;
- variedade/cultivar;
- identificacao do lote;
- data de plantio/semeadura;
- data de colheita;
- quantidade colhida;
- quantidade comercializada;
- insumos usados;
- datas de aplicacao;
- tratamentos fitossanitarios;
- receituario agronomico ou recomendacao tecnica quando existir;
- comprador;
- CPF/CNPJ do comprador quando o produtor operar nesse nivel;
- nota fiscal ou documento correspondente;
- quantidade e lote comercializados.

### Registros Minimos Para Distribuicao/Comercializacao

Para revendedor, packing house, distribuidor ou comercio, o app deve registrar:

- produto;
- variedade/cultivar;
- lote recebido;
- fornecedor;
- CPF/CNPJ do fornecedor quando aplicavel;
- documento fiscal ou correspondente;
- data de recebimento;
- quantidade recebida;
- lote expedido;
- comprador;
- CPF/CNPJ do comprador quando aplicavel;
- data de expedicao;
- quantidade expedida.

### Tempo de Guarda

Os registros de rastreabilidade devem ficar disponiveis por 18 meses apos validade ou expedicao dos produtos horticolas, conforme INC nº 2/2018 e protocolo MAPA.

### Etiqueta/QR Code

O app deve gerar etiqueta com:

- nome do produto;
- variedade/cultivar;
- lote;
- produtor/responsavel;
- CPF/CNPJ/IE/CGC-MAPA quando configurado;
- endereco, coordenada rural ou CCIR;
- data de colheita/embalamento ou expedicao;
- quantidade/unidade;
- QR Code com link publico do lote.

O QR Code nao precisa expor dados sensiveis. Pode mostrar uma pagina publica com origem, lote, produto, data, produtor, cidade, eventos principais e status de conformidade.

## Recomendacao de Arquitetura do App

### Nova Tela de Configuracoes: Perfil de Producao

Adicionar em Configuracoes uma secao "Perfil de Producao".

Opcoes:

- Ciclo Longo em Estufa.
- Hidroponia / Folhosas.
- Viveiro de Mudas.
- Revenda de Mudas.

O usuario pode ativar mais de um. Exemplo: um produtor pode ter tomate em solo e hidroponia de alface.

Campos globais:

- Nome da propriedade/empresa.
- CPF/CNPJ.
- Inscricao estadual.
- RENASEM, quando aplicavel.
- CGC/MAPA, quando aplicavel para classificacao/embalamento.
- Responsavel tecnico.
- Padrao de codigo de lote.
- Nivel de rastreabilidade: simples, comercial, completo.
- Gerar QR Code em etiquetas: sim/nao.
- Exigir cliente nas vendas: sim/nao.
- Exigir documento fiscal: sim/nao.

### Nova Hierarquia de Producao

Substituir mentalmente "estufa contem plantios" por:

- Unidade produtiva: propriedade, estufa, viveiro, sala, tunel.
- Setor: maternidade, bercario, crescimento final, expedicao, estoque.
- Estrutura: bancada, canal, perfil, mesa, bandeja, reservatorio.
- Lote de producao: grupo rastreavel de plantas, mudas ou produto recebido.
- Evento: semeadura, transplante, manejo, aplicacao, solucao nutritiva, irrigacao, limpeza, colheita, embalagem, venda, expedicao.

Isso preserva o app atual e abre caminho para ciclos curtos.

### Nova Entidade: Modelo de Ciclo

Criar "Modelo de Ciclo" configuravel:

- nome: Alface NFT 42 dias, Rucula 30 dias, Tomate Estufa 120 dias, Muda Tomate 28 dias;
- tipo: longo, hidroponico, muda, revenda;
- fases padrao;
- duracao estimada por fase;
- unidade de capacidade;
- campos obrigatorios;
- tarefas automaticas.

Exemplo para alface NFT:

- Germinacao: 2 dias.
- Maternidade: 7 a 10 dias.
- Bercario: 8 a 10 dias.
- Crescimento final: 22 a 25 dias.
- Colheita.

Exemplo para viveiro de mudas:

- Pedido.
- Semeadura.
- Germinacao.
- Desenvolvimento.
- Rustificacao/qualidade.
- Pronto para entrega.
- Entregue.

### Nova Entidade: Lote de Producao

O "Plantio" atual pode evoluir para "Lote de Producao", mantendo compatibilidade.

Campos propostos:

- id;
- tenantId;
- tipo: ciclo_longo, hidroponia, muda, revenda;
- codigoLote;
- produto/cultura;
- variedade/cultivar;
- unidadeProdutivaId;
- setorId;
- estruturaId;
- origem: semeadura, transplante, compra, pedido;
- loteSemente;
- fornecedorId;
- clientePedidoId;
- dataInicio;
- dataPrevista;
- status;
- faseAtual;
- quantidadeInicial;
- quantidadeAtual;
- quantidadePerdida;
- unidadeQuantidade: plantas, bandejas, celulas, furos, maços, kg, caixas;
- custoAcumulado;
- receitaAcumulada;
- rastreabilidadeCompleta: boolean.

### Nova Entidade: Movimentacao de Lote

Para hidroponia e mudas, movimentar lote entre fases e locais e essencial.

Campos:

- loteId;
- data;
- origemSetorId/estruturaId;
- destinoSetorId/estruturaId;
- quantidadeMovida;
- perdaNoMovimento;
- responsavel;
- observacoes.

### Nova Entidade: Leitura Hidroponica

Campos:

- reservatorioId ou estruturaId;
- dataHora;
- pH;
- condutividadeEletrica;
- temperaturaSolucao;
- temperaturaAmbiente;
- umidadeAmbiente;
- volumeAgua;
- acao: medir, corrigir pH, repor agua, trocar solucao, adicionar nutriente;
- insumos adicionados;
- responsavel.

### Nova Entidade: Pedido de Mudas

Campos:

- clienteId;
- cultura;
- variedade/cultivar;
- quantidade solicitada;
- unidade: bandeja, muda, celula;
- celulasPorBandeja;
- dataPedido;
- dataEntregaPrevista;
- sementes fornecidas pelo cliente: sim/nao;
- lote da semente;
- status;
- observacoes;
- lotes de producao vinculados.

## Mudancas de UX Recomendadas

### Dashboard

Adicionar widgets conforme perfil ativo:

- Hidroponia:
  - Lotes para colher hoje.
  - Bancadas ocupadas.
  - Leituras pendentes de pH/CE.
  - Reservatorios com alerta.
  - Producao semanal prevista.

- Viveiro:
  - Pedidos a entregar.
  - Bandejas em producao.
  - Germinacao abaixo do esperado.
  - Mudas prontas.
  - Entregas da semana.

- Revenda:
  - Lotes recebidos sem rastreabilidade.
  - Estoque por variedade.
  - Vendas/expedicoes do dia.

### Estufas / Unidades

Renomear visualmente para "Unidades Produtivas" quando mais de um perfil estiver ativo.

Tipos:

- Estufa solo/substrato.
- Estufa hidroponica.
- Viveiro de mudas.
- Area de expedicao.
- Estoque/revenda.

### Plantios

Manter "Plantios" para ciclo longo, mas para novos perfis usar:

- "Lotes" para hidroponia.
- "Pedidos de Mudas" e "Lotes de Mudas" para viveiro.
- "Estoque de Mudas" para revenda.

### Atividade do Dia

O wizard deve ser orientado por perfil:

- Ciclo longo: manejo, aplicacao, venda, despesa.
- Hidroponia: leitura pH/CE, mover lote, colher, trocar solucao, limpar bancada, venda.
- Viveiro: semear pedido, registrar germinacao, perda/refugo, mover bandejas, marcar pronto, entregar.
- Revenda: entrada de lote, venda/expedicao, ajuste de estoque.

## MVP Recomendado

### Fase 1: Base de Configuracao e Compatibilidade

- Criar Perfil de Producao em Configuracoes.
- Permitir ativar Ciclo Longo, Hidroponia, Viveiro de Mudas, Revenda de Mudas.
- Criar "Modelos de Ciclo".
- Adicionar subdivisoes mais robustas em estufas: setor, bancada/canal/bandeja.
- Criar campo de nivel de rastreabilidade.

### Fase 2: Hidroponia

- Criar Lotes Hidroponicos.
- Criar fases: germinacao, bercario, crescimento final, pronto, colhido.
- Criar movimentacao de lote entre bancadas.
- Criar leituras de pH/CE/reservatorio.
- Ajustar colheita/venda para lote rapido.
- Dashboard de colheitas e leituras.

### Fase 3: Viveiro de Mudas

- Criar Pedido de Mudas.
- Criar Lote de Mudas por pedido ou semeadura avulsa.
- Controlar bandejas/celulas/germinacao/perdas.
- Entrega/venda de bandejas ou mudas.
- Campo RENASEM e responsavel tecnico em configuracoes.

### Fase 4: Rastreabilidade Comercial

- Criar pagina de lote/rastreabilidade.
- Gerar etiqueta com QR Code.
- Registrar entrada/saida para revenda.
- Relatorio de rastreabilidade por lote.
- Exportar PDF/romaneio.

## Decisoes de Produto

1. Nao transformar tudo em "Plantio". O conceito deve virar "Lote de Producao" por baixo, com nomes diferentes na tela.
2. Configuracao deve controlar quais modulos aparecem, para nao poluir o app de quem so planta tomate.
3. Hidroponia precisa medir operacao diaria, nao so resultado final.
4. Viveiro precisa ser pedido/bandeja/entrega, nao colheita.
5. Revendedor precisa rastrear entrada e saida, mesmo sem producao.
6. Rastreabilidade deve ser pensada como diferencial comercial: etiqueta, QR Code, historico do lote, nao apenas obrigacao.
7. A implementacao deve preservar dados atuais de Estufa, Plantio, Colheita, Venda e Aplicacao.

## Campos Que Devem Entrar no Futuro Schema

### Settings

- productionProfiles: string[];
- traceabilityLevel: simple | commercial | complete;
- lotCodePattern;
- requireBuyerForSale;
- requireInvoiceForTraceability;
- enableQrLabels;
- renasemNumber;
- cgcMapaNumber;
- technicalResponsibleName;
- technicalResponsibleRegistry;

### Unidade Produtiva / Estufa

- productionType;
- hydroponicSystemType;
- sectors;
- benches;
- channels;
- reservoirs;
- trayCapacity;
- holesCapacity;

### Lote

- productionMode;
- lotCode;
- crop;
- cultivar;
- seedLot;
- supplierId;
- customerOrderId;
- currentStage;
- currentLocation;
- quantityInitial;
- quantityCurrent;
- quantityLost;
- quantityHarvested;
- unit;
- traceabilityStatus;

### Evento de Rastreabilidade

- lotId;
- eventType;
- eventAt;
- actor;
- location;
- quantity;
- inputsUsed;
- documentRef;
- notes;

## Risco Regulatorio

Este documento nao substitui consultoria juridica, sanitaria ou agronomica. A implementacao deve ajudar o usuario a registrar informacoes e gerar documentos, mas o cumprimento legal depende do perfil real do produtor, UF, atividade, especie, destino comercial, enquadramento fiscal e exigencias de compradores.

