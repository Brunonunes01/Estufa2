# Validação US2

Data: 2026-11-12.

- Leitura composta preserva fontes válidas, identifica cada fonte e calcula `blockedActions`.
- Registros legados sem opcionais permanecem legíveis.
- Fila persiste `logicalOperationId` e hash canônico, deduplica replay e rejeita mesma chave com payload divergente.
- Criações simples usam UUID lógico como identificador persistido; retry físico preserva a identidade quando fornecida/reutilizada.
- Interrupção offline retorna `pending`, nunca `confirmed`; erros repetíveis, terminais e parciais possuem contratos distintos.
- Venda, aplicação, colheita e gasto inicial registram etapas concluídas e reconciliação segura.
- Buffer diagnóstico é independente: falha no envio não modifica o resultado da fila de negócio.
- Migration 0033 foi validada estaticamente; migrations 0034 e 0035 foram declaradas não aplicáveis nesta feature.

Confirmação, replay, conflito e falha parcial possuem testes automatizados. Nenhum banco foi executado.
