# Contrato da Fronteira do Domínio Produtivo

## Objetivo

Garantir que plantio, colheita e venda compartilhem regras consistentes sem alterar os fluxos aprovados de estufas convencionais, o isolamento multi-tenant ou dados históricos.

## Entradas protegidas

Toda operação produtiva deve receber ou resolver:

1. usuário autenticado;
2. tenant ativo autorizado;
3. origem de estufa;
4. ciclo/registro relacionado, quando aplicável;
5. intenção da operação e estado esperado.

## Invariantes

- Tenant vazio, divergente ou não autorizado bloqueia antes de consulta ou escrita alvo.
- Novas escritas exigem `estufaId` e não aceitam `talhaoId` ou origem mista.
- Plantio, colheita e venda relacionados devem permanecer no mesmo tenant.
- Permissão de escrita não concede exclusão ou compartilhamento automaticamente.
- Regra de domínio não deve depender de estado visual de tela para ser válida.
- Item offline deve passar pela mesma fronteira no enqueue e na reconciliação.
- Falha de autorização é identificável e não entra no retry de falha transitória.
- Item aplicado com sucesso deixa de estar pendente, evitando duplicidade.
- Registro histórico permanece preservado e fora da criação operacional ativa.

## Compatibilidade financeira

O contrato preserva separadamente:

- valor total/combinado da venda;
- valor recebido de fato;
- status pendente ou atrasado;
- cheque em mãos;
- cheque compensado.

Nenhuma regra extraída pode alterar os cálculos existentes de caixa, relatórios, recebimentos ou rentabilidade sem requisito específico.

## Compatibilidade de superfície

A iniciativa não cria rotas, telas ou seletores ativos para Campo, Talhão ou Hidroponia. Referências históricas podem permanecer em tipos, adaptadores e persistência conforme o contrato aprovado, sem serem convertidas em novas opções de operação.

## Evidência mínima

Cada regra extraída deve ter:

- teste unitário para entradas válidas e inválidas;
- teste de integração quando envolver persistência, autorização ou offline;
- cenário de regressão para confirmar equivalência do fluxo preservado.

## Pontos de entrada consolidados

As entradas online continuam sendo os serviços públicos de plantio, colheita e venda.
As entradas offline enfileiram a intenção original e o replay chama os mesmos serviços
com `online_only`, revalidando escopo e permissão antes da aplicação. As regras puras de
origem, tenant, quantidade/preço, data mínima do ciclo e pesos não acessam persistência.
