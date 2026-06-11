# Melhorias de Estrutura do App

## 1. Remover legado morto da migracao de backend

O que melhorar:
- Eliminar branches `legacy` dos services.
- Remover `src/compat/legacyDataApi.ts` e `src/services/removedBackend.ts` depois de migrar todos os usos.
- Simplificar `src/services/backendConfig.ts` para o cenario real do app.
- Deixar cada service com uma unica implementacao de persistencia, focada em Supabase.

O que causa essa melhoria:
- Hoje existe codigo duplicado para backend antigo e backend atual.
- `backendConfig` sempre aponta para Supabase, entao os caminhos `legacy` nao fazem parte do fluxo real.
- Parte desse legado depende de uma API de compatibilidade que so dispara erro se for chamada.
- Isso aumenta ruído, tamanho de arquivos, custo de manutencao e risco de regressao em refactors.

## 2. Separar o codigo por dominio funcional

O que melhorar:
- Organizar o codigo em modulos como `features/estufas`, `features/plantios`, `features/financeiro`, `features/hidroponia`.
- Dentro de cada modulo, agrupar `screens`, `hooks`, `services`, `types` e componentes relacionados.
- Reduzir a dependencia de pastas globais grandes com arquivos de muitos contextos misturados.

O que causa essa melhoria:
- Hoje a estrutura mistura separacao por tipo tecnico com separacao parcial por dominio.
- Isso dificulta localizar tudo que pertence a uma funcionalidade.
- Quando uma feature cresce, a regra de negocio fica espalhada em varias pastas distantes.
- O custo de onboarding, manutencao e refactor sobe porque a feature nao esta coesa.

## 3. Centralizar mutacoes e invalidacoes do React Query

O que melhorar:
- Criar hooks de mutacao por caso de uso, como `useCreatePlantio`, `useUpdateDespesa`, `useDeleteColheita`.
- Concentrar invalidacoes de cache dentro desses hooks.
- Padronizar `queryKeys` e dependencias por dominio.

O que causa essa melhoria:
- Hoje varias telas disparam mutacoes diretamente e cuidam manualmente das invalidacoes.
- Esse padrao gera duplicacao de codigo.
- A chance de esquecer uma invalidacao ou invalidar cache demais aumenta.
- Isso prejudica consistencia de dados, previsibilidade e pode gerar refetches desnecessarios.

## 4. Quebrar o AuthContext em responsabilidades menores

O que melhorar:
- Separar autenticacao, bootstrap de perfil, memberships, tenant ativo e permissoes.
- Manter o contexto principal mais fino, expondo apenas o estado consolidado.
- Mover carga de regras de acesso para servicos ou hooks especializados.

O que causa essa melhoria:
- Hoje o `AuthContext` faz autenticacao, cria perfil, resolve tenant, calcula acesso e controla estado global.
- Isso cria alto acoplamento em um ponto central da aplicacao.
- Mudancas de login, compartilhamento ou permissao tendem a tocar o mesmo arquivo.
- O resultado e maior risco de regressao e menor testabilidade.

## 5. Dividir a navegacao em navegators menores

O que melhorar:
- Separar `AuthNavigator`, `MainTabsNavigator`, `CampoNavigator`, `HidroponiaNavigator`, `FinanceiroNavigator`.
- Extrair FAB, banners e quick actions para componentes ou wrappers proprios.
- Reduzir a concentracao de configuracoes em um unico arquivo.

O que causa essa melhoria:
- Hoje a navegacao concentra stacks, tabs, layout responsivo, banner offline e acoes rapidas no mesmo lugar.
- Isso torna o arquivo grande e com muitas decisoes condicionais.
- O impacto de uma alteracao simples em navegacao fica maior do que deveria.
- A leitura e a manutencao pioram conforme novos fluxos entram.

## 6. Reduzir o tamanho dos services grandes

O que melhorar:
- Quebrar services extensos em arquivos menores por responsabilidade.
- Separar operacoes de leitura, escrita, mapeamento e validacao.
- Extrair conversoes entre banco e dominio para mapeadores dedicados.

O que causa essa melhoria:
- Hoje alguns services acumulam CRUD, regras de negocio, fallback, offline e adaptacao de dados no mesmo arquivo.
- Arquivos muito grandes dificultam revisao, teste e refactor.
- A chance de duplicar logica aumenta porque o arquivo vira um ponto de acumulo.
- Bugs em uma parte do service ficam mais caros de isolar.

## 7. Desacoplar tipos de dominio da camada legada

O que melhorar:
- Remover dependencia direta de `Timestamp` da camada de compatibilidade.
- Definir tipos de dominio independentes de tecnologia de persistencia.
- Fazer conversao de DTO do banco para modelo de dominio em uma camada dedicada.

O que causa essa melhoria:
- Hoje os tipos de dominio ainda carregam marcas do backend antigo.
- Isso prende a modelagem da aplicacao a detalhes tecnicos de uma migracao passada.
- Toda evolucao de contrato de dados fica mais sensivel e confusa.
- O dominio deveria representar o negocio, nao a tecnologia legada.

## 8. Criar testes para regra critica

O que melhorar:
- Adicionar testes para controle de acesso, tenant, offline queue, calculos do dashboard e mutacoes principais.
- Cobrir hooks e servicos com maior impacto de negocio.
- Validar cenarios de permissao e escopo por tenant.

O que causa essa melhoria:
- Hoje a arquitetura depende bastante de regra de negocio no cliente.
- Sem testes, regressao funcional aparece tarde, geralmente durante uso manual.
- Funcionalidades com multi-tenant e offline sao naturalmente mais sensiveis.
- A falta de cobertura reduz seguranca para refatorar a estrutura.

## 9. Revisar gargalos reais de performance

O que melhorar:
- Medir renders, refetches e custo de agregacoes nas telas mais usadas.
- Reduzir invalidacoes excessivas e centralizar cache.
- Aplicar memoizacao onde houver listas, cards e dashboards densos.

O que causa essa melhoria:
- Lentidao percebida normalmente vem mais de renderizacao, consultas e fluxo de dados do que de codigo legado parado.
- Algumas telas concentram bastante composicao e orquestracao.
- Mutacoes espalhadas tendem a gerar recarga de dados acima do necessario.
- Sem medir esses pontos, a equipe pode atacar sintomas e nao a causa real.

