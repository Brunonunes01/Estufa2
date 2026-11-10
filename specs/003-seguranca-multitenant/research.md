# Research: Segurança e Isolamento Multi-Tenant

## Decision 1: Reutilizar o vínculo atual de usuário e tenant

**Decision**: A autorização deve partir do usuário autenticado, do tenant selecionado e do
vínculo disponível em `availableTenants`, incluindo papel e permissões explícitas.

**Rationale**: O projeto já carrega `canRead`, `canWrite`, `canDelete` e
`canManageSharing`, resolve papéis de proprietário, gerente, operador e consulta, e expõe
esse snapshot para a UI.

**Alternatives considered**: Criar um segundo cadastro local de permissões foi rejeitado
porque poderia divergir do vínculo de tenant e introduzir uma fonte concorrente de verdade.

## Decision 2: Validar operações por uma matriz explícita

**Decision**: Toda operação protegida será classificada como leitura, escrita, exclusão ou
gerenciamento de compartilhamento, com uma regra única de autorização.

**Rationale**: A existência de `canWrite` não deve implicitamente liberar exclusão ou
compartilhamento. Uma matriz explícita permite testar cada combinação de perfil e ação.

**Alternatives considered**: Usar apenas o papel textual foi rejeitado porque permissões
personalizadas do vínculo compartilhado já são suportadas.

## Decision 3: Revalidar na fila offline

**Decision**: O enfileiramento e o flush devem manter usuário/tenant da operação e
revalidar escopo e autorização antes de aplicar cada item.

**Rationale**: Uma permissão pode mudar enquanto o item está pendente; filtrar somente por
usuário ou somente no momento do enfileiramento não cobre esse caso.

**Alternatives considered**: Confiar apenas no filtro de tenant já existente no flush foi
rejeitado porque não cobre revogação de permissão nem operações com payload inconsistente.

## Decision 4: Não alterar persistência nesta feature

**Decision**: Não criar migrations, alterar RLS, remover colunas/tabelas ou migrar dados.

**Rationale**: A Constituição exige uma iniciativa própria para reconstrução da persistência,
e a spec 003 trata da fronteira de autorização da aplicação e da fila offline.

**Alternatives considered**: Ajustar políticas do banco simultaneamente foi rejeitado por
ampliar o risco e exigir especificação, staging, rollback e aprovação próprios.

## Decision 5: Falhar fechado e sem revelar dados

**Decision**: Tenant ausente, divergente, sessão inválida ou permissão insuficiente devem
interromper a operação com erro seguro e sem fallback automático para outro tenant.

**Rationale**: O fallback atual de seleção é aceitável no bootstrap inicial, mas não deve
ser usado para autorizar uma operação iniciada com escopo inválido.

**Alternatives considered**: Redirecionar silenciosamente para o tenant proprietário foi
rejeitado porque pode ocultar erro e produzir leitura ou escrita no escopo errado.
