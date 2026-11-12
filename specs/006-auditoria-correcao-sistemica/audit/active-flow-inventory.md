# Inventário inicial de jornadas ativas

Cada fluxo deve possuir pré-condições, sucesso, entrada inválida, negação quando aplicável,
leituras/escritas, política offline, estado e evidência.

| ID | Domínio | Ação | Leitura/escrita principal | Offline | Estado inicial |
|---|---|---|---|---|---|
| FLOW-identity | Identity | register/login/restore/logout/password | auth, profile | online_only | pending |
| FLOW-tenant | Tenant | bootstrap/list/switch/share/revoke | tenants, memberships | online_only | pending |
| FLOW-dashboard | Dashboard | summary/tasks/alerts | estufas, plantios, tarefas, resumo | read_only | pending |
| FLOW-greenhouse | Greenhouse | create/list/detail/update/delete | estufas | queueable write | pending |
| FLOW-production | Production | cycle/tasks/management/applications | plantios, tarefas, manejos, aplicações | queueable write | pending |
| FLOW-inventory | Inventory | input/consume/balance/reversal | insumos, aplicações | queueable write | pending |
| FLOW-harvest | Harvest | create/edit/totals/linkage | colheitas | queueable write | pending |
| FLOW-sales | Sales | create/edit/status/receipt/cancel | vendas, recebimentos, cheques | queueable write | pending |
| FLOW-expenses | Expenses | create/edit/payment/pending | despesas, caixa | queueable write | pending |
| FLOW-finance | Finance | cash/receivables/payables/checks | movimentos financeiros | read_only | pending |
| FLOW-contacts | Contacts | customers/suppliers | clientes, fornecedores | queueable write | pending |
| FLOW-reports | Reports | operational/financial/PDF/XLSX | multiple scoped reads | online_only | pending |
| FLOW-settings | Settings | settings/export/security actions | app settings | online_only | pending |
| FLOW-offline | Offline | queue/restart/reconnect/retry/switch | local queue | queueable | pending |

Regras obrigatórias: Fluxos de escrita devem possuir cenário de leitura após escrita.
Fluxos multi-tenant devem possuir cenário de acesso cruzado negado.
Fluxos compostos devem identificar fontes essenciais e auxiliares.
