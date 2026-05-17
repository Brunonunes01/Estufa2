# Continuidade - Hidroponia

Data: 2026-05-01

## Contexto

O projeto nao vai utilizar Cloud Functions para a operacao principal. A regra assumida e: o app cliente fala direto com Firestore, entao regras Firestore, validacoes no cliente e transacoes precisam sustentar a consistencia do dominio.

## O que foi implementado nesta rodada

### Seguranca e tenant

- `firestore.rules` passou a respeitar `permissions.canRead`, `permissions.canWrite` e `permissions.canDelete` para tenants compartilhados.
- `src/services/aplicacaoService.ts` agora valida tenant do plantio e dos insumos antes de aplicar baixa de estoque/custo.

### Vendas

- `src/services/vendaService.ts` valida quantidade, unidade e preco unitario.
- Atualizacao de venda preserva `traceabilityPublicToken` e `traceabilityPublicUrl`.
- Venda hidropônica com baixa de saldo (`hydroAllocations`) nao pode alterar quantidade, unidade ou producao. Para mudar esses campos, deve excluir a venda, estornar saldo e registrar novamente.
- Exclusao de venda hidropônica estorna saldo nas ocupacoes originais em transacao.
- Apos estorno, o status do lote hidropônico e sincronizado.

### Plantio ciclo longo

- `src/services/plantioService.ts` atualiza custo inicial e despesa de investimento inicial no mesmo `writeBatch`.
- `deletePlantio` agora delega para `deletePlantioSafely`, evitando exclusao simples com dados orfaos.

### Hidroponia

- `src/modules/hidroponia/services/hidroponiaColheitaService.ts` revalida saldo em `runTransaction` para colheita/venda hidropônica.
- `src/modules/hidroponia/services/hidroponiaMovimentacaoService.ts` passou a usar `runTransaction` para movimentacao.
- Foi adicionada trava por bancada via colecao `hidroponia_estrutura_locks` para reduzir corrida entre usuarios tentando ocupar a mesma estrutura.
- A movimentacao revalida dentro da transacao:
  - saldo livre do lote
  - ocupacao de origem
  - tenant da origem
  - status da origem
  - capacidade da bancada
  - ocupacao por outro lote

## Arquivos principais alterados

- `firestore.rules`
- `src/services/aplicacaoService.ts`
- `src/services/plantioService.ts`
- `src/services/vendaService.ts`
- `src/modules/hidroponia/services/hidroponiaColheitaService.ts`
- `src/modules/hidroponia/services/hidroponiaMovimentacaoService.ts`

## Validacao executada

- `npm run typecheck` passou.
- Nao existe script `lint` no `package.json`.

## Pendencias prioritarias

### 1. Rastreabilidade atomica

Hoje varios eventos usam `createTraceabilityEventSafely`, que grava depois da operacao e engole erro. Para operacoes criticas, o evento deveria ser gravado no mesmo batch/transacao.

Prioridade de eventos atomicos:

- movimentacao hidropônica
- venda/colheita hidropônica
- estorno de venda hidropônica
- desbloqueio/cancelamento de ciclo
- aplicacao de insumos

### 2. Alertas pH/CE/temperatura

O cadastro de verduras possui faixas ideais. Falta comparar leituras hidropônicas contra essas faixas e gerar alerta operacional.

Implementar em:

- `src/modules/hidroponia/services/hidroponiaLeituraService.ts`
- possivelmente dashboard/lista de alertas

Regras sugeridas:

- pH abaixo/acima da faixa da verdura ativa no lote/estrutura
- EC abaixo/acima da faixa
- temperatura fora da faixa
- leitura sem responsavel deve ser bloqueada ou marcada como incompleta

### 3. Baixa de estoque para nutrientes adicionados

`hidroponiaLeituraService` registra `insumosAdicionados`, mas nao baixa estoque em `insumos`.

Possivel abordagem:

- transformar nutriente adicionado em item vinculado a `insumoId`
- usar transacao para baixar `estoqueAtual`
- registrar custo da operacao no lote/estufa, se houver modelo financeiro para isso

### 4. Relatorios hidropônicos

Faltam relatorios especificos:

- receita por lote hidropônico
- producao por bancada/setor
- perdas por fase
- ocupacao media por estufa
- giro por cultura/verdura
- leituras fora de faixa por periodo

### 5. UI para estorno/edicao de venda hidropônica

O servico ja bloqueia alteracao de quantidade/unidade/producao quando a venda tem baixa de saldo. A tela deveria deixar isso explicito:

- campos bloqueados em modo edicao
- texto explicando: "Para alterar quantidade ou producao, exclua a venda para estornar o saldo e registre novamente."
- confirmar no modal de exclusao que o saldo sera estornado

### 6. Testes

Criar testes para os fluxos criticos:

- venda hidropônica baixa saldo corretamente
- exclusao de venda hidropônica estorna saldo
- tentativa de editar quantidade de venda hidropônica com baixa falha
- movimentacao nao permite exceder capacidade
- movimentacao nao permite outra producao ocupar bancada travada
- regras Firestore respeitam `permissions.canWrite` e `canDelete`

## Observacoes tecnicas

### Colecao nova

Foi introduzida a colecao:

```text
hidroponia_estrutura_locks
```

Documento sugerido:

```text
{estufaId}_{estruturaId}
```

Campos usados:

```ts
{
  tenantId: string;
  estufaId: string | null;
  estruturaId: string;
  loteId: string;
  active: boolean;
  updatedAt: Timestamp;
}
```

Como `firestore.rules` sao tenant-scoped por `tenantId`, a colecao fica coberta pela regra global.

### Risco residual

A trava por bancada reduz corrida, mas ainda depende do cliente criar/manter locks corretamente. Como nao havera Cloud Functions, manter tudo via transacao e regras Firestore e essencial.

## Proximo passo recomendado

Implementar rastreabilidade atomica nas operacoes hidropônicas principais, comecando por:

1. `createHydroMovimentacao`
2. `registrarVendaHidroponicaPorLote`
3. `registrarColheitaHidroponica`
4. `deleteVenda` quando houver `hydroAllocations`
