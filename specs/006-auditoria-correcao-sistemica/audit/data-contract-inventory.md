# Inventário de contratos de dados

Estado válido: `aligned|missing_in_app|missing_in_type|missing_in_schema|mismatch|legacy_only`.

| Serviço | Tipo | Migration | Operações | Enumerações | Nulabilidade | Relações | Tenant | Estado |
|---|---|---|---|---|---|---|---|---|
| estufaService | Estufa | 0004, 0016 | CRUD | status ativo/inativo | conforme tipo | tenant | obrigatório | aligned |
| plantioService | Plantio | 0007, 0014, 0017 | CRUD/status | status do ciclo | conforme tipo | tenant/estufa | obrigatório | aligned |
| colheitaService | Colheita | 0008 | CRUD | unidade/destino | conforme tipo | tenant/plantio/estufa | obrigatório | aligned |
| vendaService | Venda | 0008 | CRUD/recebimento | status/pagamento | conforme tipo | tenant/cliente | obrigatório | aligned |
| despesaService | Despesa | 0009, 0015 | CRUD/pagamento | status/categoria | conforme tipo | tenant/fornecedor | obrigatório | aligned |
| offline services | OfflineOperation | local | queue/replay | state | scoped | user/tenant | obrigatório | aligned |

O inventário será expandido pelas verificações de contrato das fases seguintes.
