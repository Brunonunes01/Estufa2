# Revisão de migrations e rollback

| Migration | Decisão | Rollback | Risco residual |
|---|---|---|---|
| 0033 `diagnostic_events` | criada e validada estaticamente; não aplicada | remover trigger, função e tabela conforme bloco comentado | políticas precisam de teste executável antes de futura aplicação autorizada |
| 0034 idempotência atômica | não aplicável nesta feature | nenhum | operações encadeadas usam reconciliação explícita; RPC futura exige iniciativa própria |
| 0035 integrity guards | não aplicável nesta feature | nenhum | constraints/RLS adicionais exigem ambiente autorizado |

Nenhuma migration remota foi autorizada ou aplicada. A existência do arquivo 0033 não concede autorização de deploy.
