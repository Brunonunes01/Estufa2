# Quickstart: Validação da Limpeza Segura

## Objetivo

Orientar baseline, revisão e comparação antes/depois. Este guia não autoriza remoção automática: somente lote conforme o [contrato](./contracts/cleanup-artifact-contract.md) e com duas aprovações pode ser aplicado.

## Pré-requisitos

- Node.js e dependências já instaladas; `git` e `rg` disponíveis.
- Acesso ao responsável pelo produto e a um revisor técnico.
- Nenhuma alteração preexistente deve ser descartada, sobrescrita ou atribuída à limpeza.

## 1. Capturar a baseline

```powershell
node --version
npm --version
git --version
git branch --show-current
git status --short
git ls-files
```

Registrar resultados sanitizados em `baselines/initial-baseline.md`, conforme o [modelo](./data-model.md). Mudanças já presentes ficam fora dos lotes até que seu diff possa ser distinguido.

```powershell
npm run typecheck
npm run lint
npm test
```

Registrar códigos de saída e falhas preexistentes, sem suprimi-las.

## 2. Conferir o inventário

```powershell
git ls-files
git status --ignored --short
rg --files src tests scripts assets docs support-portal
```

Confirmar que todas as áreas aparecem; áreas protegidas estão marcadas; diretórios gerados aparecem como coleções; itens inconclusivos estão em `investigar`.

## 3. Reproduzir evidências

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' 'nome-do-candidato' .
git log --oneline --all -- caminho/relativo/do/candidato
```

Inspecionar também usos indiretos. Retorno vazio do `rg` não autoriza remoção: validação e confirmação operacional continuam obrigatórias.

## 4. Validar o lote antes da execução

Confirmar que arquivos exatos estão enumerados, cada candidato possui três evidências, não há área protegida nem sobreposição preexistente, a reversão é exata e as aprovações de produto e técnica estão registradas. Se algo falhar, manter `bloqueado`.

## 5. Validar um lote aplicado

Executar testes focados e depois:

```powershell
npm run validate
git status --short
git diff --stat
git diff --check
```

Comparar com a baseline, conferir que o diff contém somente candidatos aprovados e executar as jornadas adicionais da matriz do [contrato](./contracts/cleanup-artifact-contract.md).

## 6. Falha ou resultado inconclusivo

Interromper, marcar `bloqueado` e executar apenas a reversão específica do lote. Repetir validações até recuperar a baseline. Não usar `git reset`, `git checkout`, rebase ou comando amplo que possa apagar mudanças preexistentes.

## 7. Gate final

```powershell
npm run validate
git diff --check
```

Encerrar somente quando todo candidato tiver estado final; nenhum item protegido ou `investigar` tiver sido alterado; lotes aplicados estiverem `validado` ou `revertido`; um segundo revisor reproduzir amostras; o resumo puder ser conferido em até 30 minutos; e limitações estiverem documentadas.
