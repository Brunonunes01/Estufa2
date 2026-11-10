---
description: "Task list for productive domain separation"
---

# Tasks: Separação do Domínio Produtivo

Implementação concluída conforme a spec, sem alteração de persistência, dependências ou dados históricos.

## Setup e Foundation

- [X] T001 Confirmar escopo sem schema, migration, dependência ou produção.
- [X] T002 Registrar baseline de typecheck, lint, test e validate.
- [X] T003 Inventariar consumidores online e offline.
- [X] T004 Cobrir origem operacional e rejeições de estufa/talhão/mista.
- [X] T005 Cobrir estados financeiros e valor recebido separado.
- [X] T006 Cobrir vínculos de tenant, estufa e ciclo.
- [X] T007 Consolidar invariantes e erros seguros no contrato.
- [X] T008 Consolidar transições no modelo de dados.

## User Story 1 — Regras produtivas consistentes

- [X] T009 Criar testes do contrato da fronteira produtiva.
- [X] T010 Criar testes de transição e data mínima do ciclo.
- [X] T011 Confirmar equivalência das regras de venda e pagamento.
- [X] T012 Extrair regras puras de origem, tenant e quantidade/preço.
- [X] T013 Extrair regras puras de ciclo e pesos.
- [X] T014 Integrar plantio às regras compartilhadas.
- [X] T015 Integrar colheita às regras compartilhadas.
- [X] T016 Integrar venda às regras compartilhadas e preservar recebimentos.
- [X] T017 Confirmar que Campo, Talhão e Hidroponia não retornam à superfície ativa.

## User Story 2 — Fluxos preservados

- [X] T018 Confirmar regressão do ciclo completo de estufa.
- [X] T019 Confirmar exclusão e efeitos vinculados.
- [X] T020 Confirmar equivalência financeira e de relatórios.
- [X] T021 Confirmar bloqueio de perfil e tenant.
- [X] T022 Preservar consumidores de tela e entradas públicas atuais.
- [X] T023 Preservar recebimento, caixa e relatórios.
- [X] T024 Preservar rastreabilidade e auditoria.
- [X] T025 Preservar mensagens e bloqueios seguros.
- [X] T026 Confirmar ausência de alteração em dependências, migrations e tipos gerados.

## User Story 3 — Offline e histórico

- [X] T027 Confirmar payload produtivo e rejeição no enqueue.
- [X] T028 Confirmar replay com autorização revogada e falha transitória.
- [X] T029 Confirmar idempotência após flush repetido.
- [X] T030 Confirmar leitura compatível de dados históricos.
- [X] T031 Preservar ação, payload, ciclo, tenant, usuário e intenção na fila.
- [X] T032 Reutilizar os serviços online nos handlers offline.
- [X] T033 Revalidar escopo e permissão antes do replay.
- [X] T034 Preservar leitura histórica sem conversão automática.

## Polish e validação

- [X] T035 Registrar decisões e inventário de consumidores.
- [X] T036 Consolidar invariantes no contrato e no modelo.
- [X] T037 Registrar cenários e evidências no quickstart.
- [X] T038 Executar `npm run typecheck` — PASS.
- [X] T039 Executar `npm run lint` — PASS sem erros bloqueantes.
- [X] T040 Executar `npm test` e `npm run validate` — 199/199 testes PASS.
- [X] T041 Confirmar ausência de migration, schema, dependência, produção ou alteração histórica.
