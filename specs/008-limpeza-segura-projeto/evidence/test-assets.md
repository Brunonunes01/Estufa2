# Evidência: Testes

**Capturada em**: 2026-11-13
**Métodos**: estrutura de `tests/`, script npm e execução completa

## EVD-0014 — Estrutura e execução

- Arquivos em `tests/`: 80.
- Arquivos `*.test.ts`: 79.
- Suporte compartilhado: `tests/helpers/errorHandlingFixtures.ts`.
- `npm test` executa `node --test tests`.
- Resultado observado: 283 testes passaram, sem falhas ou skips.

## EVD-0015 — Cobertura contratual

A suíte cobre autenticação, autorização, tenant, offline, sincronização, erros, persistência estática, relatórios, vendas, caixa, domínio produtivo, exclusões e compatibilidade legada. Nomes aparentemente históricos exercitam contratos de regressão e migrations ainda preservadas.

**Resultado**: manter todos os arquivos de teste nesta rodada. Sem análise de cobertura por símbolo, duplicação aparente não prova redundância.
