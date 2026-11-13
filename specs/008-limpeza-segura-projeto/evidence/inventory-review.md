# Evidência: Revisão amostral do inventário

**Capturada em**: 2026-11-13
**Método**: reprodução independente de comandos e vínculos para uma amostra de cada área

| Amostra                         | Reprodução                                            | Resultado                                                            |
| ------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| CLN-0001 — entrada ativa        | `index.ts` → `App.tsx` → `RootNavigator`              | Confirmado.                                                          |
| CLN-0002 — modal de Campo       | Busca pelo símbolo fora do próprio arquivo            | Nenhum consumidor encontrado; classificação confirmada.              |
| CLN-0003 — scripts de limpeza   | Busca por nomes e padrões-alvo; scripts npm           | Nenhum consumidor ou alvo principal atual; classificação confirmada. |
| CLN-0009 — assets               | SHA-256 e referências de `app.json`                   | Conteúdo idêntico e nomes distintos consumidos; manter confirmado.   |
| CLN-0010 — portal               | Script `support:portal` e entrada `server.mjs`        | Consumidor confirmado.                                               |
| CLN-0014 — testes               | `npm test` e contagem                                 | 283 testes passaram; manter confirmado.                              |
| CLN-0015 — governança           | Constituição e comandos Spec Kit                      | Proteção confirmada.                                                 |
| CLN-0016 — Supabase             | Constituição e estrutura de migrations/testes         | Proteção confirmada.                                                 |
| CLN-0018 — dependências         | `.gitignore`, `package-lock.json`, execução dos gates | Coleção gerada e necessária localmente; manter confirmado.           |
| CLN-0022 — exclusões anteriores | BAS-001 e `git status --short`                        | Sobreposição preexistente confirmada; bloqueio mantido.              |

## Divergências

Nenhuma divergência material na amostra. A heurística inicialmente indicou `MapViewCompat.web.tsx` como órfão, mas a revisão identificou resolução por extensão de plataforma e corrigiu o falso positivo antes da consolidação.
