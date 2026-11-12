# Reprodução de escritas encadeadas

Data: 2026-11-12. Validação por inspeção de código e testes estáticos; nenhuma migration foi executada.

| Fluxo | Etapas observadas | Falha parcial reproduzível | Reconciliação implementada |
|---|---|---|---|
| Venda | venda → itens → rastreabilidade/automação | cabeçalho confirmado e item rejeitado | `ServiceError` parcial informa `vendaId`, etapa `venda` e ação `revisar-itens-venda` |
| Aplicação | estoque → aplicação → itens → custo do ciclo | aplicação/itens confirmados e atualização de custo rejeitada | etapas concluídas e ações `revisar-itens-aplicacao` ou `recalcular-custo-ciclo` |
| Colheita | colheita → status do ciclo → venda direta | colheita confirmada e venda rejeitada | `colheitaId`, etapas concluídas e ação `revisar-venda-colheita` |
| Ciclo | ciclo → gasto inicial opcional | ciclo confirmado e gasto rejeitado | ação `revisar-gasto-inicial` sem sucesso integral falso |

## Decisão sobre migration 0034

Não criar `0034_idempotent_atomic_writes.sql` nesta feature. O escopo sem execução de banco não permite introduzir RPCs transacionais sem validá-las. A proteção adotada é: identidade lógica persistida na fila, hash canônico, deduplicação/rejeição de payload divergente, trava de reentrada e reconciliação explícita para etapas já confirmadas. Uma RPC futura exige especificação e autorização próprias.

## Rollback

Não há migration 0034. O rollback do código consiste em remover os metadados de reconciliação e a identidade lógica, sem alteração de schema.
