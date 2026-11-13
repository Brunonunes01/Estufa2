# BAT-002: Modal legado de Campo sem consumidor

**Estado**: validado com risco residual móvel aceito
**Risco**: alto

## Escopo e justificativa

Remover um componente legado de exclusão permanente de ciclo de Campo que não é importado, registrado em rota ou alcançado pela superfície produtiva atual de estufas.

## Candidatos incluídos

- CLN-0002: `src/screens/Campo/components/PermanentFieldCycleDeleteModal.tsx` — 240 linhas, SHA-256 `2518CC0FBF9F0311CFF8A40C1BA92C151CC924F92A77200475E5A61E94D4A9EE`.

## Itens explicitamente excluídos

- Migrations e testes históricos de Campo.
- Serviços, tipos ou dados legados.
- Navegação, telas de estufas e demais arquivos de `src/`.
- Qualquer alteração funcional adicional do domínio produtivo.

## Baseline vinculada

[BAS-001](../baselines/initial-baseline.md): typecheck, lint e 283 testes aprovados antes da remoção.

## Evidências

- [EVD-0002/EVD-0003](../evidence/source-reachability.md): nenhuma referência fora do próprio arquivo; nenhuma rota ativa de Campo; falso positivo de plataforma descartado separadamente.
- [EVD-0004](../evidence/source-reachability.md): gates gerais aprovados com o arquivo inalcançável.
- Confirmação operacional do repositório: navegação e testes de fronteira mantêm a superfície ativa restrita a estufas convencionais.

## Riscos e impactos

- Risco principal: uso dinâmico ou manual não detectado de um componente ligado a domínio histórico.
- Impacto esperado: nenhum comportamento, pois não existe consumidor identificado.
- Área protegida: não, mas a natureza de domínio legado exige cautela elevada.
- Sobreposição preexistente: nenhuma no arquivo.

## Plano de validação

1. Repetir busca por `PermanentFieldCycleDeleteModal` e pelo caminho do arquivo.
2. Executar testes focados de fronteira produtiva, navegação, escopo removido e exclusão histórica.
3. Executar `npm run validate`.
4. Conferir que o diff remove somente o componente declarado.
5. Verificar manualmente que navegação web e móvel continuam sem rota de Campo.

## Plano de reversão

Recriar somente o componente com o conteúdo exato do estado anterior, lido de forma não destrutiva do commit baseline e aplicado por patch; confirmar o SHA-256 acima e repetir testes focados e `npm run validate`. Não usar `git checkout`, `reset` ou operação ampla.

## Aprovação de produto

- Decisão: **aprovado**.
- Revisor: usuário responsável pelo produto, via gate T025.
- Data: 2026-11-13.
- Escopo: remoção exclusiva do componente inalcançável, preservando migrations, testes, serviços e dados históricos.
- Observações: remoção exclusiva do componente autorizada; não autoriza outros elementos históricos de Campo.
- Decisão complementar: em 2026-11-13, o responsável solicitou a limpeza de todos os suspeitos removíveis, confirmando a execução deste lote apesar da indisponibilidade da jornada móvel.

## Validação técnica final

- Decisão: **aprovado com limitação registrada**.
- Revisor: Codex, revisão técnica do gate T027.
- Data: 2026-11-13.
- Base: hash e ausência de referências confirmados; typecheck, lint e 283 testes aprovados após a remoção.
- Observações: a jornada móvel não foi executada. A limitação foi aceita explicitamente pelo produto e permanece como risco residual.

## Resultado da execução

- O componente enumerado foi removido.
- Nenhuma referência externa ao componente permaneceu.
- `npm run validate` foi aprovado: typecheck, lint e 283 testes.
- Persistência, serviços, testes históricos e demais arquivos de Campo permaneceram inalterados por este lote.

## Riscos residuais

Possível comportamento exclusivamente móvel não foi verificado manualmente. A ausência de rota, import ou consumidor e a aprovação dos gates automatizados reduzem o risco, mas não substituem essa jornada.
