# Research: Auditoria e Correção Sistêmica

## Decision 1 — Auditoria orientada a risco e contrato

**Decision**: Inventariar primeiro as jornadas e os contratos que elas atravessam; priorizar identidade, autorização, persistência e finanças; corrigir somente falhas reproduzidas ou incompatibilidades comprovadas.

**Rationale**: O conjunto de sintomas já observado mostra falhas em cascata: uma coluna ou enumeração ausente pode parecer um erro de tela diferente. Auditar por contrato reduz correções pontuais repetitivas e mantém o escopo verificável.

**Alternatives considered**: Corrigir apenas os erros enviados pelo console foi rejeitado porque encontra sintomas um a um. Refatorar todos os serviços antes da auditoria foi rejeitado por risco, escopo e conflito com a constituição.

## Decision 2 — Inventário estático combinado com jornadas executáveis

**Decision**: Cruzar navegação, telas, hooks, serviços, tipos e migrations para produzir o inventário; confirmar os contratos mais críticos com testes e jornadas reais.

**Rationale**: Inspeção estática encontra campos e estados ainda não exercitados; jornadas reais revelam cache, sessão, permissões e rede.

**Alternatives considered**: Somente testes manuais têm baixa repetibilidade. Somente análise estática não comprova comportamento remoto nem experiência do usuário.

## Decision 3 — Compatibilidade de persistência por fonte tripla

**Decision**: Para cada operação ativa, comparar payload/mapeador do serviço, tipo remoto versionado e migration da baseline; qualquer divergência gera achado e regressão de contrato.

**Rationale**: A presença de um campo em apenas uma ou duas fontes não garante que a aplicação consiga gravá-lo e lê-lo.

**Alternatives considered**: Tipos gerados isoladamente podem estar desatualizados; o banco remoto isoladamente não garante baseline reproduzível.

## Decision 4 — Evolução aditiva e reversível do schema

**Decision**: Quando uma correção exigir persistência, criar migration incremental idempotente, manter o histórico e documentar validação e reversão. Aplicação remota exige autorização separada.

**Rationale**: Preserva dados e ambientes já aplicados, atendendo à reconstrução controlada.

**Alternatives considered**: Alterar migrations anteriores quebra histórico; corrigir diretamente o banco remoto elimina rastreabilidade.

## Decision 5 — Testes com ferramentas existentes

**Decision**: Usar runner Node, TypeScript, ESLint e validações manuais Expo; não adicionar framework ou dependência.

**Rationale**: A suíte atual já cobre regras, contratos, integração e persistência. Expandir padrões existentes reduz risco.

**Alternatives considered**: Um framework E2E exigiria dependências e infraestrutura fora do escopo; apenas testes unitários não cobrem fronteiras remotas.

## Decision 6 — Matriz explícita de tenant e permissão

**Decision**: Validar cada família de operação com dois tenants e os perfis owner, admin compartilhado, operator e guest, separando read, write, delete e manage-sharing.

**Rationale**: Papéis agregados podem ocultar permissões independentes e acessos cruzados.

**Alternatives considered**: Testar apenas owner/guest não cobre gerência e operador; confiar somente na interface não comprova a fronteira de dados.

## Decision 7 — Taxonomia única de erros com causa preservada

**Decision**: Classificar falhas em validation, authentication, authorization, conflict, connectivity, availability, data-contract e unexpected. Serviços preservam causa e contexto sanitizados; telas exibem ação e orientação segura.

**Rationale**: Mensagens genéricas tornaram falhas de fontes diferentes indistinguíveis.

**Alternatives considered**: Exibir mensagens remotas diretamente é inseguro; ocultar toda causa técnica impede diagnóstico.

## Decision 8 — Leituras compostas com responsabilidade identificável

**Decision**: Cada fonte de tela composta tem contexto próprio. Dados essenciais bloqueiam com mensagem específica; dados auxiliares podem degradar explicitamente quando não comprometem integridade.

**Rationale**: Uma espera conjunta indiscriminada pode atribuir a falha de plantios ao carregamento de estufas.

**Alternatives considered**: Falhar sempre a tela é excessivo para auxiliares; ignorar toda falha secundária oculta inconsistências.

## Decision 9 — Offline particionado e idempotente

**Decision**: Operações pendentes mantêm usuário, tenant, ação, payload versionado, identidade/idempotência, tentativas e estado. O flush revalida sessão e permissão.

**Rationale**: Troca de conta, reinício e reconexão são pontos de risco para duplicidade e mistura de dados.

**Alternatives considered**: Fila global sem escopo viola isolamento; descartar fila na troca causa perda silenciosa.

## Decision 10 — Registro de achados como evidência versionada

**Decision**: Manter o registro em documentação/testes da feature, sem criar entidade operacional no banco. Cada achado terá estado, severidade, reprodução, regressão e evidência.

**Rationale**: Os achados são artefatos de engenharia, não dados do produto.

**Alternatives considered**: Uma tabela operacional adicionaria persistência sem valor ao usuário; manter apenas na conversa não oferece rastreabilidade.
