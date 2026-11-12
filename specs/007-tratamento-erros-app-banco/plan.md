# Implementation Plan: Tratamento de Erros no App e Banco Legado

**Branch**: `007-tratamento-erros-app-banco` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-tratamento-erros-app-banco/spec.md`

## Summary

Consolidar o tratamento de falhas do Estufa2 sobre as fundações já existentes (`ServiceError`, leituras compostas, feedback visual e fila offline), sem criar uma arquitetura paralela. A implementação padronizará classificação, mensagem acionável, estado da operação, correlação e sanitização; preservará partes válidas de telas compostas; adicionará idempotência a criações e reenvios; e tornará escritas encadeadas atômicas por função PostgreSQL apenas quando a falha reproduzida justificar essa mudança. Evidências diagnósticas sanitizadas serão retidas localmente por curto prazo, sincronizadas para uma tabela separada no banco legado e protegidas por RLS e retenção limitada.

## Technical Context

**Language/Version**: TypeScript 6.0, React 19, React Native 0.86 e JavaScript executado por Node.js e Expo 57

**Primary Dependencies**: Expo, React Navigation 7, React Native Paper 5, Supabase JS 2.106, TanStack React Query 5, AsyncStorage 2.2 e NetInfo 12; nenhuma dependência nova planejada

**Storage**: PostgreSQL/Supabase legado com RLS e migrations incrementais em `supabase/migrations/`; AsyncStorage para sessão, seleção/autorização de tenant, fila offline e buffer diagnóstico

**Testing**: Node built-in test runner, TypeScript sem emissão, ESLint, testes unitários/contrato/integração/persistência e jornadas manuais no Expo Web e em dispositivo móvel

**Target Platform**: Navegadores modernos, Android e iOS por Expo, com conectividade intermitente nos fluxos que já suportam fila offline

**Project Type**: Aplicativo cliente multiplataforma integrado diretamente ao Supabase Auth, Data API e funções PostgreSQL

**Performance Goals**: Classificação e sanitização puras, síncronas e sem I/O de rede/armazenamento; feedback inicial de falha em até 1 segundo após a resposta; buffer local limitado a 200 eventos por escopo; sincronização diagnóstica em lotes de até 50 eventos; sem consultas adicionais em renderizações normais

**Constraints**: Banco legado como único ambiente; sem reativar o banco abortado; sem alteração direta em produção; sem expor segredos; isolamento por tenant; comportamento offline determinístico; migrations somente para falhas reproduzidas, com validação e rollback documentado; preservação dos fluxos existentes

**Scale/Scope**: 51 arquivos de telas, 73 arquivos de serviços, 60 arquivos de teste e 33 migrations existentes; adoção inicial obrigatória nos fluxos de login, painel, ciclo, venda e despesa, seguida das demais criações e reenvios ativos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Gate inicial

| Princípio | Resultado | Evidência no desenho |
|---|---|---|
| I. Preservação do comportamento | PASS | Adoção incremental sobre serviços e telas existentes, sem reescrita arquitetural ou mudança de regra de negócio fora da spec. |
| II. Integridade e segurança | PASS | Contexto sanitizado, RLS, menor privilégio, confirmação explícita de escrita, rollback de migration e isolamento por tenant. |
| III. Offline-first | PASS | Chave lógica preservada na fila, estados pendente/confirmado/terminal, buffer diagnóstico local e sincronização por escopo autenticado. |
| IV. Qualidade verificável | PASS | Cada categoria, fronteira e correção terá testes proporcionais ao risco e regressão dos cinco fluxos essenciais. |
| V. Evolução incremental | PASS | Nenhuma dependência nova; helpers atuais serão estendidos por pequenos contratos testáveis. |
| VI. Domínio produtivo exclusivo | PASS | O trabalho permanece nos módulos ativos de estufas e não reativa campo, talhões ou hidroponia. |
| VII. Persistência controlada | PASS | Apenas migrations incrementais no banco legado; nenhum novo projeto, cutover ou cópia de dados. |
| Git e produção | PASS | O plano não autoriza commit, push ou aplicação remota de migration. |

Não há violações constitucionais nem justificativas de complexidade pendentes.

## Project Structure

### Documentation (this feature)

```text
specs/007-tratamento-erros-app-banco/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── error-handling-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Gerado posteriormente por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── contexts/
│   └── FeedbackContext.tsx        # Apresentação de feedback acionável
├── hooks/
│   └── queries/                   # Estado degradado e bloqueio por dependência
├── screens/                       # Adoção nos fluxos essenciais e demais escritas
├── services/
│   ├── serviceError.ts            # Taxonomia, normalização e sanitização
│   ├── compoundRead.ts            # Resultado por fonte sem descartar dados válidos
│   ├── diagnosticEvidence.ts      # Buffer, retenção e sincronização de evidências
│   ├── operationResult.ts         # Estados e mensagens de operação
│   └── offline/
│       ├── offlineQueueStorage.ts # Chave lógica e resultado de reenvio
│       └── syncServiceCore.ts     # Sincronização determinística
└── types/                         # Tipos de domínio e Supabase regenerados

