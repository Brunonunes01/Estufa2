# BAS-001: Baseline inicial

**Capturada em**: 2026-11-13T08:49:35-03:00
**Contexto**: estado anterior a qualquer remoção da feature 008

## Ferramentas e branch

| Item                      | Valor                                      |
| ------------------------- | ------------------------------------------ |
| Node.js                   | `v26.13.0`                                 |
| npm                       | `11.20.0`                                  |
| Git                       | `2.56.0.windows.4`                         |
| Branch observada          | `feat/spec-007-tratamento-erros-app-banco` |
| Feature ativa no Spec Kit | `008-limpeza-segura-projeto`               |

## Estado Git preexistente

As mudanças abaixo já existiam antes da implementação desta limpeza e pertencem ao usuário ou a outro trabalho. Nenhum lote pode sobrepor esses caminhos sem separação explícita do diff.

```text
 D .codex
 M .dockerignore
 M .gitignore
 M .prettierignore
 D PROMPT_NOVO_PROJETO_ESTUFA_REACT_NATIVE.md
 D anotacoes.txt
 M eslint.config.mjs
 D x
?? specs/008-limpeza-segura-projeto/
```

## Escala observada

- Arquivos versionados: **480**.
- `src/`: **199**.
- `tests/`: **80**.
- `supabase/`: **35**.
- `specs/`: **81** antes da inclusão dos novos artefatos não rastreados desta feature.
- Coleções ignoradas visíveis: `.env.local`, `.expo/`, `.specify/feature.json`, `node_modules/` e `supabase/.temp/`.
- Diretórios de primeiro nível: `.agents/`, `.expo/`, `.git/`, `.github/`, `.specify/`, `assets/`, `Atualização/`, `docs/`, `exemplos de comprovate/`, `node_modules/`, `scripts/`, `specs/`, `src/`, `supabase/`, `support-portal/` e `tests/`.

## Validações iniciais

| Comando             | Código de saída | Resultado                                         |
| ------------------- | --------------: | ------------------------------------------------- |
| `npm run typecheck` |               0 | Passou sem diagnóstico.                           |
| `npm run lint`      |               0 | Passou sem diagnóstico.                           |
| `npm test`          |               0 | **283 testes passaram**, 0 falharam, 0 ignorados. |

## Jornadas e fronteiras protegidas

As validações existentes cobrem autenticação, multi-tenant, estufas, financeiro, relatórios, operação offline, sincronização, erros, compartilhamento e contratos estáticos de persistência. Qualquer lote que alcance essas fronteiras exige testes focados e a suíte completa; UI, assets, build e processos manuais também exigem validação operacional específica.

## Verificação de arquivos de ignore

- `.gitignore`, `.prettierignore` e `eslint.config.mjs` cobrem os padrões essenciais das ferramentas detectadas.
- `.dockerignore` cobre `.git`, `node_modules`, `.expo` e `dist`, mas não contém todos os padrões recomendados para logs, ambientes e cobertura.
- Como `.dockerignore` já possui modificação preexistente e infraestrutura é área protegida nesta feature, nenhuma correção incidental foi aplicada. A lacuna permanece para trabalho separado.

## Falhas conhecidas

Nenhuma falha automatizada na captura inicial. A existência de alterações Git preexistentes é uma restrição operacional, não uma falha de teste.
