# Relatório de Ordens de Melhoria para Implementação

Projeto: Estufa2
Objetivo: orientar o time de desenvolvimento sobre a ordem correta de execução das melhorias, com contexto técnico, justificativa, impacto, passos detalhados, dependências, critérios de aceite e definição de pronto.

---

## 1. Resumo executivo

Este projeto não precisa ser refeito do zero.
Ele precisa de uma sequência disciplinada de estabilização, hardening e profissionalização.

A recomendação para o time é não sair refatorando tudo ao mesmo tempo.
A ordem importa.

Se os devs começarem por mudanças estéticas ou refactors grandes antes de estabilizar testes, ambiente e fluxos críticos, o risco é alto de:
- quebrar funcionalidades que hoje já operam
- perder rastreabilidade do que foi alterado
- aumentar tempo de correção
- gastar energia onde o retorno é menor

A ordem correta de execução é:

1. Estabilizar base de engenharia
2. Garantir reprodutibilidade e qualidade mínima
3. Blindar fluxos críticos com testes
4. Corrigir riscos de segurança, permissão e isolamento
5. Endurecer tipagem e contratos
6. Refatorar arquivos e serviços críticos
7. Melhorar observabilidade, documentação e operação
8. Só depois acelerar novas features

Em outras palavras:
primeiro tirar risco, depois organizar, depois escalar.

---

## 2. Premissas técnicas usadas neste relatório

Baseado na análise anterior do projeto, foram confirmados os seguintes pontos:

- stack principal com Expo, React Native, TypeScript, React Query e Supabase
- typecheck passando
- expo-doctor passando
- suíte de testes falhando atualmente
- baixa cobertura automatizada para o tamanho da base
- TypeScript com strict desabilitado
- uso elevado de any/as any
- existência de arquivos muito grandes com múltiplas responsabilidades
- presença de multi-tenant, RBAC, offline queue, dashboard, financeiro e rastreabilidade
- backend com migrations, RPCs e sinais de RLS
- existência de suporte operacional em portal separado

Arquivos e áreas já mapeadas como sensíveis:
- src/contexts/AuthContext.tsx
- src/services/supabaseClient.ts
- src/services/tenantGuard.ts
- src/lib/accessControl.ts
- src/services/authBridge.ts
- src/services/offline/syncService.ts
- src/services/offline/offlineStorage.ts
- src/services/dashboardService.ts
- src/services/globalStatsService.ts
- src/services/shareService.ts
- src/services/publicTraceabilityService.ts
- src/services/rentabilidadeService.ts
- src/screens/Dashboard/DashboardScreen.tsx
- tests/rentabilidadeService.test.ts
- supabase/migrations/*
- support-portal/*

Arquivos grandes destacados para futura refatoração:
- VendasListScreen
- ColheitaFormScreen
- receiptService
- HidroponiaEstufaLayoutScreen
- ShareAccountScreen

---

## 3. Estratégia geral de execução

### 3.1 Regra principal
Não executar refactors estruturais grandes antes de:
- corrigir a suíte de testes
- criar baseline de validação
- mapear fluxos críticos
- validar segurança de tenant/permissão

### 3.2 Regra de prioridade
Toda melhoria deve ser classificada por impacto em uma destas categorias:

- P0 = risco operacional ou de segurança imediata
- P1 = risco alto de manutenção, regressão ou inconsistência funcional
- P2 = melhoria importante de qualidade e escalabilidade
- P3 = melhoria recomendada, mas não urgente

### 3.3 Definição de fases
Este relatório está organizado em 6 frentes sequenciais:

- Fase 0: estabilização imediata
- Fase 1: qualidade mínima obrigatória
- Fase 2: blindagem dos fluxos críticos
- Fase 3: segurança, multi-tenant e governança de dados
- Fase 4: refatoração técnica da base
- Fase 5: operação, documentação e escala

---

## 4. Ordem recomendada das melhorias

# FASE 0 — ESTABILIZAÇÃO IMEDIATA

Objetivo da fase:
parar de operar no escuro e garantir que o projeto possa ser validado de forma consistente a cada alteração.

Prazo sugerido:
3 a 5 dias úteis

Prioridade:
P0

### 4.1 Corrigir a suíte de testes que está falhando

Status atual:
- npm test falhando
- evidência anterior em tests/rentabilidadeService.test.ts
- erro relacionado a resolução de módulos/imports

Por que vem primeiro:
Se os testes já falham na base atual, o time perde confiança em qualquer correção posterior.
Sem isso, não existe baseline confiável.

Objetivo técnico:
fazer a suíte inteira rodar verde em máquina local e depois em pipeline.

Passos detalhados:
1. Identificar exatamente o runner de teste usado hoje e sua configuração real.
2. Mapear resolução de aliases/imports usados em src/ e tests/.
3. Corrigir discrepâncias entre ambiente de app e ambiente de teste.
4. Revisar padrão ESM/CommonJS/TS usado na suíte.
5. Corrigir mocks, imports indiretos e dependências que só funcionam dentro do runtime Expo.
6. Garantir que todos os testes existentes executem sem intervenção manual.
7. Documentar o comando oficial de teste no README técnico.

Arquivos prováveis de intervenção:
- tests/rentabilidadeService.test.ts
- package.json
- possíveis arquivos de config de teste, babel ou tsconfig relacionados
- serviços importados por rentabilidadeService.ts

Critérios de aceite:
- npm test executa localmente sem falha
- todos os testes atuais passam
- nenhum teste depende de ajuste manual no ambiente
- comando de teste documentado

Definição de pronto:
- evidência do output verde salva em PR ou pipeline
- causa raiz do problema registrada
- time inteiro consegue reproduzir

---

### 4.2 Criar baseline de qualidade obrigatória no repositório

Por que é segunda tarefa:
Antes de mexer no coração do sistema, o time precisa de um mínimo de ritual técnico.

Objetivo técnico:
padronizar os checks obrigatórios de validação.

Passos detalhados:
1. Definir quais comandos são obrigatórios antes de merge:
   - typecheck
   - testes
   - lint
   - build/check do app quando aplicável
2. Adicionar scripts explícitos no package.json se ainda não existirem.
3. Padronizar nomenclatura dos scripts.
4. Registrar no README técnico a sequência mínima de validação.
5. Criar checklist de PR curto para o time.

Critérios de aceite:
- package.json contém scripts claros e oficiais
- qualquer dev sabe qual comando rodar antes de subir PR
- o projeto tem uma trilha mínima de validação local

Definição de pronto:
- comandos e checklist documentados
- scripts executáveis sem ambiguidade

---

### 4.3 Implantar lint e formatação se ainda não estiverem operacionais

Observação:
na análise inicial não apareceu esteira visível de lint/format como padrão consolidado.

Objetivo técnico:
reduzir ruído de estilo, organizar consistência e evitar discussões subjetivas em PR.

Passos detalhados:
1. Confirmar se já existe ESLint/Prettier configurado em outro local.
2. Se não existir, implantar padrão mínimo compatível com Expo/TypeScript.
3. Definir regras iniciais enxutas, sem tentar resolver tudo de uma vez.
4. Rodar autofix onde for seguro.
5. Separar problemas automáticos de problemas semânticos.
6. Não bloquear o time com regra exagerada na primeira semana.

Critérios de aceite:
- lint roda com comando oficial
- formatter roda com comando oficial
- regras iniciais aprovadas pelo time
- base formatada de forma consistente

Definição de pronto:
- lint/format integrados ao fluxo de PR

---

# FASE 1 — QUALIDADE MÍNIMA OBRIGATÓRIA

Objetivo da fase:
criar segurança para continuar evoluindo o sistema sem regressão silenciosa.

Prazo sugerido:
1 a 2 semanas

Prioridade:
P1

### 4.4 Mapear e classificar os fluxos críticos do negócio

Por que isso é essencial:
O sistema já é grande demais para testar tudo de forma aleatória.
É preciso saber o que quebra mais a operação se falhar.

Fluxos que devem ser classificados primeiro:
- autenticação
- troca/seleção de tenant
- memberships e compartilhamento de conta
- RBAC e permissões por perfil
- vendas
- despesas
- caixa / financeiro
- rentabilidade
- dashboard financeiro
- sincronização offline
- rastreabilidade pública

Entregável esperado:
uma matriz simples com colunas:
- fluxo
- criticidade
- impacto se falhar
- área dona
- cobertura atual
- cobertura necessária

Critérios de aceite:
- todos os fluxos críticos listados e priorizados
- cada fluxo tem dono técnico
- time concorda sobre ordem de blindagem

---

### 4.5 Aumentar cobertura automatizada dos fluxos críticos

Contexto:
A base tem cerca de 172 arquivos TS/TSX e aproximadamente 7 arquivos de teste com ~238 linhas, o que é insuficiente para um sistema com financeiro, permissões e offline.

Objetivo técnico:
blindar primeiro o que gera risco de perda financeira, dados incorretos, falha de acesso ou inconsistência entre tenants.

Ordem recomendada dos testes:
1. autenticação e sessão
2. tenant guard / membership / compartilhamento
3. RBAC / accessControl
4. serviços financeiros e rentabilidade
5. offline queue e sincronização
6. dashboard e agregações principais
7. rastreabilidade pública

Tipos de teste recomendados:
- unitários para regras puras
- integração para services e composição de chamadas
- testes de contrato para payloads críticos
- testes de regressão para bugs reais já encontrados

Arquivos prioritários para começar:
- src/contexts/AuthContext.tsx
- src/services/tenantGuard.ts
- src/lib/accessControl.ts
- src/services/shareService.ts
- src/services/rentabilidadeService.ts
- src/services/offline/syncService.ts
- src/services/dashboardService.ts

Critérios de aceite:
- toda área crítica possui ao menos cobertura mínima automatizada
- bugs já conhecidos viram testes de regressão
- novas correções não entram sem teste associado em áreas sensíveis

Definição de pronto:
- pacote mínimo de testes cobrindo fluxos centrais
- relatório de cobertura ou evidência equivalente do crescimento da blindagem

---

### 4.6 Criar pipeline de CI para validação automática

Objetivo técnico:
garantir que ninguém quebre typecheck, testes ou lint sem ser alertado antes do merge.

Passos detalhados:
1. Escolher ferramenta de CI compatível com o repositório atual.
2. Definir pipeline mínima:
   - install
   - typecheck
   - lint
   - test
3. Se existir build mobile automatizável, avaliar job separado.
4. Configurar gatilho para PR e branch principal.
5. Publicar badge ou evidência do status no repositório.

Critérios de aceite:
- todo PR executa validações automáticas
- falha em teste/lint/typecheck bloqueia merge
- pipeline é reproduzível

Definição de pronto:
- CI ativa e usada como regra oficial do time

---

# FASE 2 — BLINDAGEM DOS FLUXOS CRÍTICOS

Objetivo da fase:
eliminar os principais riscos funcionais e de negócio.

Prazo sugerido:
2 a 4 semanas

Prioridade:
P1 alto

### 4.7 Revisar autenticação ponta a ponta

Áreas principais:
- src/contexts/AuthContext.tsx
- src/services/authBridge.ts
- src/services/supabaseClient.ts

O que verificar detalhadamente:
- criação e renovação de sessão
- tratamento de expiração de token
- estados de loading e erro
- troca de tenant após login
- comportamento em logout
- sessão perdida offline/online
- tratamento de usuário parcialmente carregado

Riscos se não for feito:
- usuário sem contexto correto
- acesso indevido
- inconsistência de sessão
- erros intermitentes difíceis de reproduzir

Critérios de aceite:
- fluxos de login/logout/sessão documentados
- testes cobrindo os estados críticos
- sem comportamento ambíguo em troca de tenant

---

### 4.8 Revisar isolamento multi-tenant e memberships

Áreas principais:
- src/services/tenantGuard.ts
- src/services/shareService.ts
- migrations e policies do Supabase

Objetivo técnico:
garantir que um usuário nunca veja, altere ou compartilhe dados de tenant incorreto.

O que revisar:
- seleção do tenant ativo
- validação de membership
- compartilhamento e resgate de acesso
- escopo de queries
- efeitos colaterais em cache local
- coerência entre frontend e policies do banco

Perguntas que precisam ser respondidas pelos devs:
- toda query sensível filtra por tenant de forma inequívoca?
- existe fallback perigoso quando tenant não está carregado?
- o banco bloqueia acesso cruzado mesmo se o frontend falhar?
- o fluxo de share/redeem tem auditoria suficiente?

Critérios de aceite:
- validação explícita de tenant em fluxos críticos
- testes de acesso negado e acesso permitido
- alinhamento entre regra no app e regra no banco

---

### 4.9 Revisar RBAC e permissões por papel

Área principal:
- src/lib/accessControl.ts

Objetivo técnico:
ter um modelo de autorização previsível, testável e sem brechas implícitas.

O que melhorar:
- centralizar regras de permissão
- remover condicionais espalhadas em telas quando possível
- garantir nomenclatura consistente de perfis/capacidades
- adicionar testes por perfil
- validar telas e ações sensíveis, não apenas visibilidade visual

Risco atual se ignorado:
- usuário vê ação que não deveria
- usuário executa operação sem autorização adequada
- regra divergente entre backend e frontend

Critérios de aceite:
- matriz de permissão formalizada
- testes cobrindo perfis principais
- qualquer ação crítica depende de regra central

---

### 4.10 Revisar fluxos financeiros e de rentabilidade

Áreas principais:
- src/services/rentabilidadeService.ts
- serviços relacionados a vendas, despesas, caixa e recebíveis
- dashboard financeiro

Objetivo técnico:
garantir integridade de cálculo e confiança dos números apresentados ao usuário.

O que deve ser validado:
- consistência de entradas e saídas
- regras de agregação
- tratamento de valores nulos ou faltantes
- arredondamento e precisão
- coerência temporal de filtros e períodos
- impacto de dados parcialmente sincronizados
- comportamento com tenant vazio ou usuário sem permissão

Ação recomendada:
criar conjunto específico de testes de regressão para casos financeiros.

Critérios de aceite:
- cenários financeiros centrais cobertos por testes
- cálculo de rentabilidade validado contra casos conhecidos
- dashboards não exibem valores inconsistentes sem tratamento

---

### 4.11 Revisar fila offline e sincronização

Áreas principais:
- src/services/offline/syncService.ts
- src/services/offline/offlineStorage.ts

Objetivo técnico:
assegurar que o modo offline não gere duplicidade, perda ou conflito silencioso.

Pontos de revisão obrigatória:
- ordem de reprocessamento da fila
- idempotência
- reenvio após falha
- tratamento de conflitos
- persistência local
- limpeza de itens processados
- impacto em operações financeiras e de estoque/cultivo

Riscos se ignorado:
- duplicação de registros
- perda de ação do usuário
- divergência entre app local e backend
- bugs difíceis de reproduzir em campo

Critérios de aceite:
- cenários offline/online cobertos com testes
- política clara para conflito e retry
- logging mínimo para auditoria de sync

---

# FASE 3 — SEGURANÇA, DADOS E GOVERNANÇA

Objetivo da fase:
garantir que a base seja segura e operável após a transição de propriedade.

Prazo sugerido:
1 a 3 semanas, em paralelo controlado com a fase 2

Prioridade:
P0/P1 dependendo do achado

### 4.12 Revisar RLS, policies e RPCs do Supabase

Áreas principais:
- supabase/migrations/*
- funções e policies relacionadas a memberships, compartilhamento e leitura pública

Objetivo técnico:
confirmar que a segurança não depende só do frontend.

Checklist detalhado:
- toda tabela sensível tem policy explícita?
- policies filtram corretamente por tenant e papel?
- RPCs validam contexto do usuário?
- existe função com privilégio excessivo?
- endpoints públicos expõem apenas o necessário?
- existe inconsistência entre regra declarada e regra realmente usada pelo app?

Critérios de aceite:
- inventário de policies e RPCs críticas
- revisão concluída das tabelas sensíveis
- lacunas registradas e corrigidas

---

### 4.13 Mapear e sanear segredos, ambiente e dependências externas

Contexto:
foi identificado .env no projeto e dependência operacional de infraestrutura externa.

Objetivo técnico:
garantir transição segura e continuidade operacional após a compra.

O que precisa ser feito:
1. Inventariar todos os serviços externos usados.
2. Identificar dono atual de cada credencial.
3. Rotacionar segredos após transferência quando aplicável.
4. Separar credenciais por ambiente.
5. Criar .env.example sem valores reais.
6. Validar quais segredos são obrigatórios para app, portal, banco e integrações.
7. Documentar processo de onboarding do ambiente.

Critérios de aceite:
- nenhum segredo crítico depende exclusivamente do antigo dono
- ambiente pode ser recriado por documentação
- segredos sensíveis não ficam expostos em arquivos indevidos

---

### 4.14 Revisar rastreabilidade pública e superfícies expostas

Área principal:
- src/services/publicTraceabilityService.ts
- endpoints/consultas públicas relacionados

Objetivo técnico:
garantir que exposição pública não vaze dados privados nem metadados sensíveis.

Itens de revisão:
- dados exibidos publicamente
- enumeração de registros
- previsibilidade de ids/chaves
- rate limiting, se aplicável
- comportamento com item inexistente
- dados de tenant ocultos por padrão

Critérios de aceite:
- superfície pública minimizada
- payload público revisado e justificado
- testes de acesso público válidos

---

# FASE 4 — REFATORAÇÃO TÉCNICA DA BASE

Objetivo da fase:
reduzir dívida técnica estrutural que encarece manutenção e aumenta fragilidade.

Prazo sugerido:
3 a 6 semanas, de forma incremental

Prioridade:
P2

### 4.15 Habilitar endurecimento progressivo do TypeScript

Contexto:
strict está desabilitado e existem centenas de usos de any.

Objetivo técnico:
aumentar segurança estática sem travar o time com uma big bang refactor.

Estratégia recomendada:
1. Não ativar strict total em um único PR grande.
2. Criar plano incremental por pasta ou domínio.
3. Priorizar services, auth, tenant, financeiro e offline.
4. Trocar any por tipos reais, unknown, generics ou DTOs explícitos.
5. Reduzir as any primeiro onde há cálculo, permissão ou payload remoto.
6. Adicionar tipos de retorno para services principais.

Critérios de aceite:
- redução contínua de any/as any
- áreas críticas com tipos explícitos
- regras novas proibindo introdução de novos any sem justificativa

Definição de pronto:
- baseline de tipagem mais segura nas áreas de maior risco

---

### 4.16 Quebrar arquivos grandes demais e com responsabilidade excessiva

Contexto:
foram identificados arquivos com mais de mil linhas em áreas críticas e de interface.

Arquivos inicialmente candidatos:
- VendasListScreen
- ColheitaFormScreen
- receiptService
- HidroponiaEstufaLayoutScreen
- ShareAccountScreen
- DashboardScreen

Objetivo técnico:
reduzir acoplamento, facilitar teste e diminuir chance de regressão em mudanças pequenas.

Como executar corretamente:
1. Não sair quebrando tudo antes de haver teste mínimo.
2. Escolher um arquivo por vez.
3. Mapear responsabilidades internas:
   - UI
   - estado
   - transformação de dados
   - side effects
   - acesso a serviço
   - validação
4. Extrair primeiro código puro e reutilizável.
5. Extrair hooks e componentes menores depois.
6. Garantir testes de regressão antes e depois da separação.

Critérios de aceite:
- arquivo reduzido a responsabilidades compreensíveis
- regras de negócio menos espalhadas na UI
- complexidade cognitiva menor
- cobertura preservada ou ampliada

---

### 4.17 Revisar arquitetura de services e contratos de dados

Objetivo técnico:
padronizar como os serviços recebem parâmetros, retornam dados e tratam erro.

Problemas comuns a procurar:
- services retornando shapes inconsistentes
- tratamento de erro não padronizado
- null/undefined sem contrato claro
- transformação de payload espalhada entre tela, hook e service
- responsabilidade duplicada entre dashboardService, globalStatsService e hooks

Áreas importantes:
- src/services/dashboardService.ts
- src/services/globalStatsService.ts
- src/hooks/useDashboardMetrics.ts
- src/hooks/queries/useDashboardSummary.ts
- services financeiros e compartilhamento

Critérios de aceite:
- contratos previsíveis para retorno e erro
- transformação de dados centralizada
- menos lógica sensível em telas

---

### 4.18 Revisar uso de console e logging improvisado

Contexto:
foram encontradas dezenas de ocorrências de console.

Objetivo técnico:
substituir logging solto por estratégia mínima e útil de observabilidade.

Passos:
1. Mapear consoles por criticidade.
2. Remover logs de debug sem valor.
3. Manter logs estruturados nos fluxos onde ajudam diagnóstico.
4. Padronizar helper de logging, se necessário.
5. Garantir que produção não fique poluída.

Critérios de aceite:
- redução de ruído
- logs úteis nos fluxos críticos
- nenhum dado sensível exposto em log

---

# FASE 5 — OPERAÇÃO, DOCUMENTAÇÃO E ESCALA

Objetivo da fase:
transformar o projeto de “base funcional” em “ativo operável por time novo”.

Prazo sugerido:
2 a 4 semanas

Prioridade:
P2/P3

### 4.19 Documentar arquitetura e handover técnico real

Objetivo técnico:
permitir que qualquer novo dev entenda como subir, testar, validar e operar o sistema.

Documentos mínimos recomendados:
- README técnico principal
- mapa de módulos
- fluxos críticos do negócio
- guia de ambiente local
- guia de deploy/build
- guia de credenciais e integrações
- guia de troubleshooting
- guia de suporte do support-portal

Critérios de aceite:
- um novo dev sobe o projeto com documentação
- dependências externas estão listadas
- build e testes têm instrução clara

---

### 4.20 Revisar support-portal como sistema acoplado

Área principal:
- support-portal/*

Objetivo técnico:
tratar o portal como parte relevante da operação, não como pasta esquecida.

O que validar:
- como autentica
- quais dados consome
- se usa credenciais próprias
- como é publicado
- se tem dependência direta do backend principal
- se precisa do mesmo nível de observabilidade e controle de acesso

Critérios de aceite:
- portal documentado
- risco operacional mapeado
- fluxo de deploy e suporte entendido

---

### 4.21 Criar monitoramento mínimo para erros e saúde operacional

Objetivo técnico:
ter visibilidade real de falhas após a entrada em produção.

Recomendação mínima:
- captura de erro em app
- rastreio de falhas críticas em auth, sync e financeiro
- monitoramento de RPCs ou serviços sensíveis
- logging de eventos de falha importantes

Critérios de aceite:
- time consegue detectar falhas sem depender só de relato manual do usuário
- erros críticos têm trilha mínima de diagnóstico

---

## 5. Backlog priorizado resumido

### P0 — fazer imediatamente
1. Corrigir suíte de testes
2. Definir scripts oficiais de validação
3. Implantar lint/format mínimos
4. Criar CI básica
5. Revisar autenticação, tenant e permissões nos pontos mais sensíveis
6. Mapear segredos e dependências externas

### P1 — fazer logo em seguida
7. Criar cobertura de testes para auth, tenant, RBAC, financeiro e offline
8. Revisar rentabilidade, vendas, despesas e dashboard financeiro
9. Revisar fila offline e política de sincronização
10. Revisar RLS, policies e RPCs críticas
11. Revisar rastreabilidade pública

### P2 — fazer na sequência
12. Endurecer TypeScript de forma progressiva
13. Refatorar arquivos grandes e services centrais
14. Padronizar contratos de services e tratamento de erro
15. Reduzir console/logging improvisado
16. Documentar arquitetura, ambiente e operação

### P3 — evolução contínua
17. Melhorar observabilidade
18. Revisar experiência operacional do support-portal
19. Melhorar cobertura para áreas menos críticas
20. Otimizar performance e organização de módulos secundários

---

## 6. Ordem prática para distribuir ao time

Sugestão de distribuição por frente de trabalho:

### Frente A — Estabilização e qualidade
Responsável por:
- testes quebrados
- scripts de validação
- lint/format
- CI

### Frente B — Segurança e governança
Responsável por:
- auth
- tenant guard
- RBAC
- RLS/policies/RPCs
- segredos e ambiente

### Frente C — Fluxos críticos do negócio
Responsável por:
- financeiro
- rentabilidade
- dashboard
- sincronização offline
- rastreabilidade pública

### Frente D — Refatoração e arquitetura
Responsável por:
- redução de any
- extração de serviços/hooks/componentes
- quebra de arquivos grandes
- padronização de contratos

### Frente E — Operação e handover
Responsável por:
- documentação técnica
- support-portal
- monitoramento e troubleshooting

Observação importante:
A Frente D não deve sair refatorando antes da Frente A criar segurança mínima.

---

## 7. Critérios globais de pronto para o projeto pós-melhoria

O projeto deve ser considerado tecnicamente estabilizado quando atingir, no mínimo:

- testes existentes corrigidos e estáveis
- CI validando automaticamente os checks principais
- cobertura mínima nos fluxos críticos
- autenticação, tenant e RBAC revisados e testados
- serviços financeiros e offline com regressão básica coberta
- ambiente reproduzível por documentação
- segredos e infraestrutura mapeados
- arquivos mais críticos começando a ser modularizados
- redução visível de any nas áreas sensíveis

---

## 8. O que os devs não devem fazer agora

Para evitar desperdício e regressão, o time não deve começar por:

- redesign visual amplo
- refatoração geral da pasta src inteira de uma vez
- troca de stack sem necessidade
- migração grande de arquitetura sem baseline
- otimizações prematuras de performance sem resolver estabilidade
- criação de novas features antes de estabilizar o núcleo sensível

---

## 9. Recomendação final para liderança técnica

A forma certa de tocar este projeto é em ciclos curtos, com validação a cada etapa.

Sequência recomendada de governança:
- sprint 1: estabilização e baseline
- sprint 2: testes e blindagem dos fluxos críticos
- sprint 3: segurança, tenant e permissões
- sprint 4 em diante: refatoração orientada por risco

O maior erro possível agora seria tratar a base como pronta.
O segundo maior erro seria reescrever cedo demais.

A abordagem correta é:
- preservar o valor funcional existente
- eliminar os riscos maiores primeiro
- profissionalizar o ciclo de engenharia
- só então acelerar evolução de produto

---

## 10. Sugestão objetiva de primeira sprint

Se eu fosse passar a ordem para o time amanhã, eu abriria estes itens primeiro:

1. Corrigir npm test até ficar verde
2. Formalizar scripts de validação no package.json
3. Implantar lint e formatter mínimos
4. Criar pipeline de CI
5. Criar testes para tenantGuard, accessControl e rentabilidadeService
6. Revisar auth flow completo
7. Revisar shareService e fluxo de membership
8. Revisar syncService/offlineStorage com foco em duplicidade e retry
9. Inventariar segredos, serviços externos e variáveis de ambiente
10. Abrir plano de refatoração para DashboardScreen e receiptService

---

## 11. Fechamento

Este projeto tem valor e merece ser preservado.
Mas ele precisa entrar numa rotina de engenharia mais madura.

A ordem das melhorias é tão importante quanto as melhorias em si.

Se o time seguir a sequência deste relatório, a chance de transformar a base atual em um ativo confiável aumenta bastante.
Se inverter a ordem e começar por refactor amplo ou feature nova, o risco de retrabalho sobe muito.

Fim do relatório.
---

## Log de execucao

Atualizado em: 2026-06-14

Status geral:
- `[feito]` 4.1 Corrigir a suite de testes que estava falhando
- `[feito]` 4.2 Criar baseline de qualidade obrigatoria no repositorio
- `[feito]` 4.3 Implantar lint e formatacao se ainda nao estiverem operacionais
- `[feito]` 4.6 Criar pipeline de CI para validacao automatica

Melhorias executadas nesta rodada:
- Extracao da regra pura de rentabilidade para `src/services/rentabilidadeCore.ts`
- Ajuste de `tests/rentabilidadeService.test.ts` para testar o modulo puro
- Extracao do codec da fila offline para `src/services/offline/offlinePayloadCodec.ts`
- Simplificacao de `src/services/offline/offlineStorage.ts`
- Reducao de tipagem frouxa em `src/services/offline/offlineUtils.ts`
- Inclusao de `tests/offlinePayloadCodec.test.ts`
- Inclusao de `README.md` com comandos oficiais de validacao
- Inclusao de `eslint.config.mjs`, `.prettierrc.json` e `.prettierignore`
- Inclusao dos scripts `lint`, `lint:fix`, `format`, `format:check` e `validate` no `package.json`
- Ampliacao do workflow `.github/workflows/typecheck.yml` para rodar `typecheck`, `lint` e `test`
- Blindagem de troca de tenant em `src/contexts/AuthContext.tsx` para aceitar apenas tenants disponiveis
- Remocao de estado silencioso em `getSharedTenants`, agora falhas reais sobem como erro
- Extracao de helpers puros de auth/tenant para `src/services/authTenantHelpers.ts`
- Extracao de helpers puros de compartilhamento para `src/services/shareServiceHelpers.ts`
- Inclusao de `tests/authTenantService.test.ts` e `tests/shareService.test.ts`
- Extracao do mapeamento de usuario autenticado para `src/services/authBridgeHelpers.ts`
- Extracao da resolucao de storage key para `src/services/supabaseClientHelpers.ts`
- Inclusao de `tests/authBridgeHelpers.test.ts` e `tests/supabaseClientHelpers.test.ts`
- Extracao da logica pura de sincronizacao para `src/services/offline/syncServiceHelpers.ts`
- Endurecimento de `src/services/tenantGuard.ts` com `isTenantIdValid` e `assertSameTenantScope`
- Inclusao de `tests/syncServiceHelpers.test.ts` e ampliacao de `tests/tenantGuard.test.ts`
- Extracao da validacao/rate-limit de redeem para `src/services/shareRedeemHelpers.ts`
- Endurecimento de `src/services/securityService.ts` com helpers puros em `src/services/securityServiceHelpers.ts`
- Inclusao de `tests/shareRedeemHelpers.test.ts` e `tests/securityServiceHelpers.test.ts`

Evidencias validadas:
- `node --test tests/*.test.ts` verde com 54 testes passando
- `tsc --noEmit` verde
- `npm.cmd run lint` executando sem erro fatal
- `npm.cmd run validate` executando com sucesso
- backlog atual do lint: 61 warnings, concentrados principalmente em imports/variaveis nao usados

Proximos passos seguindo a ordem do relatorio:
1. Revisar consumidores de `securityService` e `shareService` nas telas sensiveis restantes
2. Ampliar cobertura automatizada dos fluxos de membership/share redeem com cenarios de erro e permissao
3. Atacar o backlog de 61 warnings do lint em lotes pequenos, sem misturar com os fluxos criticos
4. Entrar nas areas financeiras e dashboard conforme a proxima fase do relatorio

Atualizacao da rodada seguinte:
- Revisao dos consumidores de `securityService` em `SettingsScreen`, `EstufaDetailScreen`, `PlantioFormScreen` e `ColheitaFormScreen`
- Revisao do consumidor de `shareService` em `ShareAccountScreen`, removendo `user!`, normalizando codigo de convite e padronizando mensagens de erro/permissao
- Extracao dos helpers puros `src/services/securityUiHelpers.ts` e `src/services/shareAccountHelpers.ts`
- Inclusao de `tests/securityUiHelpers.test.ts` e `tests/shareAccountHelpers.test.ts`
- Ajuste dos testes novos para import ESM explicito com extensao `.ts`

Evidencias validadas apos esta rodada:
- `node --test tests/*.test.ts` verde com 54 testes passando
- `npm.cmd run typecheck` verde
- `npm.cmd run lint` verde com `61 warnings` e `0 errors`

Proximos passos atualizados:
1. Revisar os fluxos restantes que ainda consomem `securityService`/permissoes fora dessas telas principais, comecando por `EstufaFormScreen` e telas financeiras
2. Ampliar cobertura automatizada para erros/permissoes em membership, redeem e operacoes destrutivas
3. Atacar o backlog de `61 warnings` em lotes pequenos, sem misturar com fluxo critico
4. Entrar nas areas financeiras e dashboard conforme a proxima fase do relatorio

Atualizacao da rodada seguinte:
- Revisao dos consumidores restantes de erro/permissao em `src/screens/Estufas/EstufaFormScreen.tsx`, `src/screens/Financeiro/RelatoriosScreen.tsx` e `src/screens/Vendas/VendasListScreen.tsx`
- Padronizacao de tratamento de erro com `resolveServiceErrorMessage` nos fluxos de exportacao, extrato e operacoes sensiveis dessas telas
- Limpeza de warning morto em `src/screens/Vendas/VendasListScreen.tsx`, removendo import sem uso e isolando renderer legado fora do backlog critico
- Limpeza de imports/catch frouxo em `src/screens/Colheitas/ColheitaFormScreen.tsx`, removendo `sanitizeIntegerInput`, `loadColheitaFormBootstrap` e padronizando erro de cadastro rapido

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `54` testes passando
- `npm.cmd run lint` verde com `55 warnings` e `0 errors`

Proximos passos atualizados:
1. Atacar o proximo lote de warnings em telas e componentes de dashboard, mantendo fora dos fluxos ja estabilizados
2. Avancar na revisao de RBAC centralizado em `src/lib/accessControl.ts` e ampliar testes por perfil
3. Entrar na frente financeira/dashboard da proxima fase do relatorio com foco em contratos e regressao

Atualizacao da rodada seguinte:
- Endurecimento do RBAC central em `src/lib/accessControl.ts`, com sanitizacao de role compartilhado e fallback seguro para `guest`
- Extracao de helpers testaveis para resolucao de papel, permissoes padrao, permissoes efetivas e access role
- Blindagem contra payloads externos inconsistentes que antes podiam quebrar a resolucao de permissoes por cast direto
- Ampliacao de `tests/accessControl.test.ts` com cenarios de `owner`, `manager`, override explicito de permissoes e role invalido

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `59` testes passando
- `npm.cmd run lint` verde com `55 warnings` e `0 errors`

Proximos passos atualizados:
1. Atacar o lote pequeno de warnings em `src/components/dashboard/*` e componentes UI relacionados, que agora concentram parte relevante do backlog simples
2. Revisar a frente financeira/dashboard com foco em `dashboardService`, `globalStatsService` e hooks de agregacao
3. Tratar o warning recorrente de `MODULE_TYPELESS_PACKAGE_JSON` no setup de testes sem misturar com os fluxos criticos ja estabilizados

Atualizacao da rodada seguinte:
- Limpeza do lote simples de warnings em `src/components/dashboard/EstufaHub.tsx`, `HeroStats.tsx`, `ModuleGridItem.tsx`, `MoneyGrid.tsx`, `QuickActionCard.tsx` e `src/components/ui/MetricCard.tsx`
- Remocao de imports mortos nas camadas de dashboard/UI sem alterar comportamento visual nem regras de negocio
- Reducao do backlog de lint nas areas nao criticas antes de entrar na revisao financeira/dashboard mais profunda

Evidencias validadas apos esta rodada:
- `npm.cmd run lint` verde com `44 warnings` e `0 errors`
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `59` testes passando

Proximos passos atualizados:
1. Entrar na frente financeira/dashboard com foco em `dashboardService`, `globalStatsService`, `useDashboardMetrics` e `useDashboardSummary`
2. Tratar o warning recorrente de `MODULE_TYPELESS_PACKAGE_JSON` no setup de testes depois da rodada financeira
3. Voltar ao backlog restante de warnings por lotes pequenos, priorizando arquivos com baixo risco e alta densidade de ruido

Atualizacao da rodada seguinte:
- Correcao funcional em `src/hooks/useDashboardMetrics.ts`: `tarefasHojePendentes` agora respeita o valor agregado do resumo quando existir, em vez de sempre cair para `todayTasks.length`
- Extracao de normalizacao pura do resumo em `src/services/dashboardSummaryHelpers.ts`
- Extracao do calculo financeiro puro em `src/services/globalStatsHelpers.ts`
- Simplificacao de `src/services/dashboardService.ts` e `src/services/globalStatsService.ts` para consumir os helpers puros e reduzir regra embutida
- Ampliacao de `src/hooks/dashboardMetricsUtils.ts` com helper dedicado para resolver o contador exibido no dashboard
- Inclusao de cobertura em `tests/dashboardSummaryHelpers.test.ts`, `tests/globalStatsHelpers.test.ts` e ampliacao de `tests/dashboardMetricsUtils.test.ts`

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `66` testes passando
- `npm.cmd run lint` verde com `44 warnings` e `0 errors`

Proximos passos atualizados:
1. Tratar o warning recorrente de `MODULE_TYPELESS_PACKAGE_JSON` no setup de testes para remover ruido do runner e alinhar melhor ESM
2. Voltar ao backlog restante de warnings por lotes pequenos, priorizando hooks e telas de baixo risco
3. Aprofundar a frente financeira em contratos e consultas dos services restantes ligados a relatorios, performance por estufa e recebiveis

Atualizacao da rodada seguinte:
- Limpeza de warnings em hooks, telas e services fora da hidroponia, incluindo `useEstufaPerformance`, `useGeofenceValidation`, `AplicacaoFormScreen`, `AplicacoesHistoryScreen`, `TalhoesListScreen`, `DespesaFormScreen`, `DespesasListScreen`, `EstufaPerformanceScreen`, `RelatorioOperacionalScreen`, `InsumoEntryScreen`, `ManejoFormScreen`, `PerfilScreen`, `PlantioFormScreen`, `TarefasScreen`, `comprovanteUploadService`, `externalAutomationService`, `offlineStorage`, `receiptService` e `AuthContext`
- Remocao de imports mortos, catches com variavel nao usada e um state setter morto sem alterar comportamento funcional
- Reducao concentrada do backlog de lint fora dos modulos de hidroponia e do `support-portal`

Evidencias validadas apos esta rodada:
- `npm.cmd run lint` verde com `20 warnings` e `0 errors`
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `66` testes passando

Proximos passos atualizados:
1. Zerar os warnings restantes em `src/modules/hidroponia/*` e `support-portal/portal.js`
2. Depois disso, entrar no item seguinte da ordem proposta: endurecimento gradual de `strict` no TypeScript
3. Em seguida, ampliar testes de integracao para auth, tenant, share e offline sync

Atualizacao da rodada seguinte:
- Limpeza final dos warnings em `src/modules/hidroponia/*` e `support-portal/portal.js`
- Remocao de imports mortos, variaveis locais nao usadas e catches com variavel descartada nos modulos de hidroponia
- Fechamento completo do backlog de lint sem introduzir regressao funcional

Evidencias validadas apos esta rodada:
- `npm.cmd run lint` verde com `0 warnings` e `0 errors`
- `npm.cmd run typecheck` verde
- `node --test tests/*.test.ts` verde com `66` testes passando

Proximos passos atualizados:
1. Entrar no endurecimento gradual de `strict` no TypeScript, comecando por flags seguras e areas ja estabilizadas
2. Depois disso, ampliar testes de integracao para auth, tenant, share e offline sync
3. Na sequencia, quebrar telas e services grandes em modulos menores

Atualizacao da rodada seguinte:
- Ajuste do script oficial de testes em `package.json` para usar `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.ts`, removendo o warning recorrente do runner sem forcar mudanca ampla de modulo no app
- Primeiro endurecimento seguro do TypeScript em `tsconfig.json` com `useUnknownInCatchVariables: true`
- Validacao exploratoria de `noImplicitReturns` descartada por enquanto, porque a flag hoje estoura em codigo de dependencia dentro de `expo-file-system`, o que nao gera retorno imediato para a base do app

Evidencias validadas apos esta rodada:
- `npm run test` verde com `66` testes passando e sem warnings de `MODULE_TYPELESS_PACKAGE_JSON`
- `npm run typecheck` verde com `useUnknownInCatchVariables` habilitado
- `npm run lint` verde

Proximos passos atualizados:
1. Avancar no endurecimento gradual de TypeScript em flags e dominios que ja estao estabilizados, sem ativar `strict` total de uma vez
2. Entrar em testes de integracao para `auth`, `tenant`, `share` e `offline sync`
3. Depois disso, modularizar telas e services maiores com foco em `ShareAccountScreen`, `VendasListScreen` e fluxos financeiros

Atualizacao da rodada seguinte:
- Extracao de nucleos testaveis sem dependencias de runtime mobile em `src/services/authTenantBootstrapCore.ts`, `src/services/shareServiceCore.ts` e `src/services/offline/syncServiceCore.ts`
- Adequacao dos adapters de runtime em `src/services/authTenantService.ts`, `src/services/shareService.ts` e `src/services/offline/syncService.ts` para consumir esses nucleos
- Inclusao de testes de integracao/composicao para `auth`, `tenant`, `share` e `offline sync` em `tests/authTenantIntegration.test.ts`, `tests/tenantSelectionStorage.test.ts`, `tests/shareServiceIntegration.test.ts` e `tests/syncServiceIntegration.test.ts`
- Ajuste fino de imports ESM/type-only para permitir execucao limpa da suite Node sem carregar `react-native` acidentalmente

Evidencias validadas apos esta rodada:
- `npm.cmd run test` verde com `73` testes passando
- `npm.cmd run typecheck` verde
- `npm.cmd run lint` verde

Proximos passos atualizados:
1. Continuar o endurecimento gradual de TypeScript em dominios sensiveis, agora com a base de integracao ja blindada
2. Modularizar telas e services maiores, comecando por `ShareAccountScreen`, `VendasListScreen` e fluxos financeiros
3. Revisar contratos de erro e dados nos services restantes que ainda misturam infraestrutura com regra de negocio

Atualizacao da rodada seguinte:
- Substituicao do layout generico do comprovante individual por um template novo em `src/services/pdfService.ts`, alinhado ao modelo visual de referencia de comprovante de venda
- Integracao do fluxo de pos-venda para abrir o comprovante imediatamente apos cadastro de venda em `src/screens/Colheitas/ColheitaFormScreen.tsx` e `src/modules/hidroponia/screens/HidroponiaVendaFormScreen.tsx`
- Inclusao da busca de venda por colheita em `src/services/vendaService.ts` para permitir emissao automatica do comprovante no fluxo agricola tradicional
- Limpeza do warning residual de lint no service de PDF apos a troca do template ativo

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `npm.cmd run lint` verde com `0 warnings` e `0 errors`
- Fluxo novo de venda agora exibe acao `Comprovante` no sucesso, reutilizando a geracao de PDF do app

Proximos passos atualizados:
1. Refinar o template novo para aproximacao visual final com o comprovante de referencia, incluindo textos comerciais, rodape e identidade definitiva do nome do app quando voce concluir a troca de marca
2. Validar o fluxo real no aparelho com uma venda completa e confirmar compartilhamento/impressao em Android
3. Depois disso, seguir na modularizacao das telas grandes e no endurecimento adicional de contratos e tipagem

Atualizacao da rodada seguinte:
- Reestruturacao visual completa do modulo `Caixa` em `src/screens/Caixa/CaixaResumoScreen.tsx` e `src/screens/Caixa/CaixaExtratoScreen.tsx`, com cabecalhos mais fortes, cards de leitura rapida, filtros mais claros e navegacao mais coerente com a central financeira
- Correcao funcional no resumo do caixa para listar tambem as pessoas de caixa cadastradas sem movimento no periodo, evitando a falsa impressao de que o cadastro sumiu
- Melhoria da busca do extrato em `src/services/caixaService.ts`, agora cobrindo descricao, responsavel, cliente, observacoes, metodo de pagamento e origem
- Ajuste de leitura operacional no extrato para mostrar quantos registros estao carregados versus total filtrado, reduzindo confusao em listas paginadas

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `npm.cmd run lint` verde

Proximos passos atualizados:
1. Revisar a manutencao/cadastro de pessoas do caixa para deixar o fluxo administrativo tao claro quanto o fluxo de consulta
2. Continuar a frente visual no financeiro pelos pontos de maior uso diario, especialmente recebimentos e dashboards operacionais
3. Depois disso, voltar ao endurecimento progressivo de contratos e modularizacao das telas grandes

Atualizacao da rodada seguinte:
- Centralizacao do cadastro de responsaveis do caixa dentro de `src/screens/Caixa/CaixaResumoScreen.tsx`, evitando depender apenas dos modais espalhados em recebimentos e vendas
- Inclusao da secao visual `Equipe de caixa` com leitura imediata de quem esta cadastrado e CTA dedicado para novo responsavel
- Inclusao de modal administrativo no proprio resumo do caixa para cadastrar rapidamente quem pode receber/pagar no fluxo financeiro

Evidencias validadas apos esta rodada:
- `npm.cmd run typecheck` verde
- `npm.cmd run lint` verde

Proximos passos atualizados:
1. Melhorar agora a manutencao das pessoas do caixa com edicao/inativacao, para completar o fluxo administrativo
2. Seguir nas melhorias visuais do financeiro com foco em dashboards operacionais e leitura diaria
3. Depois disso, voltar ao endurecimento progressivo de contratos e modularizacao das telas grandes
