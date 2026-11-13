# Evidência: Áreas protegidas

**Capturada em**: 2026-11-13
**Método**: constituição, especificação, baseline e inspeção estrutural

| Área                                                                | Proteção                              | Justificativa                                                                         | Tratamento nesta feature                                        |
| ------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.git/`                                                             | Metadados de versionamento            | Histórico e estado do repositório não podem ser reescritos.                           | Somente inventariar.                                            |
| `.agents/`, `.specify/` e `specs/`                                  | Governança e SDD                      | Constituição exige rastreabilidade por especificação, plano e tarefas.                | Somente inventariar.                                            |
| `supabase/migrations/`                                              | Histórico de persistência             | A constituição proíbe apagar ou compactar migrations históricas.                      | Somente inventariar.                                            |
| Demais `supabase/` e `db_dump.sql`                                  | Persistência e segurança              | Schema, políticas, tipos e dumps exigem iniciativa própria.                           | Somente inventariar.                                            |
| `.env*` e segredos                                                  | Credenciais e dados sensíveis         | Valores não podem ser expostos nem versionados em evidências.                         | Registrar apenas existência, nunca conteúdo.                    |
| `.dockerignore`, `Dockerfile`, `nginx.conf`, `eas.json`, `.github/` | Infraestrutura crítica                | Alterações podem afetar build, publicação e produção.                                 | Somente inventariar; abrir trabalho separado.                   |
| `package.json`, `package-lock.json`                                 | Dependências e runtime                | Dependências permanecem estáveis sem autorização específica.                          | Manter e auditar consumidores.                                  |
| Código de autenticação, tenant, offline e sincronização             | Segurança e resiliência               | Requer preservação de isolamento e operação offline.                                  | Alto risco; nenhuma remoção sem evidência completa e aprovação. |
| Fluxos produtivos de estufas                                        | Domínio produtivo                     | Plantio, colheita, insumos, vendas, financeiro e relatórios são contratos do produto. | Manter salvo prova completa de redundância não funcional.       |
| Alterações preexistentes listadas em BAS-001                        | Propriedade do usuário/outro trabalho | Não podem ser sobrescritas ou atribuídas à limpeza.                                   | Bloqueadas para sobreposição.                                   |

## Resultado

O mapa cobre todas as categorias exigidas por FR-006A. Nenhuma área protegida pode integrar um lote desta feature, mesmo que aparente redundância seja encontrada.
