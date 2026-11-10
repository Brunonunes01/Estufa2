# Research: Separação do Domínio Produtivo

## Decisão 1: Extrair regras puras antes de alterar orquestração

**Decision**: separar validações de origem, vínculo, transição e pagamento em contratos determinísticos antes de reorganizar os serviços.

**Rationale**: os serviços atuais concentram leitura, validação, persistência, rastreabilidade e efeitos financeiros. Extrair tudo de uma vez aumentaria o risco de alterar o comportamento aprovado.

**Alternatives considered**: reescrever plantio, colheita e venda em novos serviços independentes; rejeitado por ampliar o diff e dificultar a comparação com o comportamento existente.

## Decisão 2: Manter os serviços atuais como orquestradores

**Decision**: preservar os pontos de entrada atuais e fazê-los consumir regras extraídas, mantendo tenant, autorização, offline e efeitos colaterais no fluxo já conhecido.

**Rationale**: a aplicação já possui consumidores de serviço, handlers offline, telas e testes integrados. A estabilidade desses contratos é requisito da spec.

**Alternatives considered**: alterar todas as telas para uma nova API de casos de uso; rejeitado nesta iniciativa por misturar separação de domínio com migração de arquitetura.

## Decisão 3: Origem operacional continua sendo estufa convencional

**Decision**: novas operações continuam exigindo estufa e rejeitando origem mista ou talhão; registros legados podem continuar sendo lidos conforme os adaptadores atuais.

**Rationale**: a iniciativa 001 retirou a superfície ativa de Campo/Talhão e a 003 consolidou o isolamento multi-tenant. A separação não pode reabrir esses caminhos.

**Alternatives considered**: remover imediatamente campos legados dos modelos e do banco; rejeitado porque violaria a preservação histórica e exigiria uma spec de persistência.

## Decisão 4: Offline usa os mesmos contratos do online

**Decision**: a ação offline deve carregar a mesma intenção de domínio e passar pelas mesmas validações de tenant, autorização, origem e estado antes do replay.

**Rationale**: a fila já preserva ação, payload, usuário, tenant e permissões. Regras duplicadas no handler poderiam aceitar um estado que o fluxo online recusaria.

**Alternatives considered**: permitir que o replay confie apenas na validação feita no momento do enqueue; rejeitado porque permissões e estados podem mudar antes da reconciliação.

## Decisão 5: Estados financeiros permanecem explícitos

**Decision**: preservar a distinção entre valor combinado, valor recebido, pendente, cheque em mãos e cheque compensado.

**Rationale**: relatórios, caixa, recebimentos e compatibilidade histórica dependem dessa distinção; consolidá-los em um único estado produziria perda semântica.

**Alternatives considered**: normalizar todos os pagamentos em uma representação nova; rejeitado por risco de alterar cálculos e dados históricos.

## Decisão 6: Sem nova consulta obrigatória para regra local

**Decision**: regras de domínio puras não devem exigir consulta remota adicional; consultas necessárias para obter o registro atual ou revalidar autorização permanecem nas fronteiras já existentes.

**Rationale**: preserva performance, offline-first e previsibilidade dos fluxos atuais.

**Alternatives considered**: centralizar toda validação em chamadas remotas; rejeitado por degradar offline e ampliar o acoplamento com persistência.
