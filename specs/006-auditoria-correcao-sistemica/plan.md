# Implementation Plan: Auditoria e Correção Sistêmica

**Branch**: `[006-auditoria-correcao-sistemica]` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-auditoria-correcao-sistemica/spec.md`

## Summary

Executar uma auditoria incremental e orientada a risco sobre todos os fluxos ativos do Estufa2, começando por autenticação, isolamento multi-tenant e compatibilidade de persistência. Cada falha será reproduzida, classificada, corrigida no menor escopo possível e protegida por um caso de regressão. A abordagem combina inventário estático dos contratos usados pelo aplicativo, validação do schema reconstruído, testes automatizados por fronteira e jornadas manuais de ponta a ponta em ambiente de validação. O trabalho preservará a arquitetura, as dependências, os dados existentes, o domínio exclusivo de estufas e o comportamento offline.

## Technical Context

**Language/Version**: TypeScript 6.0, JavaScript executado por Node.js e pelo runtime Expo/React Native

**Primary Dependencies**: Expo 57, React 19, React Native 0.86, React Navigation 7, Supabase JS 2.106, TanStack React Query 5, AsyncStorage e NetInfo

**Storage**: PostgreSQL remoto com isolamento por tenant; AsyncStorage para sessão, seleção de conta, autorização persistida e fila offline; migrations incrementais em `supabase-new/migrations/`

**Testing**: Node built-in test runner, testes unitários, de contrato, integração e persistência; TypeScript sem emissão; ESLint; validação manual no Expo Web e em pelo menos um dispositivo móvel

**Target Platform**: Navegadores modernos, Android e iOS por Expo; conectividade intermitente suportada nos fluxos explicitamente offline

**Project Type**: Aplicativo cliente multiplataforma integrado a serviço remoto de autenticação e persistência

**Performance Goals**: Operações online comuns refletidas na interface em até 3 segundos em conexão estável; troca de conta sem exibir dados da conta anterior; suíte automatizada completa executável em menos de 5 minutos no ambiente de desenvolvimento

**Constraints**: Sem alteração de dependências, reescrita arquitetural, exclusão de dados ou mudança direta em produção; correções aditivas e reversíveis; isolamento multi-tenant obrigatório; segredos ausentes de logs e artefatos; comportamento offline determinístico; cada correção exige regressão reproduzível

**Scale/Scope**: 51 arquivos de telas, 71 arquivos de serviços, 73 arquivos de teste e 17 migrations na baseline atual; auditoria dos módulos ativos de autenticação, contas, painel, estufas, ciclos, operações agrícolas, estoque, colheitas, vendas, despesas, financeiro, clientes, fornecedores, relatórios, configurações e sincronização

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Gate inicial

| Princípio | Avaliação | Evidência no plano |
|-----------|-----------|--------------------|
| I. Preservação do comportamento | PASS | Correções limitadas a falhas reproduzidas; refatorações oportunistas e mudanças funcionais permanecem fora do escopo. |
| II. Integridade e segurança | PASS | Matriz multi-tenant obrigatória, preservação de dados, mensagens sanitizadas e alterações de schema apenas por migration revisável. |
| III. Offline-first | PASS | Fila, escopo, repetição, reconexão e troca de usuário/tenant possuem contrato e cenários dedicados. |
| IV. Qualidade verificável | PASS | Toda correção exige reprodução, caso de regressão, execução de testes e evidência registrada. |
| V. Evolução incremental | PASS | Execução dividida em ondas por risco e domínio, sem novas dependências ou arquitetura paralela. |
| VI. Domínio produtivo exclusivo | PASS | Apenas estufas convencionais e módulos compartilhados necessários são auditados; campo, talhões e hidroponia não serão reativados. |
| VII. Persistência controlada | PASS | Contratos do app serão comparados à baseline nova; migrations são aditivas, validadas fora de produção e dependem de autorização antes de aplicação remota. |
| Restrições de Git e produção | PASS | O plano não inclui commit, push, reescrita de histórico, cutover ou alteração direta de produção. |

Não há violações constitucionais nem justificativas de complexidade pendentes.

## Project Structure

### Documentation (this feature)

```text
specs/006-auditoria-correcao-sistemica/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── audit-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Gerado posteriormente por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── contexts/               # Sessão, bootstrap, conta ativa e feedback
├── hooks/
│   └── queries/            # Leituras compostas, cache e invalidação por tenant
├── navigation/             # Superfície de rotas ativa
├── screens/                # Jornadas manuais e mensagens ao usuário
├── services/
│   ├── offline/            # Fila, serialização, escopo e sincronização
│   └── *.ts                # Contratos de domínio e persistência por módulo
├── types/                  # Tipos de domínio e contrato remoto gerado
└── utils/                  # Regras puras e formatação

