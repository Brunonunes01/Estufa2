# Relatório de Auditoria de Arquitetura e Regras de Negócio

**Iniciativa:** 002 — Auditoria de arquitetura e regras de negócio  
**Data da auditoria:** 2026-11-10  
**Escopo:** recuperação documental do aplicativo existente, antes de qualquer especificação do novo banco.  
**Estado do gate:** **Bloqueado — aguardando revisão e aprovação formal**.

**Atualização pós-iniciativa 001:** a superfície operacional de Campo/Talhão foi retirada
do aplicativo conforme a especificação [001-recuperacao-estufas](../001-recuperacao-estufas/).
Esta atualização registra o estado do workspace após essa mudança; não altera o escopo da
auditoria 002 nem autoriza a especificação ou criação do novo banco.

**Coordenada atual:** não existem mais telas, rotas, tabs ou ações operacionais ativas de
Campo, Talhão ou Hidroponia. Permanecem somente referências técnicas de compatibilidade,
leitura histórica, integridade e migrations; elas não representam módulos disponíveis ao
usuário.

## 1. Resumo executivo

A auditoria 002 foi executada originalmente somente por inspeção estática dos artefatos
existentes. A implementação posterior da iniciativa 001 alterou a superfície ativa do
aplicativo, sem alterar dependências, migrations, schema, dados ou ambiente de produção.

O sistema possui uma base funcional clara para estufas convencionais, com telas e serviços para estufas, plantios, colheitas, insumos, aplicações, manejos, vendas, recebimentos, despesas, clientes, fornecedores, caixa e relatórios. A mesma base ainda contém contratos técnicos legados de campo, talhão e hidroponia para compatibilidade histórica. Esses contratos não estão expostos como módulos ativos e não devem ser removidos por exclusão de dados nem por alteração implícita.

Os maiores riscos encontrados são concentração de regras em serviços/telas extensos, acoplamento entre operações produtivas e financeiro, contratos legados de origem de produção e múltiplas camadas de persistência/offline. A auditoria recomenda evolução incremental e não autoriza refatoração nesta iniciativa.

## 2. Inventário de módulos

| Classificação | Áreas observadas | Evidência principal | Situação |
|---|---|---|---|
| Estufa convencional | estufas, plantios, colheitas, insumos, aplicações, manejos, vendas, recebimentos, despesas, clientes, fornecedores, caixa e relatórios | `src/screens/`, `src/services/`, `src/navigation/` | Preservar comportamento até requisito aprovado |
| Compartilhada | autenticação, seleção de tenant, permissões, auditoria, armazenamento local, fila offline, sincronização e exportações | `src/contexts/`, `src/services/auth*`, `src/services/offline/` | Preservar e tratar como infraestrutura crítica |
| Campo/talhão | contratos históricos de origem por talhão, exclusão de ciclo/talhão e filtros financeiros de campo | `talhaoId`, `financeProductionScope.ts`, migrations `0010`–`0014` e `0025`–`0029` | Superfície ativa retirada pela iniciativa 001; preservar dados históricos e contratos legados |
| Hidroponia | contratos históricos tipados para estruturas, leituras, lotes, motores, movimentações, ocupações, reservatórios, setores e verduras | `src/types/supabase.ts`, migration `0003_hydro_legacy_ids.sql` | Sem superfície ativa; manter somente até decisão formal sobre schema legado |
| Persistência legada | schema incremental e migrations corretivas, incluindo origem produtiva, financeiro e restauração | `supabase/migrations/` | Somente referência histórica nesta iniciativa |

## 3. Mapa de dependências

```text
AuthContext / tenantGuard
        ├── telas operacionais e financeiras
        ├── serviços de domínio
        └── fila offline e sincronização

Estufa → Plantio → Colheita → Venda/Recebimento
   ├── Aplicação e Manejo
   ├── Estoque/Insumos
   └── Despesas/Caixa/Relatórios

Origem produtiva (estufa ou talhão)
   ├── plantioService / vendaService / colheitaService
   ├── financeProductionScope
   └── relatórios, exportações e auditoria
```

### Dependências críticas

1. Os serviços de domínio recebem o identificador do tenant, validam-no com `assertTenantId` e filtram consultas Supabase por `tenant_id`.
2. Operações de escrita de estufa, plantio, aplicação, manejo, cliente, fornecedor, despesa e venda usam a camada `runOfflineWrite` em diferentes fluxos.
3. Vendas e colheitas carregam regras de origem produtiva, recebimento, auditoria e compatibilidade histórica no mesmo fluxo.
4. A iniciativa 001 retirou as rotas e telas operacionais de Campo/Talhão da superfície ativa;
   os tipos, serviços de leitura, filtros e migrations legados permanecem sob compatibilidade
   histórica e não devem ser removidos por inferência.

### Atualização de superfície realizada pela iniciativa 001

No estado atual do workspace, a retirada aprovada de Campo/Talhão inclui:

- [AppStackNavigator.tsx](../../src/navigation/AppStackNavigator.tsx) sem os imports e
  registros de `TalhoesList`, `TalhaoForm` e `CampoVendaForm`.
