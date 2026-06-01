# Arquitetura Proposta: Modulo de Hidroponia

Data: 2026-04-28

## Decisao Principal

Hidroponia deve entrar como um modulo separado, nao como remendo em `Plantio`.

O app atual foi pensado para ciclos longos em estufa: tomate, pepino, pimentao, morango. Hidroponia de folhosas trabalha com ciclos curtos, fases separadas, bancadas, canais, furos, reservatorios, leituras de solucao nutritiva e colheitas frequentes. Se misturarmos tudo no `PlantioForm`, o app fica confuso para os clientes atuais e insuficiente para hidroponia.

A estrategia correta e:

- manter `Plantio` para ciclo longo;
- criar `Hidroponia` como modulo proprio;
- compartilhar entidades comuns: `Estufa`, `Insumo`, `Cliente`, `Venda`, `Despesa`, `Tarefa`, `Rastreabilidade`;
- usar configuracao para mostrar/esconder telas de hidroponia;
- manter compatibilidade com dados atuais.

## Separacao de Codigo

### Comum / Core

Continua fora de modulos especificos:

```text
src/types/domain.ts
src/services/estufaService.ts
src/services/insumoService.ts
src/services/clienteService.ts
src/services/vendaService.ts
src/services/despesaService.ts
src/services/tarefaAgricolaService.ts
src/services/traceabilityService.ts
src/navigation/RootNavigator.tsx
src/contexts/AppSettingsContext.tsx
src/screens/Dashboard/DashboardScreen.tsx
```

Esses arquivos podem receber pequenos campos genéricos, mas nao devem virar deposito de regra hidroponica.

### Hidroponia

Criar uma pasta isolada:

```text
src/modules/hidroponia/
  types.ts
  constants.ts
  utils.ts
  services/
    hidroponiaLoteService.ts
    hidroponiaMovimentacaoService.ts
    hidroponiaLeituraService.ts
    hidroponiaReservatorioService.ts
    hidroponiaColheitaService.ts
  hooks/
    useHidroponiaDashboard.ts
    useHidroponiaLotes.ts
    useHidroponiaLeituras.ts
  screens/
    HidroponiaDashboardScreen.tsx
    HidroponiaLotesScreen.tsx
    HidroponiaLoteFormScreen.tsx
    HidroponiaLoteDetailScreen.tsx
    HidroponiaMovimentarLoteScreen.tsx
    HidroponiaLeituraFormScreen.tsx
    HidroponiaReservatoriosScreen.tsx
    HidroponiaColheitaScreen.tsx
  components/
    HidroponiaStageChip.tsx
    HidroponiaBenchMap.tsx
    HydroMetricCard.tsx
    NutrientReadingCard.tsx
    LotTraceabilityCard.tsx
```

Essa estrutura deixa claro o que so existe para hidroponia: fases, bancadas, leituras, reservatorios, movimentacao de lote e colheita por lote rapido.

## Configuracao do Produto

Adicionar em `AppSettingsContext` ou, idealmente, em configuracoes do tenant no banco anterior.

### Configuracao Local

Boa para UI simples:

```ts
productionProfiles: {
  longCycle: boolean;
  hydroponics: boolean;
  seedlings: boolean;
  seedlingResale: boolean;
}
```

### Configuracao de Tenant

Melhor para sincronizar entre usuarios da mesma propriedade:

Colecao sugerida:

```text
tenant_settings/{tenantId}
```

Campos:

```ts
productionProfiles: Array<'long_cycle' | 'hydroponics' | 'seedlings' | 'seedling_resale'>;
traceabilityLevel: 'simple' | 'commercial' | 'complete';
enableQrLabels: boolean;
requireBuyerForSale: boolean;
requireInvoiceForTraceability: boolean;
lotCodePattern: string;
renasemNumber?: string;
cgcMapaNumber?: string;
technicalResponsibleName?: string;
technicalResponsibleRegistry?: string;
```

Para comecar hidroponia, precisamos no minimo:

```ts
productionProfiles: ['long_cycle', 'hydroponics'];
enableHydroponics: boolean;
traceabilityLevel: 'simple' | 'commercial' | 'complete';
```

## Ajuste em Estufa

Nao criar uma entidade nova chamada "HidroponiaEstufa". A estufa continua sendo uma unidade produtiva, mas ganha campos opcionais.

Adicionar campos opcionais em `Estufa`:

```ts
productionModes?: Array<'long_cycle' | 'hydroponics' | 'seedlings' | 'resale'>;
hydroponicSystemType?: 'nft' | 'dwc' | 'floating' | 'substrate' | 'semi_hydroponic' | 'other';
setores?: HydroSetor[];
reservatorios?: HydroReservatorio[];
```

Tipos hidroponicos:

