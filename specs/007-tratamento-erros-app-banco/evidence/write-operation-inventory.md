# Inventario de operacoes de escrita

| Operacao | Servico/acao | Persistencia | Confirmacao atual | Risco | Cobertura responsavel |
|---|---|---|---|---|---|
| Estufa | `estufaService` / create-update-delete | `estufas` + fila offline | retorno PostgREST ou placeholder | retry duplica criacao | T038-T040; testes de fila/idempotencia |
| Ciclo | `plantioService` / create-update-status | `plantios` + fila offline | retorno PostgREST ou placeholder | tenant/retry e estado incorreto | T023, T038-T040, T055 |
| Insumo/manejo/tarefa | servicos agricolas | tabelas homonimas + fila quando suportada | retorno do provedor | repeticao sem chave logica | T040 |
| Cliente/fornecedor/despesa/caixa | servicos comerciais | tabelas homonimas + fila | retorno ou placeholder | duplicidade depois de reinicio | T038-T041 |
| Venda | `vendaService.createVenda` e atualizacoes financeiras | `vendas`, itens/estoque/caixa conforme fluxo | varias respostas encadeadas | parcialidade e clique duplo | T030, T042-T045 |
| Aplicacao | `aplicacaoService` | aplicacao e consumo de estoque | respostas encadeadas | consumo sem aplicacao ou inverso | T042-T045 |
| Colheita | `colheitaService` | colheita e ciclo/estoque relacionado | respostas encadeadas | registro parcial | T042-T045 |
| Evidencia diagnostica | buffer e `diagnostic_events` | AsyncStorage e tabela dedicada | independente da operacao de negocio | segredo/tenant cruzado | T028, T031, T033-T037, T046, T050 |

Todas as linhas exigem `logicalOperationId` estavel por operacao; cada tentativa fisica recebe `correlationId` novo. Placeholder offline representa somente `pending`, nunca confirmacao remota.

## Fechamento

- Estufa, ciclo, insumo, manejo, tarefa, cliente, fornecedor, despesa e caixa: IDs UUID estáveis são propagados ao registro e à fila; cobertura em `simpleCreationIdentity.test.ts` e `offlineStorage.test.ts`.
- Venda, aplicação, colheita e ciclo com gasto: etapas parciais e reconciliação documentadas em `chained-write-reproduction.md` e testadas por contratos estáticos.
- Evidência diagnóstica: buffer particionado, sanitizado e sincronizado independentemente da fila de negócio; falha diagnóstica não altera confirmação comercial.
- Atualizações/exclusões: permanecem tenant-scoped e não criam novos registros, portanto chave de criação não se aplica; concorrência continua protegida pelos filtros e regras existentes.
