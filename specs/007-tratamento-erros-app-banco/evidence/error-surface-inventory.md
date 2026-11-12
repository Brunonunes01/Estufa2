# Inventario da superficie de erros

| Fluxo | Fronteiras principais | Superficie anterior | Risco | Tratamento da spec |
|---|---|---|---|---|
| Login/cadastro | `AuthContext`, `LoginScreen`, `RegisterScreen`, Supabase Auth | Excecoes e mensagens textuais resolvidas por tela | detalhe de provedor e sessao expirada sem acao uniforme | classificador, apresentacao e feedback estruturado (T011, T019-T021) |
| Painel | `DashboardScreen`, `useDashboardActions`, queries agregadas | fontes compostas podiam lancar na primeira fonte essencial; avisos por string | apagar dados validos e ocultar origem | resultado por fonte e degradacao explicita (T022, T032, T052) |
| Ciclo | `PlantioFormScreen`, `plantioService` | validacao/tenant/rede chegam como `Error`; fila retorna placeholder | sucesso aparente e retry sem identidade | resultado de operacao e identidade logica (T023, T038-T040, T055) |
| Venda | `VendasListScreen`, `vendaService` | escrita encadeada e retry sem recibo comum | clique duplo, duplicidade e parcialidade | bloqueio de reentrada e reconciliacao/RPC (T024, T030, T042-T044) |
| Despesa | `DespesaFormScreen`, `DespesasListScreen`, `despesaService` | offline retorna entidade placeholder como se confirmada | confirmacao falsa depois de fila/reinicio | estados pending/confirmed/retryable/terminal (T025, T029, T039, T041) |

## Padroes transversais encontrados

- `ServiceError` ja possuia a taxonomia, mas a sanitizacao era apenas no primeiro nivel e o contrato nao continha todos os campos seguros.
- `resolveServiceErrorMessage` aceitava a mensagem tecnica bruta como mensagem de UI.
- `readCompound` preservava fontes auxiliares, mas lancava em fonte essencial e perdia o resultado estruturado completo.
- A fila offline isolava usuario/tenant, mas nao persistia identidade logica nem hash canonico.
- Chamadas `console.error` e `showError` permanecem pontos de integracao; a evidencia diagnostica deve receber somente o erro normalizado e sanitizado.
