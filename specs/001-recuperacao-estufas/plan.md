# Implementation Plan: Recuperação e Simplificação do Estufa2

**Branch**: 001-recuperacao-estufas | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from /specs/001-recuperacao-estufas/spec.md

## Summary

A aplicação deve operar somente no domínio de estufas agrícolas convencionais. O plano
remove da superfície ativa as entradas, telas, rotas e dependências exclusivas de campo,
talhões e hidroponia, mantendo os fluxos de estufa e os módulos compartilhados necessários.
Dados históricos e estruturas persistidas legadas serão preservados, sem exclusões ou
alterações no banco de produção.

A abordagem é incremental: primeiro limitar o contexto produtivo ativo e a navegação,
depois desacoplar os fluxos compartilhados de entidades exclusivas e, por fim, validar
regressões de autenticação, multi-tenant, offline, integridade e plataformas suportadas.

## Technical Context

**Language/Version**: TypeScript 6.0.3 com React Native 0.86.3 e React 19.2.3

**Primary Dependencies**: Expo 57, React Navigation 7, React Native Paper, TanStack
Query 5, Supabase JS 2, AsyncStorage, NetInfo e bibliotecas Expo já existentes

**Storage**: Supabase para dados remotos e persistência local/offline existente baseada em
AsyncStorage e fila de sincronização

**Testing**: Node test runner via npm test, TypeScript via npm run typecheck,
ESLint via npm run lint e validação composta via npm run validate

**Target Platform**: Android, iOS e web, mantendo as plataformas configuradas em app.json

**Project Type**: Aplicativo mobile multiplataforma com navegação compartilhada e suporte web

**Performance Goals**: Preservar a responsividade atual dos fluxos de estufa e evitar
consultas, carregamentos ou sincronizações adicionais causados por módulos removidos; não
introduzir nova meta de escala nesta iniciativa

**Constraints**: Nenhuma dependência nova, nenhuma alteração destrutiva no banco, nenhuma
alteração em produção, nenhum descarte de dados históricos, isolamento por tenant,
operação offline, compatibilidade com os fluxos preservados e mudanças limitadas ao escopo
aprovado

**Scale/Scope**: Escopo restrito ao aplicativo existente, seus tenants, plataformas e
dados atuais; inclui navegação, telas, tipos, serviços e testes relacionados a campo,
talhões, hidroponia e suas dependências diretas, além das regressões dos módulos de estufa

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Preservação do comportamento existente: PASS. Plantios, colheitas, insumos, aplicações,
  manejos, vendas, recebimentos, despesas, clientes, fornecedores, financeiro e relatórios
  de estufa permanecem contratos de regressão.
- Integridade e segurança dos dados: PASS. Não há exclusão de dados históricos nem
  alteração no banco de produção; consultas e sincronização continuam tenant-scoped e
  permission-aware.
- Offline-first e resiliência: PASS. A fila, o armazenamento local e a reconciliação
  existentes serão preservados e cobertos por regressão.
- Qualidade verificável: PASS. O plano exige typecheck, lint e testes unitários,
  integração e fluxo nos pontos afetados.
- Evolução incremental e arquitetura preservada: PASS. O plano não troca framework,
  dependência ou arquitetura.
- Domínio produtivo exclusivo: PASS. O modo ativo será estufa convencional; campo,
  talhões e hidroponia serão retirados da superfície funcional por mudança aprovada,
  mantendo estruturas históricas fora do fluxo operacional.
- Restrições permanentes: PASS. Não inclui git mutável, migração destrutiva ou produção.

### Post-Design Recheck

- **Scope boundary**: PASS. O contrato de navegação separa estufa ativa de campo, talhões
  e hidroponia removidos.
- **Data preservation**: PASS. O modelo mantém registros legados sem conversão, exclusão ou
  acesso operacional obrigatório.
- **Shared modules**: PASS. O contrato exige que fluxos de estufa não dependam de entidades
  exclusivas removidas.
- **Security and offline**: PASS. Tenant, permissões, fila offline e reconciliação são
  invariantes de validação.
- **Operational safety**: PASS. O quickstart usa ambientes não produtivos e não inclui
  migrações, alterações de produção ou operações Git.

## Project Structure

### Documentation (this feature)

~~~text
specs/001-recuperacao-estufas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── navigation-and-data-boundary.md
└── tasks.md
~~~

### Source Code (repository root)

~~~text
App.tsx
src/
├── contexts/                       # Configuração do modo ativo e sessão
├── navigation/                     # Rotas, tabs, ações rápidas e tipos
├── screens/
│   ├── Campo/                      # Superfície exclusiva a retirar
│   ├── Estufas/                    # Fluxos preservados
│   ├── Plantios/                   # Fluxos preservados, sem seleção de talhão
│   ├── Colheitas/                  # Fluxos preservados, sem origem de campo
│   ├── Financeiro/                 # Fluxos compartilhados preservados
│   ├── Insumos/                    # Fluxos compartilhados preservados
│   ├── Manejos/                    # Fluxos preservados de estufa
│   ├── Vendas/                     # Fluxos compartilhados preservados
│   └── Wizards/                    # Fluxos de seleção a simplificar
├── services/
│   ├── offline/                    # Sincronização e persistência preservadas
│   ├── productionOriginGuard.ts    # Limites de origem a revisar
│   ├── talhaoService.ts            # Dependência exclusiva a retirar ou isolar
│   ├── estufaService.ts             # Fluxos de estufa preservados
│   ├── plantioService.ts            # Fluxos de plantio preservados
│   └── vendaService.ts              # Fluxos comerciais preservados
├── types/                          # Tipos de domínio e tipos gerados do Supabase
└── utils/
supabase/
└── migrations/                     # Referência histórica; sem migração destrutiva
tests/
├── tenant*.test.ts
├── offline*.test.ts
├── syncService*.test.ts
├── productionOriginGuard.test.ts
├── venda*.test.ts
└── estufaHealth.test.ts
~~~

**Structure Decision**: Manter a estrutura existente de aplicativo único. A mudança será
concentrada em src/navigation, src/contexts, telas e serviços diretamente relacionados
aos domínios retirados, com testes em tests/. O diretório supabase/migrations não será
alterado para apagar dados ou remover estruturas legadas.

## Complexity Tracking

Nenhuma violação da Constituição foi identificada; não há complexidade excepcional a
justificar.

