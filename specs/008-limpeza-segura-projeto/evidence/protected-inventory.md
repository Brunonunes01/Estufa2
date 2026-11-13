# Evidência: Inventário protegido

**Capturada em**: 2026-11-13
**Métodos**: contagem estrutural, constituição e baseline

## EVD-0016 — Governança

- `.agents/`: 9 arquivos observados.
- `.specify/`: 22 arquivos observados, incluindo estado local ignorado.
- `specs/`: 93 arquivos observados no momento da análise.
- `.git/`: metadados internos não enumerados no relatório.

**Resultado**: somente auditável; manter.

## EVD-0017 — Persistência

- `supabase/`: 37 arquivos observados, incluindo migrations, testes e temporários.
- `db_dump.sql`: arquivo vazio, mas protegido por pertencer à persistência.

**Resultado**: somente auditável. Nenhum item pode integrar lote desta feature.

## EVD-0018 — Segredos e infraestrutura

- `.env.local` existe e é ignorado; seu conteúdo não foi lido nem registrado.
- `.github/`, Docker, Nginx, EAS e arquivos de ignore/configuração participam de infraestrutura e qualidade.
- `.dockerignore`, `.gitignore`, `.prettierignore` e `eslint.config.mjs` possuem alterações preexistentes.

**Resultado**: somente auditável; itens sobrepostos permanecem bloqueados.

## EVD-0019 — Arquivos já removidos antes da feature

`.codex`, `PROMPT_NOVO_PROJETO_ESTUFA_REACT_NATIVE.md`, `anotacoes.txt` e `x` já estavam marcados como removidos na baseline.

**Resultado**: investigar como mudança preexistente. Esta feature não confirma, restaura nem reivindica essas exclusões.
