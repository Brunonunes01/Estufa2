# Implementacao de Cultivo a Campo no App Atual

## Objetivo

Expandir o app atual (focado em estufas) para atender clientes com producao fora da estufa (milho, soja, hortaliças a ceu aberto etc.), mantendo **um unico produto**, um unico login, um unico painel de suporte e a mesma base operacional.

---

## Decisao de Produto

**Recomendacao:** implementar no mesmo app.

### Motivos

- Reaproveita autenticacao, permissoes, financeiro, clientes, fornecedores e suporte.
- Evita custo de manter dois apps separados.
- Facilita adocao pelo cliente (uma equipe, um treinamento, um fluxo unico).
- Permite comparativos de resultado entre estufa e campo no mesmo tenant.

### Quando considerar outro app

- Apenas se o produto de campo virar linha de negocio separada, com marca, time e roadmap independentes.

---

## Diretriz de UX/UI

Nao criar frontend novo do zero. Adotar frontend adaptativo por contexto.

### O que permanece igual

- Login e onboarding base.
- Navegacao principal.
- Padrao visual, componentes e design system.
- Modulos administrativos e suporte.

### O que muda por contexto

- Formularios e validacoes especificas por tipo de unidade.
- KPIs e dashboards especificos por estufa/campo.
- Tarefas sugeridas por cultura e fase.

### Seletor de contexto

Adicionar seletor global de unidade de producao:

- `Estufa`
- `Talhao` (ou `Campo`)

Esse seletor define quais campos, rotinas e indicadores aparecem.

---

## Modelo Funcional

## 1) Conceito central: Unidade de Producao

Criar entidade unificada para origem operacional:

- Tipo: `estufa` | `talhao`
- Identificacao: nome, codigo interno, localizacao
- Estado operacional: ativo, manutencao, desativado

## 2) Modulos compartilhados (reuso)

- Tarefas
- Despesas
- Vendas
- Clientes
- Fornecedores
- Relatorios financeiros base
- Auditoria e suporte

## 3) Modulos especificos de Campo

- Cadastro de talhoes (area ha, solo, coordenadas, historico de culturas)
- Safra/plantio por talhao
- Operacoes de campo (preparo, plantio, adubacao, pulverizacao, irrigacao, colheita)
- Registro de aplicacoes e eventos climaticos
- Indicadores por area (ha)

---

## Proposta Tecnica (alto nivel)

## Backend e dados

1. Introduzir `unidade_producao` no dominio.
2. Associar registros operacionais a essa unidade (direto ou por origem).
3. Manter compatibilidade com dados legados de estufa.
4. Evoluir permissoes para escopo por unidade quando necessario.

## Frontend

1. Adicionar seletor de contexto global.
2. Criar telas de `Talhoes` e `Safras de Campo`.
3. Ajustar telas de tarefas/operacoes para exibir campos conforme contexto.
4. Evoluir dashboard com abas: `Visao Geral`, `Estufa`, `Campo`.

## Suporte/Admin

1. Filtrar operacoes por tipo de unidade no portal de suporte.
2. Adicionar auditoria de eventos de campo.
3. Criar alertas operacionais por SLA e criticidade tambem para campo.

---

## Plano em Sprints

## Sprint 1 - Fundacao (1-2 semanas)

- Definicao de modelo de dados de unidade de producao.
- Cadastro basico de talhao.
- Seletor de contexto no app.
- Ajuste de listagens principais para aceitar contexto.

**Entrega:** cliente ja consegue cadastrar e navegar entre estufa e campo.

## Sprint 2 - Operacao de Campo (1-2 semanas)

- Safra/plantio por talhao.
- Tarefas operacionais de campo.
- Lancamentos de despesa e venda vinculados a talhao/safra.

**Entrega:** fluxo minimo de operacao a campo funcionando ponta a ponta.

## Sprint 3 - Inteligencia e Relatorios (1-2 semanas)

- KPIs de campo (custo/ha, produtividade, margem por safra).
- Comparativos estufa x campo.
- Ajustes de UX e governanca.

**Entrega:** visao gerencial unificada para decisao.

---

## Riscos e mitigacoes

- Risco: complexidade de regras por cultura.
  - Mitigacao: comecar por culturas prioritarias (ex.: milho) e expandir por templates.

- Risco: telas ficarem poluidas.
  - Mitigacao: UI por contexto + progressive disclosure (mostrar apenas o necessario).

- Risco: impacto em dados legados.
  - Mitigacao: migracao incremental e retrocompatibilidade com estufa existente.

---

## Criterios de sucesso

- Cliente opera estufa e campo no mesmo tenant sem confusao.
- Tempo de treinamento adicional menor que adotar um app novo.
- Acompanhamento financeiro e operacional consolidado.
- Suporte/admin consegue auditar e agir em ambos contextos.

---

## Proximo passo recomendado

Executar uma discovery curta com 3-5 clientes para mapear:

- culturas prioritarias
- operacoes obrigatorias por ciclo
- indicadores realmente usados na rotina

Com isso, fechar escopo da Sprint 1 com alta assertividade.
