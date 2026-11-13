# Data Model: Limpeza Segura do Projeto

## Visão geral

O modelo representa artefatos de governança gravados em Markdown. Ele não cria tabelas, serviços ou dados de aplicação.

## Candidato de limpeza

| Campo                | Obrigatório | Regra                                                          |
| -------------------- | ----------- | -------------------------------------------------------------- |
| `candidate_id`       | Sim         | Identificador estável `CLN-NNNN`, único no inventário.         |
| `path_or_pattern`    | Sim         | Caminho relativo ou padrão; não pode conter segredo.           |
| `granularity`        | Sim         | `arquivo`, `diretório`, `código` ou `coleção`.                 |
| `tracked_state`      | Sim         | `versionado`, `não-versionado`, `ignorado` ou `misto`.         |
| `category`           | Sim         | `manter`, `remover`, `consolidar`, `arquivar` ou `investigar`. |
| `description`        | Sim         | Finalidade aparente e contexto conhecido.                      |
| `protected_area`     | Sim         | Booleano; quando verdadeiro, proíbe lote de alteração.         |
| `risk_level`         | Sim         | `baixo`, `médio`, `alto` ou `crítico`.                         |
| `evidence_ids`       | Sim         | Uma ou mais evidências; remoção exige os três tipos mínimos.   |
| `known_dependencies` | Sim         | Referências ou `nenhuma conhecida`, nunca campo vazio.         |
| `recommendation`     | Sim         | Decisão proposta e justificativa reproduzível.                 |
| `batch_id`           | Condicional | Permitido somente após proposta de lote.                       |
| `state`              | Sim         | Estado do ciclo de vida abaixo.                                |
| `final_result`       | Condicional | Obrigatório ao encerrar o candidato.                           |
| `residual_risk`      | Condicional | Obrigatório após aplicação ou reversão.                        |

### Transições de estado

```text
descoberto -> em_análise -> manter | investigar | proposto
proposto -> produto_aprovado | rejeitado
produto_aprovado -> tecnicamente_validado | rejeitado
tecnicamente_validado -> agendado | bloqueado
agendado -> aplicado
aplicado -> validado | revertido
```

- Área protegida só pode terminar em `manter` ou `investigar`.
- Evidência inconclusiva força `investigar` ou `bloqueado`.
- `aplicado` exige as duas aprovações e uma baseline vinculada.
- Falha posterior exige `revertido` ou `bloqueado`; nunca `validado`.

## Evidência

| Campo           | Obrigatório | Regra                                                                          |
| --------------- | ----------- | ------------------------------------------------------------------------------ |
| `evidence_id`   | Sim         | Identificador `EVD-NNNN`.                                                      |
| `candidate_id`  | Sim         | Referência a um candidato.                                                     |
| `type`          | Sim         | `referências`, `validação`, `operacional`, `origem`, `regeneração` ou `risco`. |
| `method`        | Sim         | Comando, inspeção ou revisão usada.                                            |
| `result`        | Sim         | Resumo sanitizado e reproduzível.                                              |
| `artifact_link` | Condicional | Link relativo para saída persistida, quando existir.                           |
| `captured_at`   | Sim         | Data no formato `YYYY-MM-DD`.                                                  |
| `reviewer`      | Condicional | Papel ou pessoa responsável pela confirmação.                                  |

Valores de segredo, credenciais, tokens e dados pessoais não podem ser gravados em nenhum campo.

## Lote de limpeza

| Campo                | Obrigatório | Regra                                                                       |
| -------------------- | ----------- | --------------------------------------------------------------------------- |
| `batch_id`           | Sim         | Identificador `BAT-NNN`.                                                    |
| `title`              | Sim         | Nome curto e descritivo.                                                    |
| `rationale`          | Sim         | Uma única justificativa semântica.                                          |
| `candidate_ids`      | Sim         | Somente candidatos `proposto` ou posteriores, sem área protegida.           |
| `baseline_id`        | Sim         | Baseline capturada antes da aplicação.                                      |
| `risk_level`         | Sim         | Maior risco entre os candidatos e a fronteira afetada.                      |
| `validation_plan`    | Sim         | Verificações focadas, gerais e manuais aplicáveis.                          |
| `rollback_plan`      | Sim         | Restauração exata e verificável do lote.                                    |
| `product_approval`   | Sim         | Decisão independente do responsável pelo produto.                           |
| `technical_approval` | Sim         | Decisão independente do revisor técnico.                                    |
| `state`              | Sim         | `proposto`, `aprovado`, `bloqueado`, `aplicado`, `validado` ou `revertido`. |
| `result_summary`     | Condicional | Obrigatório após aplicação.                                                 |

## Baseline de validação

| Campo               | Obrigatório | Regra                                     |
| ------------------- | ----------- | ----------------------------------------- |
| `baseline_id`       | Sim         | Identificador `BAS-NNN`.                  |
| `captured_at`       | Sim         | Data e contexto da captura.               |
| `git_state`         | Sim         | Resumo sanitizado do estado preexistente. |
| `repository_counts` | Sim         | Contagens e escopo observado.             |
| `commands`          | Sim         | Comandos executados e códigos de saída.   |
| `known_failures`    | Sim         | Falhas anteriores ou `nenhuma`.           |
| `affected_journeys` | Sim         | Jornadas que deverão ser comparadas.      |

## Decisão de aprovação

| Campo            | Obrigatório | Regra                                                |
| ---------------- | ----------- | ---------------------------------------------------- |
| `role`           | Sim         | `produto` ou `técnico`.                              |
| `decision`       | Sim         | `aprovado`, `rejeitado` ou `alterações_solicitadas`. |
| `reviewer`       | Sim         | Identificação auditável do revisor.                  |
| `decided_at`     | Sim         | Data da decisão.                                     |
| `scope_or_basis` | Sim         | Escopo aprovado ou base técnica verificada.          |
| `notes`          | Sim         | Justificativa curta; pode ser `sem observações`.     |

## Registro de validação

| Campo                 | Obrigatório | Regra                                                                          |
| --------------------- | ----------- | ------------------------------------------------------------------------------ |
| `validation_id`       | Sim         | Identificador `VAL-NNNN`.                                                      |
| `batch_id`            | Sim         | Lote validado.                                                                 |
| `type`                | Sim         | `focada`, `geral`, `manual`, `offline`, `segurança`, `build` ou `operacional`. |
| `command_or_scenario` | Sim         | Comando ou cenário reproduzível.                                               |
| `expected`            | Sim         | Resultado esperado antes da execução.                                          |
| `actual`              | Sim         | Resultado sanitizado observado.                                                |
| `status`              | Sim         | `passou`, `falhou` ou `inconclusivo`.                                          |
| `baseline_comparison` | Sim         | Diferença em relação à baseline.                                               |

Qualquer registro `falhou` ou `inconclusivo` impede o estado `validado`.

## Relacionamentos

```text
Candidato 1 ── N Evidência
Candidato N ── 0..1 Lote
Lote      1 ── 1 Baseline
Lote      1 ── 2 Decisões de aprovação
Lote      1 ── N Registros de validação
```
