# Research: Tratamento de Erros no App e Banco Legado

## 1. Evolução da fundação existente

**Decision**: Estender `src/services/serviceError.ts`, `src/services/compoundRead.ts`, a fila offline e o feedback existentes, adotando o contrato por fluxo.

**Rationale**: O projeto já possui a taxonomia de oito categorias, sanitização inicial, leitura composta e escopo offline por usuário/tenant. Evolução incremental reduz regressão e atende à Constituição.

**Alternatives considered**:

- Introduzir uma biblioteca externa de observabilidade: rejeitada por aumentar dependências e não resolver o contrato de domínio/offline.
- Reescrever todos os serviços de uma vez: rejeitada pelo risco e pelo escopo transversal.

## 2. Contrato de erro e mensagem ao usuário

**Decision**: Separar causa técnica, contexto sanitizado e apresentação. O erro normalizado terá categoria, código estável, operação, fonte, correlação, repetibilidade, mensagem segura e próximo passo.

**Rationale**: Mensagens atuais frequentemente concatenam `error.message` do provedor. O contrato preserva diagnóstico sem expor detalhes técnicos e permite mensagens coerentes por ação.

**Alternatives considered**:

- Mostrar diretamente a mensagem recebida do Supabase: rejeitada por segurança e por baixa orientação.
- Usar somente textos genéricos: rejeitada porque perde a categoria, a origem e a ação corretiva.

## 3. Leituras compostas degradáveis

**Decision**: Retornar um resultado por fonte e uma lista de capacidades bloqueadas; uma falha essencial não deve lançar antes de preservar resultados independentes.

**Rationale**: O helper atual preserva falhas auxiliares, mas lança na primeira fonte essencial com erro. O contrato esclarecido exige bloquear apenas ações dependentes.

**Alternatives considered**:

- Bloquear a tela inteira: rejeitada pela decisão de clarificação.
- Ignorar falha essencial: rejeitada porque permitiria ações sobre estado incompleto.

## 4. Idempotência de criações e reenvios

**Decision**: Gerar `logicalOperationId` antes da primeira tentativa e preservá-lo. Criações simples usam ID estável da entidade; operações agregadas usam recibo idempotente e RPC transacional quando necessário. Repetir a mesma chave com payload divergente resulta em conflito.

**Rationale**: A fila atual cria um ID apenas para o item e não protege a escrita remota. IDs estáveis e constraints únicas fazem o banco participar da garantia. O Supabase suporta conflito por chave única em operações de upsert, mas a atualização cega será evitada; o resultado existente deve ser validado antes de ser tratado como confirmação.

**Alternatives considered**:

- Debounce somente na interface: rejeitada porque não cobre retry, reinício e fila offline.
- Upsert irrestrito em todas as tabelas: rejeitada porque pode sobrescrever uma criação já confirmada com payload diferente.
- Ledger genérico fora da mesma transação: rejeitado porque poderia confirmar a chave sem confirmar a operação de negócio.

## 5. Escritas encadeadas e atomicidade

**Decision**: Usar funções PostgreSQL chamadas por RPC para agregados cuja falha reproduzida cruza várias escritas que precisam ser atômicas. Funções serão `security invoker` por padrão; qualquer exceção `security definer` exigirá `search_path` fixo, grants mínimos e testes específicos.

**Rationale**: Funções de banco executam as etapas no mesmo contexto transacional. Isso é adequado para vendas com itens, aplicações com baixa de estoque e outros agregados confirmados pelo inventário, sem transformar toda persistência em uma nova camada.

**Alternatives considered**:

- Compensação para toda operação: rejeitada quando o banco pode garantir atomicidade com menor risco.
- RPC para toda escrita simples: rejeitada por complexidade sem benefício proporcional.

## 6. Evidência diagnóstica e retenção

**Decision**: Usar buffer AsyncStorage separado da fila de negócio, sanitizado antes de persistir, com retenção local de 7 dias ou 200 eventos por escopo. Sincronizar em lotes de 50 para `diagnostic_events`, com retenção remota de 30 dias.

**Rationale**: O buffer separado impede que uma falha diagnóstica bloqueie dados de negócio. Limites controlam armazenamento e exposição. A tabela de rastreabilidade existente descreve ações de domínio e não deve receber falhas técnicas.

**Alternatives considered**:

- Somente console: rejeitado porque não sobrevive a reinício nem permite diagnóstico remoto.
- Reutilizar `rastreabilidade_eventos`: rejeitado por semântica, visibilidade e retenção diferentes.
- Retenção ilimitada: rejeitada por privacidade e custo.

## 7. RLS e acesso às evidências

**Decision**: `diagnostic_events` terá RLS habilitada, grants explícitos, inserção por membro autenticado do tenant, leitura/exclusão por usuário com gestão do tenant e nenhuma atualização. Índices começarão por `tenant_id`; eventos expirados serão excluídos do contrato de leitura.

**Rationale**: Políticas PostgreSQL aplicam isolamento na fronteira de dados. A documentação oficial do Supabase recomenda RLS em tabelas expostas, grants mínimos, políticas por operação e testes allow/deny.

**Alternatives considered**:

- Permitir leitura a qualquer membro: rejeitada porque evidência técnica, mesmo sanitizada, deve seguir menor privilégio.
- Usar chave administrativa no cliente: rejeitada; segredos com bypass de RLS nunca devem chegar ao aplicativo.

## 8. Estratégia de validação

**Decision**: Testar helpers puros, contratos de sanitização, integração offline/retry, migrations/RLS e cinco jornadas essenciais; registrar falha reproduzida antes de qualquer migration corretiva adicional.

**Rationale**: O risco atravessa UI, Auth, cache, fila e PostgreSQL. Um único nível de teste não prova isolamento, ausência de duplicidade ou atomicidade.

**Alternatives considered**:

- Somente testes unitários: rejeitada por não exercitar RLS/transação.
- Somente teste manual: rejeitado por baixa repetibilidade e cobertura.

## Referências técnicas

- Supabase JavaScript `upsert`: https://supabase.com/docs/reference/javascript/upsert
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions

