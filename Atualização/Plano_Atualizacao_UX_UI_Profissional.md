# Plano Profissional de Atualização UX/UI - SGE App

Versão: 1.0  
Data: 2026-05-18  
Status: Aprovado para execução técnica faseada

---

## 1. Resumo Executivo

Este documento formaliza a atualização completa de UX/UI do SGE para um modelo modular, moderno e orientado a produtividade no campo, preservando a estabilidade operacional atual.

A modernização será executada em camadas:

1. Navegação e estrutura visual global.
2. Design System unificado.
3. Migração progressiva de módulos críticos.
4. Rollout controlado com mecanismo de rollback.

Premissa central: **não quebrar as funções existentes** (regras de negócio, serviços Firebase, permissões e fluxos de dados já em produção).

---

## 2. Objetivos

## 2.1 Objetivos de negócio

1. Reduzir fricção de uso diário no campo.
2. Aumentar velocidade de execução das tarefas críticas (registro, movimentação, consulta).
3. Melhorar percepção de qualidade do produto (padrão SaaS premium).
4. Reduzir erros operacionais em fluxos de lançamento.

## 2.2 Objetivos técnicos

1. Consolidar navegação por módulos com barra inferior fixa.
2. Padronizar componentes e estados visuais (loading, erro, vazio, offline).
3. Habilitar evolução contínua sem retrabalho de UI.
4. Preservar compatibilidade com rotas e serviços atuais.

---

## 3. Escopo

## 3.1 Escopo incluído

1. Reorganização da navegação principal por módulos.
2. Definição e aplicação de Design System.
3. Implementação de FAB central para ações rápidas.
4. Padronização de listas, formulários, cards e cabeçalhos.
5. Melhorias de acessibilidade, contraste e usabilidade em campo.
6. Estratégia de rollout com feature flag.

## 3.2 Escopo excluído (fase posterior)

1. Scanner de código de barras.
2. Drag-and-drop Kanban avançado.
3. Integração de clima em tempo real.
4. Automações externas além das já existentes.

---

## 4. Princípios de Arquitetura de Produto

1. **Offline-first explícito**: sempre indicar estado de sincronização.
2. **Ação rápida acima de profundidade**: tarefas frequentes com no máximo 2 toques.
3. **Consistência visual rígida**: sem variações por tela fora do Design System.
4. **Progressive enhancement**: melhorias visuais sem alterar regras de negócio na mesma entrega.
5. **Segurança funcional**: sem regressão em permissões, tenant e persistência.

---

## 5. Arquitetura de Navegação Alvo

## 5.1 Estrutura principal

1. Bottom Tab fixa:
   - `Início`
   - `Hidroponia`
   - `Campo`
   - `Financeiro`
   - `Perfil`
2. FAB central:
   - Nova Leitura
   - Novo Manejo
   - Uso de Insumo
   - Registrar Venda
   - Nova Tarefa
3. Stack secundária:
   - Detalhes, formulários, históricos, configurações avançadas.

## 5.2 Regra de compatibilidade

1. Rotas legadas permanecem registradas na stack.
2. Atalhos antigos redirecionam para a aba correspondente quando aplicável.
3. Nenhum serviço de domínio será removido durante migração visual.

---

## 6. Design System (Especificação)

## 6.1 Tokens

1. Cores:
   - Modo Sol (alto contraste).
   - Modo escuro AMOLED real.
2. Tipografia:
   - Escala fixa para título, subtítulo, corpo, meta e legenda.
3. Espaçamento:
   - Grade 4/8 com tamanhos padronizados.
4. Bordas e raio:
   - Curvatura consistente por nível de componente.
5. Elevação:
   - Sombras e hierarquia de superfície.

## 6.2 Componentes base obrigatórios

1. `AppShell` (header + safe areas + tab context).
2. `ModuleHeader` (título, contexto, CTA principal).
3. `KpiCard` e `MetricRow`.
4. `ActionFab` + `QuickActionSheet`.
5. `StandardList` + `ListCard`.
6. `FormField`, `FieldGroup`, `InlineValidation`.
7. `OfflineSyncIndicator`.
8. `EmptyState` e `SkeletonState`.

## 6.3 Estados visuais mínimos

1. Idle
2. Loading
3. Success
4. Error
5. Empty
6. Offline pendente
7. Sincronizando
8. Sincronizado

---

## 7. Mapeamento Modular de Telas

## 7.1 Início

1. Dashboard de alertas e resumo.
2. Tarefas do dia e atalhos operacionais.

## 7.2 Hidroponia

1. Lotes.
2. Leituras pH/EC.
3. Motores e automações.
4. Colheita e venda hidroponia.

## 7.3 Campo

1. Estufas.
2. Plantios.
3. Manejos.
4. Colheitas de ciclo longo.

## 7.4 Financeiro

1. Vendas.
2. Despesas.
3. Contas a receber.
4. Relatórios.

## 7.5 Perfil

1. Dados da propriedade.
2. Configurações.
3. Compartilhamento e suporte.

---

## 8. Estratégia de Implementação sem Quebra

## 8.1 Isolamento por feature flag

1. Introduzir `ui_v2_enabled` em configuração local/remota.
2. Habilitar navegação nova apenas quando flag ativa.
3. Manter caminho de fallback imediato para UI atual.

## 8.2 Ordem técnica segura

1. Camada visual e navegação.
2. Migração de componentes reutilizáveis.
3. Migração de telas por módulo.
4. Refino de microinterações.

## 8.3 Regras de proteção

