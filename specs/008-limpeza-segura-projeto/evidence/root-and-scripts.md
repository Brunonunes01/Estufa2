# Evidência: Raiz e scripts

**Capturada em**: 2026-11-13
**Métodos**: `package.json`, busca de referências, inspeção de conteúdo, histórico e baseline automatizada

## EVD-0005 — Scripts Python de limpeza pontual

Os arquivos `clean.py`, `clean_dash.py`, `clean_list.py` e `clean_rem.py`:

- não aparecem em `package.json`, documentação operacional ou referências internas;
- editam arquivos do produto por expressões regulares;
- têm como alvo principal a remoção de código de hidroponia;
- apontam para arquivos que atualmente não contêm os padrões principais `Hydro`, `hydro` ou `isHydro` pesquisados;
- não são necessários para typecheck, lint ou os 283 testes aprovados.

**Resultado**: conjunto homogêneo com recomendação técnica de remoção em lote próprio, condicionado à aprovação.

## EVD-0006 — Gerador de apresentação de aquisição

`scripts/generate_aquisicao_pptx.js` não é referenciado por `package.json` nem por outro arquivo e grava uma apresentação em caminho absoluto externo e antigo. O conteúdo descreve uma avaliação pontual de aquisição e contém métricas históricas incompatíveis com a baseline atual.

**Resultado**: investigar. Pode ser um artefato manual ainda desejado; não há confirmação operacional suficiente para remoção.

## EVD-0007 — Scripts e guias ativos

- `scripts/patch-supabase-hermes.cjs` é executado por `postinstall`.
- `scripts/build-local-apk.ps1` é executado por `apk:local`.
- `COMO_GERAR_APK_LOCAL.txt` documenta o build manual e seus diagnósticos.

**Resultado**: manter.

## EVD-0008 — Persistência e infraestrutura

- `db_dump.sql` está vazio, mas é um artefato de persistência protegido.
- `Dockerfile` e `nginx.conf` formam o build web conteinerizado.
- `app.json`, `eas.json`, Babel, Metro, TypeScript, ESLint, Prettier e arquivos de ignore têm consumidores de build/qualidade.
- `.dockerignore` tem lacunas, porém já possui modificação preexistente e é infraestrutura protegida.

**Resultado**: manter ou investigar em trabalho separado; nenhuma alteração nesta feature.
