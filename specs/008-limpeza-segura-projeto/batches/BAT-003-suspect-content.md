# BAT-003: Conteúdo auxiliar sem consumidor

**Estado**: validado
**Risco**: médio

## Autorização

O responsável pelo produto solicitou explicitamente a remoção de todos os itens suspeitos removíveis e destacou que `docs/` deveria ter sido eliminada. A autorização foi registrada em 2026-11-13 após a conclusão inicial conservadora da Spec 008.

## Escopo removido

- CLN-0004: `scripts/generate_aquisicao_pptx.js`.
- CLN-0011: todos os 13 arquivos versionados de `docs/`.
- CLN-0012: os dois planos de `Atualização/`.
- CLN-0013: as duas imagens de `exemplos de comprovate/`.

## Exclusões do escopo

- `db_dump.sql`, por pertencer à persistência protegida.
- `.codex`, `PROMPT_NOVO_PROJETO_ESTUFA_REACT_NATIVE.md`, `anotacoes.txt` e `x`, porque suas exclusões já existiam antes desta limpeza.
- Configurações, dependências, código produtivo e coleções geradas.

## Evidências

- Nenhum consumidor automatizado dos arquivos foi encontrado fora dos artefatos históricos da própria especificação.
- O conteúdo tinha finalidade documental, visual ou de geração pontual, sem entrada declarada no projeto.
- `npm run validate` foi aprovado depois da remoção: typecheck, lint e 283 testes.

## Reversão

Restaurar exclusivamente os caminhos enumerados a partir do commit anterior ao lote e repetir `npm run validate`. Não usar reset ou operação ampla que afete mudanças preexistentes.

## Risco residual

Pode existir uso humano externo não representado no código. Esse risco foi aceito explicitamente pelo responsável pelo produto ao solicitar a remoção integral dos suspeitos removíveis.
