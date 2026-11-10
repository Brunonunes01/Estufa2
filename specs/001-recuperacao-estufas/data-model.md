# Data Model: Recuperação e Simplificação do Estufa2

Este modelo descreve limites de dados a preservar. Não autoriza migrações, exclusões ou
alteração do banco de produção.

## Entidades ativas

### Estufa

- Identidade: identificador da estufa dentro do tenant.
- Dados principais: nome, identificação operacional, status e atributos do manejo convencional.
- Relações: pertence a um tenant; possui plantios, colheitas e operações compartilhadas.
- Regra: é a única unidade produtiva ativa do aplicativo.

### Plantio

- Identidade: identificador do ciclo dentro do tenant.
- Relações ativas: deve referenciar uma estufa nos fluxos produtivos atuais.
- Dados operacionais: cultura, datas, status, lote/ciclo e acompanhamento.
- Regra: novos fluxos não podem exigir ou selecionar talhão, origem de campo ou hidroponia.

### Colheita

- Identidade: identificador associado ao tenant.
- Relações: permanece vinculada ao plantio e à operação de estufa no fluxo ativo.
- Regra: o fluxo não oferece origem ou destino exclusivos de campo/hidroponia.

### Registro compartilhado

Inclui insumos, aplicações, manejos, vendas, recebimentos, despesas, clientes,
fornecedores, financeiro e relatórios.

- Relações: operam com contexto de estufa e tenant.
- Regra: associação exclusiva de campo, talhão ou hidroponia não pode ser obrigatória para
  concluir um cenário de estufa.
- Integridade: vínculos financeiros e operacionais existentes permanecem consistentes.

## Entidades históricas preservadas

### Registros de campo, talhão e hidroponia

- Estado: retidos no armazenamento existente, sem acesso operacional no aplicativo.
- Relações: podem manter referências históricas entre plantios, vendas, lotes, talhões e
  estruturas hidroponia.
- Regra: não excluir, converter automaticamente, arquivar de forma destrutiva ou
  reclassificar sem especificação posterior.
- Acesso: nenhuma tela ou fluxo operacional novo deve ser criado para recuperá-los.

### Tenant e usuário autorizado

- Identidade: contexto obrigatório para consulta, escrita e sincronização.
- Regra: fluxos ativos filtram dados por tenant e respeitam permissões, inclusive offline.

### Operação offline pendente

- Identidade: ação local autorizada aguardando sincronização.
- Estado: pendente, sincronizada ou falha tratável conforme comportamento atual.
- Regra: a remoção de módulos não descarta operações de estufa nem as duplica na reconexão.

## Regras de transição

1. Registros novos pertencem somente ao domínio de estufas convencionais.
2. Registros legados não são convertidos automaticamente.
3. Relações compartilhadas são mantidas quando necessárias a fluxos de estufa.
4. Remoção de tela não equivale a remoção da linha histórica.
5. Toda escrita ativa conserva tenant, permissão e consistência de origem.

