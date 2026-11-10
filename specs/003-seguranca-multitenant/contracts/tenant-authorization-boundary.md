# Contrato de Fronteira de Autorização por Tenant

## Objetivo

Definir o comportamento observável de autorização para os fluxos ativos de estufa,
módulos compartilhados e fila offline.

## Matriz de operações

| Operação | Permissão obrigatória | Exemplos | Falha esperada |
|---|---|---|---|
| `read` | `canRead` | listar estufas, consultar plantios e relatórios | não retornar dados |
| `write` | `canWrite` | criar ou editar estufa, plantio, venda ou despesa | não persistir nem enfileirar ação aplicável |
| `delete` | `canDelete` | remover registro autorizado | não remover nem enfileirar exclusão aplicável |
| `manageSharing` | `canManageSharing` | convidar, remover ou alterar membro | não revelar administração nem alterar vínculo |

## Regras de tenant

- A operação deve receber um tenant não vazio e normalizado.
- O tenant da operação deve coincidir com o tenant selecionado.
- O tenant selecionado deve estar entre os tenants disponíveis ao usuário autenticado.
- Divergência de tenant deve falhar antes da consulta ou escrita de dados.
- Não é permitido escolher automaticamente outro tenant para concluir uma operação.

## Regras de sessão e permissão

- Sessão ausente, expirada ou sem vínculo autorizado bloqueia a operação.
- O papel fornece defaults, mas flags explícitas do vínculo podem restringir permissões.
- `canWrite` não concede implicitamente `canDelete` ou `canManageSharing`.
- A UI pode ocultar ou desabilitar ações, mas a guarda da operação também é obrigatória.
- Mensagens de erro não devem informar registros, tenants ou permissões de terceiros.

## Regras offline

- Cada item pendente deve preservar usuário e tenant de origem.
- O armazenamento local deve filtrar itens incompatíveis com a sessão ativa.
- O flush deve revalidar tenant e permissão antes da aplicação do item.
- Item inválido deve permanecer identificável como falha ou ser rejeitado de forma explícita;
  nunca deve ser aplicado silenciosamente em outro tenant.
- A reconciliação deve ser idempotente e não duplicar operação já aplicada.

## Limites

- Este contrato não altera políticas RLS, tabelas, colunas ou migrations.
- Este contrato não reintroduz rotas de Campo, Talhão ou Hidroponia.
- Registros históricos permanecem preservados e fora da superfície operacional.

## Dependência adicional implementada

- A fila offline mantém o escopo do usuário autenticado, tenant e permissões no item.
- O enfileiramento usa a autorização local da sessão para rejeitar tenant divergente ou operação não permitida sem gravar o item.
- O flush revalida o vínculo e as flags de permissão no momento da reconciliação; itens sem escopo ou revogados permanecem retidos com falha identificável e não são migrados para o tenant ativo.
