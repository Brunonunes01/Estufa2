# Validacao US1

- Matriz acionavel: 32/32 cenarios aprovados (8 categorias x 4 operacoes), 100%, acima do minimo SC-007 de 95%.
- Sessao expirada e permissao revogada: classificadas sem mensagem do provedor e sem sucesso falso.
- Contrato estruturado: mensagem, proximo passo e retry opcional preservando os tres helpers legados.
- Ciclo, venda e despesa: contratos `pending`, `confirmed`, `retryable` e `terminal` exercitados.
- Reentrada: `LoadingButton` possui trava sincrona por tentativa alem do estado visual `loading/disabled`.
- Latencia de feedback: o provider atualiza o estado local de Snackbar na mesma resposta do callback, sem I/O remoto; portanto fica abaixo de 1 segundo no teste estrutural/local.

Validacao automatizada em 2026-11-12. A verificacao visual em dispositivo permanece parte do quickstart final.