```ts
export interface HydroSetor {
  id: string;
  nome: string;
  tipo: 'germinacao' | 'bercario' | 'crescimento_final' | 'expedicao' | 'outro';
  estruturas: HydroEstrutura[];
}

export interface HydroEstrutura {
  id: string;
  nome: string;
  tipo: 'bancada' | 'canal' | 'perfil' | 'mesa' | 'bercario';
  capacidadePlantas?: number;
  quantidadeFuros?: number;
  reservatorioId?: string | null;
  ativo: boolean;
}

export interface HydroReservatorio {
  id: string;
  nome: string;
  volumeLitros?: number;
  setorId?: string | null;
  ativo: boolean;
}
```

Por que dentro da estufa? Porque isso e estrutura fisica. Nao e lote. Nao e ciclo.

## Novas Colecoes banco anterior

### `hidroponia_lotes`

Representa um lote rastreavel de plantas em hidroponia.

```ts
export type HydroLoteStage =
  | 'semeadura'
  | 'germinacao'
  | 'bercario'
  | 'crescimento_final'
  | 'pronto_colheita'
  | 'colhido'
  | 'cancelado';

export interface HydroLote {
  id: string;
  tenantId: string;
  userId: string;
  createdBy?: string;

  codigoLote: string;
  estufaId: string;
  setorId?: string | null;
  estruturaId?: string | null;
  reservatorioId?: string | null;

  cultura: string;
  variedade?: string | null;
  loteSemente?: string | null;
  fornecedorSementeId?: string | null;

  sistema: 'nft' | 'dwc' | 'floating' | 'substrate' | 'semi_hydroponic' | 'other';
  faseAtual: HydroLoteStage;

  dataSemeadura?: Timestamp | null;
  dataEntradaBercario?: Timestamp | null;
  dataEntradaFinal?: Timestamp | null;
  dataPrevisaoColheita?: Timestamp | null;
  dataColheita?: Timestamp | null;

  quantidadeInicial: number;
  quantidadeAtual: number;
  quantidadePerdida?: number;
  quantidadeColhida?: number;
  unidadeQuantidade: 'plantas' | 'furos' | 'macos' | 'kg' | 'un';

  custoAcumulado?: number;
  receitaAcumulada?: number;

  status: 'ativo' | 'pronto' | 'colhido' | 'cancelado';
  observacoes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `hidroponia_movimentacoes`

Registra troca de fase/local: germinacao para bercario, bercario para bancada final, bancada final para colheita.

```ts
export interface HydroMovimentacao {
  id: string;
  tenantId: string;
  loteId: string;
  estufaId: string;

  fromStage?: HydroLoteStage | null;
  toStage: HydroLoteStage;
  fromSetorId?: string | null;
  toSetorId?: string | null;
  fromEstruturaId?: string | null;
  toEstruturaId?: string | null;

  quantidadeMovida: number;
  perdaNoMovimento?: number;
  motivoPerda?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;

  movedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `hidroponia_leituras`

Registra pH, CE e ambiente. Isso e especifico de hidroponia e nao deve entrar em manejo generico.

```ts
export interface HydroLeitura {
  id: string;
  tenantId: string;
  estufaId: string;
  reservatorioId?: string | null;
  estruturaId?: string | null;
  loteId?: string | null;

  pH?: number | null;
  condutividadeEletrica?: number | null;
  temperaturaSolucao?: number | null;
  temperaturaAmbiente?: number | null;
  umidadeAmbiente?: number | null;
  volumeLitros?: number | null;

  acao:
    | 'medicao'
    | 'corrigir_ph'
    | 'repor_agua'
    | 'trocar_solucao'
    | 'adicionar_nutriente'
    | 'limpeza';

  insumosAdicionados?: HydroLeituraInsumo[];
  observacoes?: string | null;
  responsavel?: string | null;

  measuredAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HydroLeituraInsumo {
  insumoId: string;
  nomeInsumo: string;
  quantidade: number;
  unidade: string;
}
```

### `hidroponia_colheitas`

Pode existir como colecao propria para preservar detalhes hidroponicos, mas deve criar uma `venda` quando houver venda.

```ts
export interface HydroColheita {
  id: string;
  tenantId: string;
  loteId: string;
  estufaId: string;
  clienteId?: string | null;
  vendaId?: string | null;

  dataColheita: Timestamp;
  quantidade: number;
  unidade: 'un' | 'macos' | 'kg' | 'caixas';
  perdas?: number;
  qualidade?: 'premium' | 'padrao' | 'descarte';

  precoUnitario?: number | null;
  valorTotal?: number | null;
  formaPagamento?: string | null;
  statusPagamento?: 'pago' | 'pendente';

  codigoLoteComercial?: string;
  observacoes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Rastreabilidade

O serviço atual de rastreabilidade prende tudo em `plantioId`. Para hidroponia, isso precisa evoluir.

Hoje:

```ts
plantioId: string;
entidade: 'plantio' | 'colheita' | 'venda' | ...
```

Proposto:

```ts
originType?: 'plantio' | 'hydro_lote' | 'seedling_lote' | 'resale_lote';
originId?: string;
plantioId?: string | null;
hydroLoteId?: string | null;
```

Entidades novas:

```ts
export type TraceabilityEntityType =
  | 'plantio'
  | 'hydro_lote'
  | 'hydro_movimentacao'
  | 'hydro_leitura'
  | 'hydro_colheita'
  | 'colheita'
  | 'venda'
  | 'aplicacao'
  | 'manejo'
  | 'tarefa'
  | 'estufa';
```

Acoes novas:

```ts
| 'semeado'
| 'movido'
| 'leitura_registrada'
| 'nutriente_adicionado'
| 'colhido'
| 'etiqueta_gerada'
```

Importante: para nao quebrar telas atuais, manter `plantioId` obrigatorio apenas nos fluxos antigos e criar funcoes novas:

```ts
createHydroTraceabilityEvent(...)
listTraceabilityEventsByHydroLote(...)
```

Depois, quando estiver estavel, unificamos por `originType/originId`.

## Integracao com Insumos

Hidroponia consome insumo de dois jeitos:

1. Aplicacao fitossanitaria, parecida com o app atual.
2. Nutrientes/correcao de solucao, especifico de hidroponia.

Nao misturar os dois.

Usar `AplicacaoForm` para defensivo/fitossanitario quando fizer sentido.

Criar `HydroLeituraForm` para:

- medir pH;
- medir CE;
- repor agua;
- trocar solucao;
- adicionar nutriente;
- corrigir pH;
- limpar reservatorio.

Quando adicionar nutriente, descontar estoque do `Insumo` e registrar custo no lote.

## Integracao com Vendas

O `Venda` atual aceita `plantioId` como campo principal. Para hidroponia temos duas opcoes:

### Opcao A - Compatibilidade Rapida

Criar venda com `plantioId` vazio ou usando campo auxiliar `hydroLoteId`.

Risco: telas atuais podem assumir `plantioId`.

### Opcao B - Evolucao Correta

Adicionar campos opcionais em `Venda`:

```ts
originType?: 'plantio' | 'hydro_lote' | 'seedling_lote' | 'resale_lote';
originId?: string;
hydroLoteId?: string | null;
```

Para venda de hidroponia:

```ts
originType: 'hydro_lote';
originId: loteId;
hydroLoteId: loteId;
plantioId: null;
```

Telas de vendas passam a mostrar:

- se `originType === 'plantio'`: cultura do plantio;
- se `originType === 'hydro_lote'`: cultura e codigo do lote hidroponico.

Essa e a opcao recomendada.

## Navegacao

Adicionar rotas:

```ts
HidroponiaDashboard: undefined;
HidroponiaLotes: undefined;
HidroponiaLoteForm: { loteId?: string; estufaId?: string } | undefined;
HidroponiaLoteDetail: { loteId: string };
HidroponiaMovimentarLote: { loteId: string };
HidroponiaLeituraForm: { loteId?: string; estufaId?: string; reservatorioId?: string } | undefined;
HidroponiaReservatorios: { estufaId?: string } | undefined;
HidroponiaColheita: { loteId: string };
```

No Dashboard principal, se hidroponia estiver ativa, mostrar modulo:

- "Hidroponia";
- "Lotes prontos";
- "Leitura pH/CE";
- "Colher lote".

## Telas do MVP Hidroponia

### 1. HidroponiaDashboardScreen

Resumo especifico:

- lotes ativos;
- lotes prontos para colheita;
- leituras pendentes hoje;
- bancadas ocupadas;
- alertas de pH/CE fora do alvo;
- colheita prevista nos proximos 7 dias.

Acoes rapidas:

- Novo lote;
- Registrar leitura;
- Movimentar lote;
- Colher/Vender;
- Reservatorios.

### 2. HidroponiaLotesScreen

Lista com filtros:

- Todos;
- Germinacao;
- Bercario;
- Crescimento final;
- Pronto;
- Colhido.

Card:

- codigo do lote;
- cultura/variedade;
- fase;
- estufa/bancada;
- quantidade atual;
- previsao de colheita;
- alerta se atrasado.

### 3. HidroponiaLoteFormScreen

Campos:

- estufa;
- sistema;
- cultura;
- variedade;
- lote de semente;
- data de semeadura;
- quantidade inicial;
- unidade: plantas/furos;
- setor/estrutura inicial;
- previsao de colheita;
- observacoes.

Deve gerar `codigoLote` automaticamente, mas permitir editar.

### 4. HidroponiaLoteDetailScreen

Abas ou secoes:

- Resumo;
- Fases e movimentacoes;
- Leituras;
- Insumos/nutrientes;
- Colheitas/vendas;
- Rastreabilidade.

### 5. HidroponiaMovimentarLoteScreen

Campos:

- fase destino;
- setor destino;
- estrutura destino;
- quantidade movida;
- perdas;
- motivo da perda;
- responsavel;
- observacoes.

Atualiza o lote e cria evento de rastreabilidade.

### 6. HidroponiaLeituraFormScreen

Campos:

- estufa;
- reservatorio ou bancada;
- lote opcional;
- pH;
- CE;
- temperatura da solucao;
- temperatura ambiente;
- umidade;
- volume;
- acao realizada;
- insumos adicionados;
- observacoes.

Validacoes:

- pH e CE opcionais individualmente, mas pelo menos uma leitura ou acao deve ser registrada;
- se adicionar insumo, quantidade deve ser maior que zero;
- se estoque insuficiente, avisar.

### 7. HidroponiaColheitaScreen

Campos:

- lote;
- quantidade colhida;
- unidade;
- perdas/descarte;
- cliente;
- preco unitario;
- forma de pagamento;
- status pagamento;
- gerar venda;
- gerar etiqueta/QR Code.

Atualiza quantidade do lote. Se colheita final, marca lote como `colhido`.

## Dashboard Principal

Nao sobrecarregar o dashboard geral. Ele deve mostrar um bloco pequeno quando hidroponia estiver ativa:

```text
Hidroponia
- 3 lotes prontos
- 2 leituras pendentes
- 87% ocupacao das bancadas
[Abrir Hidroponia]
```

O detalhe fica no `HidroponiaDashboardScreen`.

## Indices banco anterior Provaveis

Criar indices para:

```text
hidroponia_lotes: tenantId + status + dataPrevisaoColheita
hidroponia_lotes: tenantId + faseAtual + dataPrevisaoColheita
hidroponia_lotes: tenantId + estufaId + status
hidroponia_leituras: tenantId + estufaId + measuredAt desc
hidroponia_leituras: tenantId + reservatorioId + measuredAt desc
hidroponia_movimentacoes: tenantId + loteId + movedAt desc
hidroponia_colheitas: tenantId + loteId + dataColheita desc
vendas: tenantId + originType + originId
rastreabilidade_eventos: tenantId + hydroLoteId + eventAt desc
```

## Regras de Seguranca

Todas as colecoes novas precisam do mesmo padrao:

- documento deve ter `tenantId`;
- usuario autenticado so le/escreve se pertence ao tenant;
- operadores podem criar leituras, movimentacoes e colheitas;
- exclusao/cancelamento de lote deve ser admin;
- alteracao de evento de rastreabilidade deve ser bloqueada ou restrita.

## Implementacao em Fases

### Fase 1 - Fundacao

- Adicionar tipos hidroponicos.
- Adicionar production profile em configuracoes.
- Adicionar campos opcionais em Estufa.
- Criar rotas vazias e modulo no Dashboard.
- Criar `hidroponia_lotes` com CRUD basico.

### Fase 2 - Operacao Diaria

- Criar movimentacao de lote.
- Criar leitura pH/CE.
- Criar dashboard hidroponico.
- Criar alertas simples.

### Fase 3 - Colheita e Venda

- Criar colheita hidroponica.
- Adaptar `Venda` para `originType/originId`.
- Ajustar telas de vendas para origem hidroponica.
- Registrar rastreabilidade.

### Fase 4 - Etiqueta e QR Code

- Gerar codigo de lote comercial.
- Criar tela publica/relatorio de rastreabilidade.
- Exportar etiqueta.

## O Que Nao Fazer Agora

- Nao migrar `Plantio` para `Lote` de uma vez.
- Nao colocar pH/CE dentro de `ManejoForm`.
- Nao criar campos hidroponicos obrigatorios em `Estufa`.
- Nao alterar venda de forma que quebre venda atual por plantio.
- Nao misturar viveiro de mudas nesta primeira etapa.

## Primeiro Recorte de Implementacao Recomendado

Para comecar pequeno e certo:

1. Configuracao: ativar/desativar Hidroponia.
2. Estufa: marcar uma estufa como hidroponica e cadastrar setores/bancadas simples.
3. Lotes: criar/listar/detalhar lote hidroponico.
4. Movimentar lote entre fases.
5. Registrar leitura de pH/CE.

So depois disso entrar em colheita, venda, etiqueta e QR Code.

Esse recorte ja entrega valor real para hidroponia sem mexer pesado no financeiro.

