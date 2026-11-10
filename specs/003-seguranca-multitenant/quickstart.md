# Quickstart: Validação de Segurança e Isolamento Multi-Tenant

## Pré-requisitos

- Dependências instaladas na raiz do projeto.
- Fixtures ou ambiente não produtivo com dois tenants.
- Usuários/perfis de proprietário, gerente, operador e somente leitura.
- Itens offline controlados para pelo menos uma operação de estufa.
- Nenhum acesso ou alteração em banco de produção.

## Validação automatizada

Na raiz do projeto:

```powershell
npm run typecheck
npm run lint
npm test
npm run validate
```

Resultados esperados:

- TypeScript e lint sem erros.
- Testes de autorização, tenant, autenticação, offline e sincronização aprovados.
- Nenhuma migration, alteração de schema ou operação de produção executada.

## Cenário 1 — isolamento entre tenants

1. Autenticar um usuário com acesso ao tenant A.
2. Consultar estufas e plantios do tenant A; confirmar retorno somente do tenant A.
3. Tentar consultar ou escrever usando o tenant B; confirmar bloqueio sem exposição de dados.
4. Tentar usar tenant vazio ou inválido; confirmar falha segura sem fallback.

## Cenário 2 — matriz de permissões

1. Executar leitura com proprietário, gerente, operador e somente leitura.
2. Executar criação/edição com operador e somente leitura.
3. Executar exclusão com operador e proprietário.
4. Executar compartilhamento com gerente e operador.
5. Confirmar que cada resultado corresponde à matriz em [tenant-authorization-boundary.md](./contracts/tenant-authorization-boundary.md).

## Cenário 3 — offline e reconciliação

1. Com operador autorizado no tenant A, desconectar a rede.
2. Registrar uma operação de estufa e confirmar retenção local com usuário/tenant corretos.
3. Inserir ou simular item com tenant divergente ou permissão revogada.
4. Reconectar e confirmar que somente o item válido é aplicado ao tenant A.
5. Repetir o flush e confirmar que não há duplicidade.

## Cenário 4 — histórico preservado

1. Confirmar que registros legados não foram apagados ou convertidos.
2. Confirmar que nenhuma rota ativa de Campo, Talhão ou Hidroponia aparece.
3. Confirmar que uma referência histórica não cria caminho operacional novo.

## Evidências a registrar

- Saída de `typecheck`, `lint`, `test` e `validate`.
- Resultado da matriz por perfil e tenant.
- Resultado do ciclo offline/reconciliação e repetição do flush.
- Confirmação de que não houve alteração de produção, schema, migrations ou dados históricos.

## Evidências da implementação

- `npm run typecheck`: aprovado após a implementação.
- `npm run lint`: aprovado após a implementação.
- `npm test`: aprovado com 195 testes, sem falhas.
- A matriz validada cobre proprietário, gerente, operador e somente leitura, incluindo bloqueio de escrita, exclusão e compartilhamento.
- O ciclo offline valida tenant/usuário no enfileiramento, revalida a autorização no flush, retém itens incompatíveis como falha identificável e remove itens aplicados para evitar duplicidade.
- Não foram alterados migrations, schema, dependências, produção ou dados históricos.

## Evidências do baseline

Na execução inicial da feature 003:

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: aprovado com 186 testes.
- Nenhum banco, migration, schema ou ambiente de produção foi acessado ou alterado.
