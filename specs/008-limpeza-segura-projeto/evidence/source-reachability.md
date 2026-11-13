# Evidência: Alcance do código-fonte

**Capturada em**: 2026-11-13
**Métodos**: entradas conhecidas, navegação, busca por basename, busca textual, typecheck, lint e suíte de testes

## EVD-0001 — Cadeia de entrada ativa

`index.ts` importa `App.tsx`; `App.tsx` importa os providers e `RootNavigator`; os navegadores registram as telas produtivas de estufas, estoque, vendas, financeiro, perfil, autenticação e configurações. Os diretórios de `src/` contêm 198 arquivos TypeScript/TSX observados no disco, distribuídos entre componentes, contextos, hooks, navegação, telas, serviços, tipos e utilitários.

**Resultado**: a superfície ativa possui cadeia de consumo clara e deve ser mantida.

## EVD-0002 — Heurística de arquivos sem referência

Uma busca por basename em `src/`, `tests/`, `App.tsx` e `index.ts` produziu dois resultados iniciais:

- `src/components/MapViewCompat.web.tsx`: falso positivo. É resolvido por extensão de plataforma a partir de imports de `MapViewCompat` em `PerfilScreen.tsx` e `EstufaFormScreen.tsx`.
- `src/screens/Campo/components/PermanentFieldCycleDeleteModal.tsx`: nenhuma importação, rota, exportação agregadora ou referência externa encontrada.

**Resultado**: somente o modal de Campo permanece candidato técnico.

## EVD-0003 — Modal legado de Campo

`PermanentFieldCycleDeleteModal.tsx` é autossuficiente, exporta default e não possui consumidor. A navegação ativa não registra telas de Campo. Os testes de fronteira produtiva confirmam que a superfície operacional permanece limitada a estufas convencionais.

**Limite da evidência**: ausência de consumidor e testes verdes provam que o arquivo não participa da superfície detectável; a remoção ainda exige aprovação por envolver código legado de domínio removido.

## EVD-0004 — Validação geral

- Typecheck: passou.
- Lint: passou.
- Testes: 283 passaram.

Essa baseline prova o estado anterior, mas deverá ser repetida após qualquer lote.

## Lacunas

Carregamento dinâmico e uso manual não podem ser provados apenas por basename. Por isso, nenhum outro arquivo de `src/` foi classificado para remoção nesta rodada.
