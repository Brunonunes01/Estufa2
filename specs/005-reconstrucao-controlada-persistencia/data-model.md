# Data Model: Reconstrução Nova da Persistência

## Princípios do modelo

- Toda entidade operacional pertence a um tenant explícito.
- Relações produtivas devem conservar tenant, estufa e ciclo compatíveis.
- Dados legados não fazem parte da criação operacional nova.
- Permissões de leitura, escrita, exclusão e compartilhamento são distintas.
- Auditoria registra ator, tenant, operação, entidade e resultado sem expor segredos.

## Entidades de identidade e segurança

| Entidade | Campos conceituais | Relações e regras |
|---|---|---|
| Tenant | id, nome, proprietário, timestamps | Um proprietário e vários membros autorizados |
| Perfil | id do usuário, nome, contato, timestamps | Relacionado à identidade autenticada |
| Membership | tenant, usuário, papel, permissões | Unique por tenant/usuário; define escopo e ações |
| Código de compartilhamento | código, tenant, criador, validade, uso | Não concede mais que as permissões definidas |

O cadastro novo começa vazio. A primeira conta e o tenant proprietário são criados pelo fluxo de cadastro do novo ambiente; memberships adicionais surgem por convite ou associação posterior, sem consultar registros do legado.

## Entidades produtivas

| Entidade | Campos conceituais | Relações e regras |
|---|---|---|
| Estufa | tenant, nome, capacidade, status | Pertence a um tenant; status controla operação |
| Safra | tenant, nome, período, status | Pertence ao tenant; opcional para ciclo |
| Plantio/ciclo | tenant, estufa, safra, cultura, datas, status | Nova operação exige estufa e não aceita origem mista |
| Colheita | tenant, plantio, estufa, data, quantidade, pesos, destino | Plantio e estufa devem compartilhar tenant e ciclo |
| Venda | tenant, plantio/colheita, estufa, cliente, valores, pagamento | Valor combinado é separado do recebido |
| Item de venda | venda, colheita, quantidade, unidade, valor unitário | Não pode ultrapassar ou desacoplar a venda pai |

## Entidades operacionais e financeiras

Clientes, fornecedores, insumos, entradas de estoque, aplicações, manejos, tarefas, despesas, pessoas de caixa e movimentos financeiros devem carregar tenant e referências ao ciclo quando aplicável. Vendas preservam estados pendente, atrasado, cheque em mãos e pago/compensado sem somar cheque não compensado ao recebido real.

## Auditoria e suporte

Eventos de rastreabilidade e auditoria registram tenant, ator, entidade, ação, timestamps e metadados seguros. Componentes de suporte somente entram se houver requisito operacional aprovado e sempre com escopo de acesso separado.

## Transições

```text
baseline proposta -> revisada -> aplicada em ambiente vazio -> validada -> aprovada
                                                                  -> rejeitada/corrigida
ambiente legado    -> preservado durante toda a iniciativa
cutover solicitado  -> aprovado -> executado
                   -> recusado/revertido
```