- [MainTabsNavigator.tsx](../../src/navigation/MainTabsNavigator.tsx) sem a entrada
  operacional de `CampoHubScreen`.
- Arquivos exclusivos removidos: `src/screens/Campo/CampoHubScreen.tsx`,
  `src/screens/Campo/TalhaoFormScreen.tsx`, `src/screens/Campo/TalhoesListScreen.tsx`,
  `src/hooks/queries/useTalhoesListData.ts` e `src/services/talhaoService.ts`.
- Contratos de navegação e ações rápidas ajustados para manter somente estufas
  convencionais e módulos compartilhados.

Essa retirada foi validada pelos testes de escopo produtivo e navegação da iniciativa 001.
Ela não implica exclusão dos registros históricos, remoção de tabelas/colunas ou aprovação
de um novo schema.

## 4. Catálogo de regras e contratos preservados

### 4.1 Produção de estufa

- Plantios são associados a uma estufa no fluxo preservado.
- Colheitas dependem de plantio e alimentam operações de venda e recebimento.
- Aplicações e manejos possuem operações por estufa/plantio e usam persistência offline em parte dos fluxos.
- Insumos e estoque permanecem como módulos operacionais compartilhados da estufa.
- Registros financeiros derivados de produção não podem ser recalculados ou eliminados sem requisito aprovado.

### 4.2 Vendas, recebimentos e financeiro

- Venda, itens, cliente, plantio, estufa, status de pagamento e valores recebidos formam um contrato integrado.
- Recebimentos possuem transições e validações de data; operações de confirmar, corrigir, remover e registrar cheque têm tratamento distinto.
- Despesas, caixa, contas a receber, exportações e relatórios dependem de datas, status e origem da produção.
- O filtro de origem atualmente diferencia estufa e campo; ao retirar campo, a futura mudança deverá preservar a semântica das operações de estufa e definir o tratamento dos registros legados.

### 4.3 Autenticação, autorização e multi-tenant

- `AuthContext` resolve usuário, tenant selecionado, tenants disponíveis e papel de acesso.
- Serviços validam o tenant antes de persistir e incluem `tenant_id` nas consultas e escritas observadas.
- Alterações futuras devem manter isolamento por tenant, permissões de leitura/escrita, modo somente leitura e auditoria do ator.
- A existência de filtros no serviço não substitui a necessidade de políticas de banco no novo projeto; isso é decisão futura bloqueada por este relatório.

### 4.4 Offline e sincronização

- A fila local usa armazenamento persistente e registra ação, payload, tentativas e escopo de sessão.
- A sincronização só processa itens compatíveis com o usuário/tenant ativo e preserva itens incompatíveis na fila.
- Falhas classificadas como offline interrompem o flush e mantêm itens pendentes; falhas não offline também permanecem para inspeção.
- O contrato offline deve ser testado por ação e por tenant antes de qualquer troca de schema ou banco.

### 4.5 Compatibilidade histórica

- Tipos, alguns serviços de domínio e testes ainda representam `talhaoId`, origem legada e
  tabelas de hidroponia para leitura, validação de integridade e compatibilidade histórica.
- Migrations registram evolução incremental, correções, restauração e remoção permanente de entidades de campo/talhão.
- Nenhuma dessas evidências autoriza apagar registros históricos. A classificação de cada dado depende de decisão formal posterior.

### 4.6 Coordenadas por camada

| Camada | Estado atual | Evidência |
|---|---|---|
| Navegação e UI | Sem superfície operacional de Campo, Talhão ou Hidroponia | `AppStackNavigator.tsx`, `MainTabsNavigator.tsx`, `src/screens/Campo/` removida |
| Serviços ativos | Fluxos novos de estufa não exigem essas entidades; serviços ainda carregam guards/adaptadores legados | `plantioService.ts`, `colheitaService.ts`, `vendaService.ts`, `productionOriginGuard.ts` |
| Tipos | Campos legados permanecem para compatibilidade | `src/types/domain.ts`, `src/types/supabase.ts` |
| Persistência | Migrations e tabelas históricas ainda contêm Campo/Talhão/Hidroponia | `supabase/migrations/` |
| Produto | Apenas gestão de estufas convencionais está exposta | testes de `productionScope` e `productionScopeNavigation` |

## 5. Evidências e lacunas

### Evidências verificadas

- Inventário de diretórios em `src/contexts/`, `src/hooks/`, `src/navigation/`, `src/screens/`, `src/services/`, `src/types/`, `tests/` e `supabase/migrations/`.
- Testes existentes para autenticação, tenant, offline, sincronização, produção, financeiro, vendas, recibos e migrations.
- Referências explícitas a `Campo`, `talhaoId` e contratos `hidro_*` no código, nos tipos e nas migrations.
- Validação documental dos artefatos da iniciativa, com checklist de requisitos previamente concluída.

### Lacunas

- Não foi executado banco real nem ambiente de produção.
- Não há evidência suficiente, nesta auditoria, para afirmar cobertura completa de todos os fluxos de UI em cada plataforma suportada.
- Não foi validada a equivalência de políticas RLS do banco futuro.
- Alguns testes existentes verificam migrations e compatibilidade legada, mas não constituem aprovação para remover seus domínios.

