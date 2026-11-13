# BAT-001: Scripts obsoletos de limpeza pontual

**Estado**: validado
**Risco**: médio

## Escopo e justificativa

Remover quatro scripts Python usados para alterações pontuais por regex que não fazem parte dos comandos do projeto e cujos padrões-alvo principais já não existem nos arquivos de destino.

## Candidatos incluídos

- CLN-0003: `clean.py` — 41 linhas, SHA-256 `0630DCAB7809ACDB56240DE277633DD2E81ED91A5825FF98529D712AF06ECB99`.
- CLN-0003: `clean_dash.py` — 21 linhas, SHA-256 `15167A3B2ECCD64FC6393B969EB8BE999EA9D95F9524DBC79A7831C8E61E1330`.
- CLN-0003: `clean_list.py` — 28 linhas, SHA-256 `C8F8D1FC24CAB48F449AD99DD1CED2A48C68BC78711898771E33BF358B83D24C`.
- CLN-0003: `clean_rem.py` — 69 linhas, SHA-256 `35C39B50E5946B3C89F1804E4A8DC553A138802DDAEAF0B211B624CE497A47B8`.

## Itens explicitamente excluídos

- Todo arquivo em `src/`, inclusive os antigos alvos dos scripts.
- Scripts ativos em `scripts/`.
- Configuração, dependências, documentação, persistência e alterações preexistentes.

## Baseline vinculada

[BAS-001](../baselines/initial-baseline.md): typecheck, lint e 283 testes aprovados antes da remoção.

## Evidências

- [EVD-0005](../evidence/root-and-scripts.md): nenhuma referência ou comando declarado; finalidade pontual e padrões-alvo ausentes.
- [EVD-0004](../evidence/source-reachability.md): gates gerais aprovados sem executar esses scripts.
- Confirmação operacional do repositório: nenhum consumidor documentado ou automatizado conhecido.

## Riscos e impactos

- Risco principal: algum colaborador executar manualmente um script não documentado fora dos fluxos conhecidos.
- Impacto esperado: redução de scripts perigosos que reescrevem código por regex; nenhum comportamento do aplicativo.
- Área protegida: não.
- Sobreposição preexistente: nenhuma nos quatro arquivos.

## Plano de validação

1. Repetir busca pelos quatro nomes fora dos artefatos desta feature.
2. Confirmar que `package.json`, documentação operacional e scripts ativos não os consomem.
3. Executar `npm run validate`.
4. Conferir que o diff remove somente os quatro arquivos declarados.

## Plano de reversão

Recriar somente os quatro arquivos com o conteúdo exato do estado anterior, lido de forma não destrutiva do commit baseline e aplicado por patch; confirmar os hashes acima e repetir `npm run validate`. Não usar `git checkout`, `reset` ou operação ampla.

## Aprovação de produto

- Decisão: **aprovado**.
- Revisor: usuário responsável pelo produto, via gate T025.
- Data: 2026-11-13.
- Escopo: remoção dos quatro arquivos listados, sem alteração em `src/`.
- Observações: remoção do lote autorizada explicitamente; não autoriza outros candidatos.

## Validação técnica

- Decisão: **aprovado**.
- Revisor: Codex, revisão técnica do gate T027.
- Data: 2026-11-13.
- Base: hashes conferidos, ausência de referências reproduzida, nenhuma sobreposição preexistente e reversão específica disponível.
- Observações: executar somente este lote e repetir todos os gates antes de encerrá-lo.

## Resultado da execução

- Aplicado em 2026-11-13.
- Arquivos removidos: `clean.py`, `clean_dash.py`, `clean_list.py` e `clean_rem.py`.
- Busca posterior pelos quatro nomes fora dos artefatos da feature: 0 referências.
- Diff do lote: somente quatro exclusões declaradas.
- `git diff --check` focado: passou.
- `npm run validate`: código 0; typecheck e lint passaram; 283 testes passaram sem falhas ou skips.

## Riscos residuais

Permanece apenas o risco de algum processo manual externo e não documentado ter dependido dos scripts. O responsável pelo produto aceitou esse risco ao aprovar o lote; a reversão específica continua documentada e reproduzível.
