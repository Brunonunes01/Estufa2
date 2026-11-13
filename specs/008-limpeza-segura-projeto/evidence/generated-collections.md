# Evidência: Coleções geradas e ignoradas

**Capturada em**: 2026-11-13
**Métodos**: `.gitignore`, contagem de arquivos e tamanho lógico

## EVD-0020 — `node_modules/`

- 43.448 arquivos observados.
- Aproximadamente 469 MB.
- Ignorado pelo Git e regenerado a partir de `package-lock.json`/npm.
- Necessário no estado local para executar imediatamente as ferramentas e o aplicativo.

**Resultado**: manter como coleção local gerada. Não representa resíduo versionado; exclusão apenas transferiria custo para a próxima instalação.

## EVD-0021 — `.expo/`

- 4 arquivos observados, aproximadamente 289 KB.
- Ignorado pelo Git e regenerado pelo Expo.

**Resultado**: manter no ambiente atual; limpeza local é possível quando houver necessidade operacional, mas não agrega valor ao repositório versionado.

## EVD-0022 — `supabase/.temp/`

- 2 arquivos observados, 173 bytes.
- Ignorado pelo Git e regenerado pelo Supabase CLI.
- Está dentro de área de persistência protegida.

**Resultado**: somente auditável; manter nesta feature.

## EVD-0023 — Estado local do Spec Kit

`.specify/feature.json` é ignorado e seleciona a feature ativa para os comandos Spec Kit.

**Resultado**: manter enquanto a iniciativa estiver ativa; governança protegida.