supabase-new/
├── migrations/             # Baseline e correções incrementais auditáveis
└── supabase/migrations/    # Espelho operacional exigido pelo CLI atual

tests/
├── contract/               # Compatibilidade app ↔ persistência/autorização
├── integration/            # Jornadas entre fronteiras e gates externos
├── persistence/            # Ordem, schema, RLS e isolamento
└── *.test.ts               # Regras unitárias e regressões por domínio
```

**Structure Decision**: Manter a estrutura existente de aplicativo único. Regras puras e normalizações permanecem em helpers testáveis; integrações ficam nos serviços atuais; testes novos seguem a fronteira da falha (`tests/contract`, `tests/integration`, `tests/persistence` ou teste unitário na raiz). Nenhuma nova camada arquitetural será introduzida apenas para a auditoria.

## Implementation Strategy

### Wave 1 — Baseline e inventário automatizado

1. Registrar o baseline de `typecheck`, lint e testes sem suprimir falhas.
2. Construir o inventário dos fluxos ativos a partir da navegação, telas, hooks e serviços.
3. Criar o registro de achados com severidade, reprodução, impacto, estado e evidência.
4. Mapear cada leitura e escrita ativa para tabela, campos, enumerações, função remota, tenant e permissões esperadas.

### Wave 2 — Identidade, conta e segurança

1. Auditar cadastro, login, restauração de sessão, bootstrap de perfil/tenant e conta selecionada.
2. Validar provisionamento idempotente e remoção de contas inválidas da seleção.
3. Executar matriz owner/admin/operator/guest para leitura, escrita, exclusão e compartilhamento.
4. Confirmar isolamento de cache, consultas, fila offline e mensagens entre dois tenants.

### Wave 3 — Contratos de persistência e leituras compostas

1. Comparar payloads e mapeadores ativos com tipos e migrations do banco novo.
2. Detectar colunas, enumerações, defaults, nulabilidade, relações, índices e funções ausentes ou divergentes.
3. Criar regressões estáticas e de integração antes de migrations de compatibilidade.
4. Separar falhas de consultas compostas para que uma fonte secundária não seja atribuída ao módulo principal.

### Wave 4 — Operação agrícola

1. Auditar estufas, ciclos, tarefas, manejos, insumos, aplicações e colheitas.
2. Validar relações de tenant/estufa/ciclo e transições de status.
3. Confirmar persistência por leitura após escrita e comportamento com registros antigos incompletos.
4. Verificar reflexos no painel, alertas, estoque e relatórios produtivos.

### Wave 5 — Comercial e financeiro

1. Auditar clientes, fornecedores, vendas, recebimentos, cheques, despesas e caixa.
2. Reconciliar valores combinados, recebidos, pendentes, pagos e cancelados.
3. Validar datas efetivas, filtros, resumos, relatórios e exportações.
4. Executar regressões de concorrência, edição, exclusão permitida e bloqueios de integridade.

### Wave 6 — Offline, erros e aceitação final

1. Testar interrupção antes, durante e depois das escritas suportadas.
2. Validar idempotência, serialização, reconexão, reinicialização e troca de contexto.
3. Padronizar categorias de erro, preservando causa técnica sanitizada e orientação ao usuário.
4. Executar jornadas de ponta a ponta, atualizar o registro final e manter explícitos achados bloqueados ou fora do escopo.

## Test and Evidence Strategy

- **Unitário**: normalizações, mapeamentos, validações, cálculos, transições e classificação de erros.
- **Contrato**: campos lidos/gravados, enumerações, funções, permissões e resposta esperada das fronteiras remotas.
- **Persistência**: baseline limpa, ordem de migrations, constraints, RLS e isolamento entre tenants.
- **Integração**: bootstrap, compartilhamento, fila offline, leituras compostas e jornadas que atravessam módulos.
- **Aceitação manual**: web e um dispositivo móvel com duas contas, quatro perfis, rede estável e rede interrompida.
- **Gate por correção**: reprodução documentada → teste vermelho ou contrato violado → correção mínima → teste verde → suíte relacionada → suíte completa → evidência no registro.

## Post-Design Constitution Check

O desenho de Phase 1 mantém todos os gates como **PASS**:

- O modelo de auditoria não cria novas tabelas de produção; seus registros são artefatos de engenharia.
- Os contratos exigem isolamento, menor privilégio, sanitização e confirmação de persistência.
- O guia de validação usa apenas ambientes de desenvolvimento/validação e exige confirmação separada para mudanças remotas.
- A estratégia preserva dependências, arquitetura, domínio produtivo e dados históricos.
- Nenhuma decisão de Phase 1 autoriza migração, exclusão, cutover, commit ou push.

## Complexity Tracking

Não aplicável. O plano não introduz violações constitucionais, novos projetos, novas dependências ou padrões arquiteturais adicionais.