## 6. Matriz de riscos

| ID | Achado | Impacto | Risco | Evidência | Direção futura |
|---|---|---:|---:|---|---|
| R-01 | Regras de venda, colheita, recebimento e auditoria concentradas em serviços extensos | Alto | Alto | `colheitaService.ts`, `vendaService.ts` | Especificar separação por caso de uso antes de refatorar |
| R-02 | Telas de plantio e colheita misturam validação, navegação e persistência | Alto | Alto | `PlantioFormScreen.tsx`, `ColheitaFormScreen.tsx` | Extrair contratos somente em iniciativa aprovada |
| R-03 | Origem estufa/campo atravessa produção, financeiro e relatórios | Alto | Alto | `financeProductionScope.ts`, `productionOriginGuard.ts` | Definir compatibilidade de legado e novo domínio |
| R-04 | Fila offline compartilha ações entre módulos e sessões | Alto | Alto | `offlineQueueStorage.ts`, `offlineStorageHandlers.ts` | Catalogar ações, replay e conflitos antes do novo banco |
| R-05 | Tipos Supabase incluem tabelas hidroponia e talhão | Médio | Médio | `src/types/supabase.ts` | Regenerar contrato somente após schema aprovado |
| R-06 | Navegação/telas possuíam superfícies de campo | Alto | Alto | Iniciativa 001; `AppStackNavigator.tsx`, `MainTabsNavigator.tsx` e `src/screens/Campo/` | Tratado na superfície ativa pela 001; manter compatibilidade histórica e validar dependências remanescentes |
| R-07 | Migrations acumulam correções e operações destrutivas históricas | Alto | Alto | `supabase/migrations/` | Não reutilizar automaticamente; mapear invariantes no novo projeto |
| R-08 | Cobertura automatizada não prova todos os fluxos de UI e multi-plataforma | Médio | Médio | `tests/` | Criar cenários de aceitação por fluxo preservado |

## 7. Melhorias incrementais candidatas

As sugestões abaixo não são tarefas autorizadas. Cada uma exige especificação, revisão e aprovação próprias:

1. Separar regras de domínio, orquestração de persistência e apresentação nos fluxos de plantio, colheita e venda.
2. Centralizar contratos de origem produtiva e compatibilidade de registros legados.
3. Catalogar ações offline por módulo, política de retry, idempotência e conflito.
4. Formalizar uma fronteira de autorização que seja verificável na UI, nos serviços e no banco.
5. Isolar adaptadores Supabase dos modelos de domínio e gerar contratos do novo banco somente após aprovação do gate.
6. Expandir testes de aceitação para navegação exclusivamente de estufas convencionais, sem apagar dados históricos.

Ordem sugerida: contratos e invariantes → segurança/multi-tenant → offline → domínio produtivo → financeiro → remoção de superfícies legadas → novo banco. A ordem é uma recomendação de governança, não um plano de implementação aprovado.

## 8. Dados legados e limites do novo banco

| Categoria | Decisão nesta iniciativa |
|---|---|
| Registros de estufa e módulos compartilhados | Preservar contratos e comportamento até mudança aprovada |
| Registros de campo/talhão/hidroponia | Não excluir; classificar em decisão futura |
| Dados financeiros e históricos relacionados | Não recalcular, migrar ou remover automaticamente |
| Schema, migrations e políticas de produção | Não alterar |
| Novo projeto Supabase | Bloqueado até aprovação formal deste relatório e de uma especificação própria |

## 9. Decisões pendentes

- Aprovar formalmente este relatório e seu estado de gate.
- Definir a política de acesso, arquivamento ou migração dos dados de campo, talhão e hidroponia.
- Definir o contrato de compatibilidade para vendas, despesas, relatórios e auditoria que apontam para origens removidas.
- Aprovar especificação própria para qualquer remoção de rotas, telas, tipos, serviços ou migrations.
- Aprovar especificação própria do novo banco, incluindo RLS, tenant, offline, auditoria e estratégia de migração.

## 10. Parecer e gate

**Parecer:** a auditoria documental está consolidada e identifica os contratos que precisam ser preservados, os acoplamentos relevantes e os riscos que devem orientar a reconstrução. A iniciativa 001 retirou a superfície ativa de Campo/Talhão solicitada, mas o sistema ainda não está pronto para iniciar a especificação do novo banco sem revisão humana, pois permanecem decisões sobre compatibilidade, dados legados, RLS, migração e validação multiplataforma.

**Estado:** `Bloqueado` até que um responsável revise e registre aprovação em [contracts/audit-approval-gate.md](./contracts/audit-approval-gate.md).

**Declaração de segurança:** a auditoria 002 não executou alterações de banco, schema, migrations,
dependências, dados ou produção, nem operações destrutivas de Git. As alterações de código
registradas acima pertencem à iniciativa 001 e estão limitadas à superfície aprovada de
navegação/telas e às suas dependências diretas.
