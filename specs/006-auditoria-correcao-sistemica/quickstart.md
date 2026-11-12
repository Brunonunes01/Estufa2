# Quickstart: Validation Guide

Este guia descreve como validar a auditoria e suas correções. Ele deve ser executado em ambiente de desenvolvimento ou validação, nunca diretamente em produção.

## 1. Prerequisites

- Node.js e npm compatíveis com o projeto.
- Dependências já instaladas conforme `package-lock.json`.
- Variáveis públicas do ambiente de validação configuradas localmente e não versionadas.
- Duas contas de teste independentes.
- Perfis de teste para owner, shared admin, operator e guest.
- Navegador moderno e um dispositivo/emulador móvel com Expo.
- Para alterações de persistência: ambiente descartável ou projeto de validação, CLI autenticado e estratégia de rollback documentada.

## 2. Establish the Baseline

Na raiz do projeto:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected outcome:

- todos os comandos encerram com código zero;
- nenhuma falha é suprimida;
- a contagem e duração dos testes são registradas como evidência inicial.

## 3. Validate the Clean Persistence Baseline

Execute os testes de persistência e contrato:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/persistence tests/contract
```

Quando houver ambiente local compatível, aplique a baseline em banco vazio. Quando isso não estiver disponível, registre a limitação e use as verificações estáticas existentes. Qualquer aplicação remota exige autorização explícita.

Expected outcome:

- migrations ordenadas e reproduzíveis;
- contratos ativos presentes;
- políticas de leitura, escrita e exclusão limitadas por tenant;
- nenhum dado específico de ambiente ou legado importado automaticamente.

## 4. Run the Identity and Tenant Matrix

Inicie o aplicativo web:

```powershell
npm run web
```

Validate:

1. cadastro e primeiro login criam uma única conta principal;
2. novo login restaura sessão e conta válida;
3. usuário sem compartilhamento vê somente sua conta;
4. convite válido adiciona apenas a conta compartilhada;
5. revogação remove o acesso após atualização da sessão;
6. owner, shared admin, operator e guest respeitam a matriz em [audit-contracts.md](./contracts/audit-contracts.md);
7. duas contas independentes não conseguem ler nem alterar dados uma da outra;
8. troca de conta não preserva dados visuais, cache ou ações da conta anterior.

Expected outcome: todos os casos permitidos funcionam e todos os casos negados falham sem alteração de dados.

## 5. Run the Essential End-to-End Journey

Na conta owner, execute nesta ordem:

1. criar, editar, recarregar e consultar uma estufa;
2. criar um ciclo nessa estufa;
3. registrar tarefa, manejo, entrada/consumo de insumo e aplicação quando suportados;
4. registrar colheita vinculada ao ciclo;
5. criar venda e verificar valor combinado, recebido e pendente;
6. registrar recebimento ou cheque e confirmar o efeito no caixa;
7. criar despesa e confirmar pagamento/pendência;
8. conferir painel, listas, resumo financeiro e relatórios;
9. reiniciar o aplicativo e confirmar que os mesmos dados permanecem coerentes.

Expected outcome: nenhuma etapa apresenta erro bloqueador; IDs e tenant permanecem coerentes; totais derivados coincidem com os registros de origem.

## 6. Validate Invalid and Legacy Inputs

For each audited write, cover:

- required field absent;
- invalid numeric value and decimal separator;
- invalid date or status transition;
- duplicate submission;
- old record missing optional fields;
- missing relation to greenhouse or cycle;
- expired session before confirmation.

Expected outcome: invalid writes fail before partial persistence, while compatible old records remain readable.

## 7. Validate Offline Behavior

With a valid owner or operator session:

1. disconnect before a queueable write;
2. confirm the operation is shown as pending, not remotely confirmed;
3. restart the application while offline;
4. reconnect and confirm one durable result;
5. repeat with loss of connection after submission;
6. queue an item, switch tenant/user, reconnect and verify it is not executed in the new context;
7. attempt an `online_only` action offline and verify it is blocked.

Run supporting tests:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/offlineStorage.test.ts tests/syncServiceIntegration.test.ts tests/syncServiceHelpers.test.ts
```

Expected outcome: no duplicate, silent loss or cross-tenant replay.

## 8. Validate Error Messages

Simulate at least one error from each category in [audit-contracts.md](./contracts/audit-contracts.md): validation, authentication, authorization, conflict, connectivity, availability, data contract and unexpected.

Expected outcome:

- user message identifies the affected action and a safe next step;
- console evidence identifies the failing source;
- no token, password, complete session or other-tenant record is exposed;
- a secondary source failure is not mislabeled as failure of the primary resource.

## 9. Final Gate

After every correction group and at final acceptance:

```powershell
npm run validate
```

If persistence changed, also run the migration dry-run supported by the selected validation environment and record its output without credentials.

Completion requires:

- every active flow classified as passed, failed, blocked or deliberately out of scope;
- no known critical/high finding open;
- every validated finding linked to a regression case;
- all automated checks green;
- web and mobile essential journeys complete;
- remote mutation, cutover, commit and push still require separate explicit authorization.