supabase/
├── migrations/                    # Tabela diagnóstica, RLS e RPCs justificadas
└── tests/                         # Contratos SQL/RLS, quando suportados localmente

tests/
├── contract/                      # Sanitização e contratos app ↔ persistência
├── integration/                   # Escrita, retry, offline e reconciliação
├── persistence/                   # Migration, RLS, constraints e atomicidade
└── *.test.ts                      # Helpers e regressões de interface
```

**Structure Decision**: Manter o aplicativo único e os serviços atuais. Tipos e regras puras ficam em helpers sob `src/services`; persistência continua nos serviços de domínio; somente escritas encadeadas que precisam de transação migram para RPCs específicas. A evidência diagnóstica não reutiliza `rastreabilidade_eventos`, pois aquela tabela representa eventos de negócio exibíveis ao usuário.

## Implementation Strategy

### Phase A — Contrato comum e adoção segura

1. Estender `ServiceError` com código estável, ação, fonte, mensagem segura, próximo passo, repetibilidade, correlação e sanitização recursiva antes de qualquer persistência local ou remota.
2. Mapear erros conhecidos de validação, Auth, PostgREST, rede e conflito sem apresentar mensagens técnicas brutas.
3. Criar `OperationResult` para distinguir pendente, confirmado, degradado, repetível, parcial e terminal.
4. Adaptar feedback e telas essenciais por fluxo, mantendo fallback compatível para erros ainda não migrados.

### Phase B — Leituras compostas e sessão

1. Fazer `readCompound` retornar o resultado de todas as fontes, inclusive quando uma essencial falhar.
2. Marcar dependências bloqueadas por fonte, preservando dados e ações independentes.
3. Descartar respostas que pertençam a sessão ou tenant diferente do contexto que iniciou a operação.
4. Invalidar ações protegidas após expiração ou revogação de permissão.

### Phase C — Idempotência, atomicidade e reconciliação

1. Gerar uma chave UUID por tentativa lógica antes da primeira escrita e preservá-la em retry, fila e reinício.
2. Usar ID de entidade estável como chave nas criações simples; repetir a mesma tentativa deve recuperar o resultado confirmado, não criar uma nova linha.
3. Para agregados com várias escritas, usar um recibo idempotente e uma RPC transacional somente após reproduzir a falha parcial.
4. Quando a transação não for possível, registrar etapas concluídas e uma reconciliação explícita e repetível.

### Phase D — Evidência diagnóstica e banco legado

1. Manter buffer local sanitizado por usuário e tenant, por no máximo 7 dias ou 200 eventos, o que ocorrer primeiro.
2. Sincronizar lotes de até 50 eventos para `diagnostic_events` quando houver sessão, tenant e conectividade válidos.
3. Reter eventos remotos por 30 dias; registros expirados serão imediatamente ocultados das leituras e removidos por limpeza por tenant disparada em nova inserção, além da exclusão administrativa explícita.
4. Aplicar RLS de inserção para membro autenticado e leitura/exclusão somente para quem satisfizer `can_manage_sharing_tenant(tenant_id)`; não permitir update.
5. Regenerar tipos somente após a migration local ser validada e manter rollback documentado.

### Phase E — Validação e expansão

1. Validar primeiro login, painel, ciclo, venda e despesa.
2. Cobrir as oito categorias, os quatro estados principais de escrita, falha parcial, troca de tenant, clique duplo e reconexão, calculando explicitamente o percentual de SC-007.
3. Fechar cada linha do inventário de criações e reenvios com implementação e teste ou justificativa documentada de não aplicabilidade, sem refatoração oportunista.
4. Executar suíte completa e jornadas manuais web/móvel antes de qualquer pedido separado de aplicação remota.

## Post-Design Constitution Check

O desenho da Phase 1 mantém todos os gates como **PASS**:

- O modelo adiciona apenas `diagnostic_events` e, para agregados comprovadamente vulneráveis, recibos/RPCs idempotentes por migration incremental.
- O contrato proíbe mensagens técnicas brutas, segredos, dados de outro tenant e sucesso sem confirmação; sanitização recursiva é gate da fundação antes do buffer diagnóstico.
- A fila preserva identidade de usuário, tenant e operação lógica, e revalida autorização antes do reenvio.
- RLS, grants, índices e testes allow/deny fazem parte da mesma mudança de persistência.
- O quickstart usa testes TypeScript, contratos SQL estáticos e jornadas controladas; não utiliza Docker ou Supabase local e não autoriza execução de migration, produção, commit ou push.
- Não há dependências novas, reativação do banco abortado ou alteração do domínio produtivo.

## Complexity Tracking

Não aplicável. O plano reutiliza a arquitetura existente e não introduz violação constitucional.