1. Nenhuma alteração em regras Firestore no mesmo PR de UI.
2. Nenhuma alteração de contrato de serviço no mesmo PR de layout.
3. Cobertura mínima de smoke tests por fluxo crítico.

---

## 9. Plano de Execução por Fases

## Fase 0 - Preparação

1. Inventário de telas e fluxos críticos.
2. Definição de baseline de métricas (tempo de tarefa, erros, abandono).
3. Ativação da flag `ui_v2_enabled`.

Critério de aceite:

1. Lista oficial de telas mapeadas.
2. Baseline publicada.
3. Feature flag operacional.

## Fase 1 - Fundação de UI

1. Implementar tokens finais.
2. Criar componentes base.
3. Normalizar estados `loading/error/empty`.

Critério de aceite:

1. Componentes documentados.
2. Uso obrigatório em novas telas.

## Fase 2 - Navegação Modular

1. Bottom tabs final (`Início/Hidroponia/Campo/Financeiro/Perfil`).
2. FAB central com menu de ações.
3. Redirecionamento compatível das rotas legadas.

Critério de aceite:

1. Usuário alcança funções principais em até 2 toques.
2. Nenhuma rota crítica órfã.

## Fase 3 - Início + Estoque

1. Novo dashboard operacional.
2. Fluxo de insumos/estoque com atualização automática.
3. Padronização de cards e listas.

Critério de aceite:

1. Atualização de estoque sem refresh manual.
2. Fluxos sem regressão funcional.

## Fase 4 - Hidroponia

1. Lotes com visão de progresso.
2. Leituras com feedback de faixa ideal.
3. Ações rápidas por bottom sheet.

Critério de aceite:

1. Registro de leitura em menos de 20 segundos.
2. Erro de entrada reduzido.

## Fase 5 - Campo

1. Estufas/plantios/manejos no padrão novo.
2. Timeline de histórico.
3. Ações rápidas de manejo.

Critério de aceite:

1. Fluxos de rotina concluídos com menos navegação.

## Fase 6 - Financeiro e CRM

1. Entradas/saídas com visual simplificado.
2. Cobrança ativa e filtros padronizados.
3. Relatórios com leitura rápida.

Critério de aceite:

1. Consulta financeira principal em até 3 interações.

## Fase 7 - Hardening e Release

1. Auditoria visual final.
2. Correção de edge cases.
3. Rollout gradual por percentual de usuários.

Critério de aceite:

1. Taxa de erro estável.
2. Sem regressões bloqueantes.

---

## 10. Critérios de Qualidade (Definition of Done)

Cada fase só fecha quando:

1. Typecheck passa sem erro.
2. Fluxos críticos do módulo passam em teste manual.
3. Estados de loading/error/empty implementados.
4. Safe area validada em Android/iOS.
5. Navegação principal sem rotas mortas.
6. Sem regressão em permissões/tenant.

---

## 11. Plano de Testes

## 11.1 Smoke tests obrigatórios por release

1. Login e logout.
2. Troca de tenant.
3. Cadastro de insumo.
4. Entrada de estoque.
5. Cadastro de estufa/plantio.
6. Registro de venda e despesa.
7. Navegação entre abas e retorno.

## 11.2 Testes de resiliência

1. Sem internet durante criação de registro.
2. Retorno de conexão e sincronização.
3. Reabertura de app em estado offline.

## 11.3 Testes de usabilidade

1. Uso sob luz intensa (contraste).
2. Uso com uma mão.
3. Tempo para completar tarefa diária.

---

## 12. Métricas de Sucesso

1. Redução de toques por tarefa crítica.
2. Redução de erros de preenchimento em formulários.
3. Redução de tempo médio para registrar operação.
4. Aumento de uso da ação rápida (FAB).
5. Queda de abandonos em telas de formulário.

---

## 13. Riscos e Mitigações

1. Risco: regressão de navegação.  
Mitigação: fallback por feature flag e mapa de rotas compatível.

2. Risco: inconsistência visual entre módulos.  
Mitigação: bloqueio de merge sem uso dos componentes base.

3. Risco: confusão de usuários antigos.  
Mitigação: rollout gradual + onboarding contextual da nova navegação.

4. Risco: impacto em offline.  
Mitigação: testes de rede instável em todas as fases.

---

## 14. Rollout e Rollback

## 14.1 Rollout

1. 10% da base.
2. 30% da base.
3. 60% da base.
4. 100% após estabilidade.

## 14.2 Gatilhos de rollback

1. Aumento anormal de erro funcional.
2. Queda acentuada de conclusão de tarefa.
3. Bloqueio em fluxos críticos.

## 14.3 Mecanismo

1. Desligar `ui_v2_enabled` remotamente.
2. Retornar imediatamente à UI estável.

---

## 15. Governança e Responsáveis

1. Produto/UX: valida arquitetura de interação.
2. Frontend: implementação de componentes e telas.
3. QA: plano de testes e aprovação por fase.
4. Tech lead: decisão de rollout/rollback.

---

## 16. Backlog Técnico Imediato

1. Consolidar tokens finais no tema.
2. Criar `QuickActionSheet` para FAB.
3. Padronizar `ScreenHeaderCard` em módulos-chave.
4. Migrar dashboard para estrutura modular definitiva.
5. Completar redirecionamentos legados para abas finais.

---

## 17. Conclusão

A atualização proposta é viável, alinhada ao uso real em campo e tecnicamente segura quando executada em fases com feature flag, critérios claros de aceite e testes de regressão.

Este plano deve ser tratado como referência principal de execução para as próximas sprints de UX/UI do SGE.
