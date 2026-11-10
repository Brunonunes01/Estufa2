# Navigation and Data Boundary Contract

## Purpose

Definir os contratos observáveis para retirar campo, talhões e hidroponia da superfície ativa.

## Active product boundary

A aplicação deve expor somente:

- Estufas e seu cadastro, consulta e operação.
- Plantios, colheitas, insumos, aplicações e manejos de estufa.
- Vendas, recebimentos, despesas, clientes, fornecedores, financeiro e relatórios
  compatíveis com estufas.
- Autenticação, permissões, isolamento multi-tenant, operação offline e sincronização.

## Removed product boundary

A aplicação não deve expor nem exigir:

- Campo e gestão operacional de cultivo em áreas abertas.
- Cadastro, consulta ou manutenção de talhões.
- Hidroponia, lotes, estruturas, leituras, ocupações e movimentações hidroponia.
- Rotas, telas, ações rápidas, seletores de origem e dependências exclusivas desses domínios.
- Acesso operacional a registros históricos desses domínios.

## Navigation invariants

- A entrada de operação principal é sempre a gestão de estufas convencionais.
- A navegação e ações rápidas não oferecem Campo, Talhões, CampoVendaForm, hidroponia ou
  origem equivalente.
- Acesso direto a rota retirada é bloqueado ou resulta em saída segura, sem expor dados.
- Plantio, colheita, venda e relatório de estufa não solicitam seleção obrigatória de campo,
  talhão ou hidroponia.
- Módulos compartilhados continuam acessíveis no contexto de uma estufa.

## Data and security invariants

- Nenhum dado histórico de campo, talhão ou hidroponia é excluído automaticamente.
- Nenhuma migração destrutiva, alteração de produção ou remoção de tabela/coluna faz parte
  deste plano.
- Toda leitura, escrita e sincronização respeita tenant e permissões.
- Operações offline autorizadas de estufa sobrevivem à reconexão sem perda ou duplicidade.
- Relações históricas podem permanecer no armazenamento sem se tornarem caminhos ativos.
- Novas escritas operacionais de plantio, colheita e venda devem possuir `estufaId` e não
  podem introduzir `talhaoId`; essa guarda não reclassifica registros históricos.

## Compatibility contract

A implementação mantém autenticação, tenant, offline e módulos compartilhados. Tipos
gerados ou campos legados só podem ser reduzidos se houver prova de que não são necessários
para leitura, sincronização, testes ou compatibilidade histórica; remover schema fica fora
deste plano.

