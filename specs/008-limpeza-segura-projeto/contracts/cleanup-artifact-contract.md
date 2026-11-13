# Contract: Artefatos da Limpeza Segura

## Objetivo

Definir o formato mínimo que inventário, baseline e lotes devem cumprir para permitir revisão, aprovação e validação reproduzíveis. Este é um contrato interno de processo; não expõe API nem altera o aplicativo.

## 1. Inventário

O arquivo `../inventory.md` deve conter data e escopo, totais por estado/categoria/risco, mapa das áreas protegidas, candidatos conforme o modelo, links relativos para evidências e lotes e itens pendentes de confirmação operacional.

Um candidato não pode ter campos vazios. Valor desconhecido deve ser `não confirmado`, com estado `investigar`.

### Gate de remoção

Para recomendar `remover`, o candidato deve possuir:

- evidência de referências;
- evidência de validação aprovada;
- confirmação operacional de ausência de uso conhecido;
- `protected_area: false`;
- risco e dependências registrados.

## 2. Baseline

Cada arquivo em `../baselines/` deve registrar estado preexistente da árvore, contagens, versões relevantes, comandos/códigos de saída, falhas preexistentes e jornadas aplicáveis. Conteúdo sensível deve ser redigido; `.env`, tokens, credenciais e dumps nunca são anexados.

## 3. Lote

Cada arquivo em `../batches/` deve usar:

```markdown
# BAT-NNN: Título

## Escopo e justificativa

## Candidatos incluídos

## Itens explicitamente excluídos

## Baseline vinculada

## Evidências

## Riscos e impactos

## Plano de validação

## Plano de reversão

## Aprovação de produto

## Validação técnica

## Resultado da execução

## Riscos residuais
```

### Gate de aprovação

O lote só recebe `aprovado` quando todos os candidatos satisfazem o gate, as duas decisões registram aprovação, baseline/validação/reversão estão completas, não há sobreposição preexistente não resolvida e nenhuma área protegida está incluída.

### Gate de execução e validação

- Executar um lote por vez e somente os candidatos declarados.
- Não alterar dependências, schema, migrations, infraestrutura, arquitetura ou comportamento.
- Não executar operações de Git restritas pela constituição.
- Marcar `validado` somente quando todas as validações passam e não há diferença inexplicada contra a baseline.
- Falha ou resultado inconclusivo exige bloqueio ou reversão.

## 4. Matriz mínima de validação

| Fronteira afetada                   | Validações adicionais obrigatórias                                    |
| ----------------------------------- | --------------------------------------------------------------------- |
| Documentação sem função operacional | Links, referências e revisão de conteúdo.                             |
| Script ou configuração              | Consumidores, comando associado e cenário de build/operação.          |
| Código TypeScript                   | Testes focados, typecheck, lint e suíte completa.                     |
| UI, navegação ou asset              | Jornada manual web e pelo menos um alvo móvel aplicável.              |
| Offline, cache ou sincronização     | Criação offline, reinício, reconexão e ausência de duplicidade/perda. |
| Autenticação ou multi-tenant        | Cenários allow/deny e troca de usuário/tenant.                        |
| Persistência, migration ou segredo  | Proibido nesta iniciativa; abrir trabalho separado.                   |

## 5. Segurança das evidências

Os artefatos podem registrar nomes de variáveis e padrões de risco, nunca seus valores. Saídas de comandos devem ser resumidas ou redigidas antes de persistidas. Conteúdo sensível bloqueia o lote até a correção do artefato.
