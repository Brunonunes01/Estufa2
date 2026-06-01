# Frontend Development & AI Guidelines

Este documento define as diretrizes obrigatórias para a evolução do frontend do projeto Estufa2. Qualquer agente de IA ou desenvolvedor que atue neste código é responsável por manter a integridade arquitetural descrita abaixo.

## 1. Responsabilidade do Desenvolvedor (IA/Humano)

*   **Autonomia Organizacional:** O desenvolvedor é responsável por manter as pastas organizadas seguindo o padrão atual (Services, Hooks, Screens, Components).
*   **Fidelidade de UI/UX:** As telas devem seguir o padrão visual estabelecido com `react-native-paper` e o sistema de temas em `src/theme/`.
*   **Integridade de Tipos:** É obrigatório o uso rigoroso de TypeScript. Não é permitido o uso de `any`. Novos modelos devem ser registrados em `src/types/domain.ts`.

## 2. Padrões de Arquitetura

*   **Logic Isolation:** Nenhuma lógica de negócio ou acesso a dados fora da camada de services deve residir dentro das Screens. Use **Custom Hooks** para estado e **Services** para persistência.
*   **Multi-tenancy:** Toda e qualquer query ou mutação deve obrigatoriamente validar o `tenantId`. O uso do `tenantGuard.ts` é mandatório.
*   **Componentização:** Componentes reutilizáveis (botões, cards, inputs) devem ser colocados em `src/components/ui/`. Componentes específicos de funcionalidade devem ficar em subpastas (ex: `src/components/dashboard/`).

## 3. Fluxo de Implementação

Ao criar uma nova funcionalidade, siga esta ordem:
1.  **Definição:** Atualizar `domain.ts` com os novos tipos.
2.  **Serviço:** Criar o arquivo em `src/services/` com as operações de CRUD.
3.  **Hook:** Criar um hook em `src/hooks/` (ou `src/hooks/queries/` para buscas com React Query).
4.  **UI:** Implementar a tela consumindo o hook criado.

## 4. Preservação de Legado

*   O sistema possui dados legados que utilizam `userId` em vez de `tenantId`. O desenvolvedor deve garantir que as consultas suportem ambos os campos conforme implementado nos serviços atuais para evitar perda de acesso aos usuários antigos.
*   Campos marcados como `@deprecated` no `domain.ts` não devem ser usados em novas funcionalidades, mas não devem ser removidos sem um plano de migração de dados.

## 5. Validação Obrigatória

*   Antes de finalizar qualquer tarefa, o desenvolvedor deve garantir que o `typecheck` (`npm run typecheck`) passe sem erros.
*   Mudanças que impactem o dashboard devem ser validadas no fluxo de frontend (hooks, services e telas) sem dependência de rotinas server-side antigas.

---
*Este documento é a base para a manutenção da qualidade Sênior do projeto.*
