# Research: Reconstrução Nova da Persistência

## Decisão 1: criar uma baseline nova, sem reaproveitar a sequência legada

**Decision**: criar migrations novas para um banco vazio, usando as migrations atuais apenas como referência de requisitos.

**Rationale**: a sequência legada contém decisões históricas, objetos de Campo/Talhão/Hidroponia e alterações incrementais que não representam necessariamente o domínio novo aprovado.

**Alternatives considered**: copiar ou reaplicar toda a sequência legada; rejeitado porque levaria objetos e decisões fora do escopo e dificultaria a auditoria da baseline.

## Decisão 2: preservar o legado sem migração automática

**Decision**: manter o banco legado intacto e não copiar, converter ou apagar dados nesta iniciativa.

**Rationale**: a Constituição exige decisão própria para migração de dados e o ambiente atual não possui credenciais disponíveis para validação remota.

**Alternatives considered**: migração automática durante a criação; rejeitado por risco de perda, reclassificação e mistura de ambientes.

## Decisão 3: segurança antes dos fluxos

**Decision**: estabelecer tenants, memberships, funções de autorização e RLS antes das tabelas operacionais.

**Rationale**: toda tabela operacional depende do escopo de tenant; segurança posterior permitiria uma janela de estrutura sem proteção.

**Alternatives considered**: criar tabelas e adicionar RLS no final; rejeitado por aumentar o risco de políticas incompletas e testes tardios.

## Decisão 4: domínio produtivo somente de estufas

**Decision**: a baseline operacional incluirá estufas, ciclos, plantios, colheitas, vendas e módulos compartilhados necessários; Campo, Talhão e Hidroponia não serão criados como caminhos ativos novos.

**Rationale**: mantém o contrato das specs 001–004 e evita reintroduzir domínios removidos.

**Alternatives considered**: reproduzir todas as tabelas da base atual; rejeitado porque a reconstrução não é um dump do legado.

## Decisão 5: validação local/staging antes de credenciais remotas

**Decision**: migrations e testes serão preparados localmente; aplicação em projeto remoto, geração de tipos vinculados e cutover aguardam credenciais e aprovação.

**Rationale**: uma falha de autenticação deve permanecer uma pendência identificada, nunca ser tratada como sucesso.

**Alternatives considered**: validar diretamente em produção ou assumir configuração; rejeitado pela Constituição e pelo risco operacional.

## Decisão 6: cadastro de usuários do zero

**Decision**: o novo ambiente inicia sem usuários importados; o primeiro acesso ocorre por novo cadastro e a associação a tenants/memberships é criada dentro do novo ambiente.

**Rationale**: a decisão da clarificação elimina dependência de credenciais, identificadores e memberships do banco legado, mantendo a separação entre ambientes.

**Alternatives considered**: importar usuários ou copiar memberships antigos; rejeitado porque caracterizaria migração de dados proibida nesta iniciativa.

## Inventário de referência

O repositório possui migrations legadas de 0001 a 0032, `supabase/config.toml`, tipos em `src/types/supabase.ts` e serviços que consomem tenants, estufas, plantios, colheitas, vendas, despesas, auditoria e compartilhamento. Esse inventário orienta os requisitos, mas não autoriza copiar a estrutura integral.

## Decisões descobertas na implementação

- A baseline foi separada em doze migrations numeradas em `supabase-new/migrations/`, sem reutilizar a sequência legada.
- A validação automatizada local pode verificar inventário, ordem, RLS e contratos sem credenciais remotas.
- A geração de tipos e a validação de staging permanecem pendentes até existir um ambiente novo validado; `src/types/supabase.ts` não foi regenerado contra produção.
