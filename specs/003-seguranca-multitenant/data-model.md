# Data Model: Segurança e Isolamento Multi-Tenant

Este modelo descreve os dados necessários para autorização da aplicação. Não autoriza
alteração de schema, migration ou dados de produção.

## Usuário autenticado

- **Identidade**: identificador da sessão autenticada.
- **Relações**: possui um ou mais vínculos de tenant.
- **Validação**: sessão ausente ou expirada não pode executar operação protegida.

## Tenant

- **Identidade**: identificador normalizado da propriedade/operação.
- **Estado de seleção**: tenant atualmente escolhido pelo usuário.
- **Validação**: deve existir na lista de tenants autorizados para o usuário.
- **Regra**: não há fallback automático para outro tenant durante uma operação.

## Membro do tenant

- **Identidade**: par usuário–tenant.
- **Atributos**: papel, leitura, escrita, exclusão e gerenciamento de compartilhamento.
- **Regra**: permissões explícitas podem restringir os defaults do papel.

## Snapshot de acesso

- **Origem**: usuário autenticado e membro do tenant selecionado.
- **Operações**: `read`, `write`, `delete` e `manageSharing`.
- **Regra**: cada operação deve consultar a permissão correspondente; escrita não implica
  exclusão ou compartilhamento.

## Operação protegida

- **Identidade**: ação, usuário, tenant, entidade alvo e resultado.
- **Escopo**: leitura, escrita, exclusão, compartilhamento ou sincronização.
- **Validação**: tenant normalizado, tenant selecionado coincidente e permissão adequada.
- **Falha**: rejeição segura, sem revelar dados de outro tenant.

## Operação offline pendente

- **Identidade**: item idempotente da fila.
- **Atributos**: usuário, tenant, ação, payload, tentativas, estado e erro tratável.
- **Estados**: pendente, processando, sincronizada ou falha.
- **Transição**: somente itens do usuário e tenant ativos, ainda autorizados, podem ser
  aplicados.
- **Regra**: repetição de flush não pode aplicar a mesma operação válida duas vezes.

## Registro histórico legado

- **Estado**: preservado, mesmo quando contém referências de Campo, Talhão ou Hidroponia.
- **Acesso**: não cria rota operacional nem altera a regra de autorização ativa.
- **Regra**: esta feature não converte, apaga ou reclassifica o registro.

## Invariantes

1. Toda operação ativa possui exatamente um tenant autorizado.
2. Tenant inválido, divergente ou não autorizado bloqueia a operação.
3. Permissão é verificada por tipo de operação.
4. Offline não reduz as regras de autorização online.
5. Falhas de autorização são observáveis sem exposição de dados sensíveis.
