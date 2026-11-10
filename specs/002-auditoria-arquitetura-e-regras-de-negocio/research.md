# Research: Auditoria de Arquitetura e Regras de Negócio

## Decision 1: Escopo orientado por fluxos ativos e dependências relevantes

- **Decision**: A auditoria cobrirá os fluxos ativos de estufas, os módulos compartilhados
  e as dependências legadas que possam afetar dados, segurança ou compatibilidade.
- **Rationale**: Esse recorte protege o domínio atual sem transformar a iniciativa em uma
  revisão indiscriminada de todo o repositório. Dependências legadas podem continuar
  influenciando leitura, sincronização ou integridade mesmo quando não possuem entrada
  operacional.
- **Alternatives considered**:
  - Auditar todo o repositório com a mesma profundidade: rejeitado por ampliar o escopo e
    reduzir a capacidade de concluir a análise dos fluxos de estufa.
  - Auditar somente as telas de estufa: rejeitado porque regras críticas também podem
    estar em serviços, sincronização, autenticação e persistência.

## Decision 2: Relatório estruturado como entrega principal

- **Decision**: O resultado será um relatório com inventário, mapa de dependências,
  catálogo de regras, matriz de riscos, lacunas de testes e recomendações de limites de
  responsabilidade.
- **Rationale**: Um relatório estruturado torna os achados revisáveis, evita conhecimento
  informal e permite que futuras especificações reutilizem as mesmas evidências.
- **Alternatives considered**:
  - Lista simples de arquivos problemáticos: rejeitada por não registrar contratos,
    dependências ou impacto.
  - Projeto detalhado da arquitetura futura: rejeitado porque anteciparia decisões de
    implementação e ultrapassaria o escopo de auditoria.

## Decision 3: Recomendações sem implementação

- **Decision**: A auditoria poderá propor limites de responsabilidade, agrupamentos e
  ordem de melhorias, mas não prescrever código, criar tarefas técnicas detalhadas ou
  alterar o comportamento atual.
- **Rationale**: Separar diagnóstico de execução reduz risco de refatoração oportunista e
  mantém cada mudança sujeita a uma especificação própria.
- **Alternatives considered**:
  - Refatorar durante a auditoria: rejeitado pela Constituição e pelo requisito de
    preservar comportamento.
  - Não propor nenhuma direção futura: rejeitado porque não ajudaria a reduzir a
    concentração de regras identificada.

## Decision 4: Auditoria aprovada como gate do novo banco

- **Decision**: A especificação do novo banco permanecerá bloqueada até a revisão e
  aprovação formal do relatório de auditoria.
- **Rationale**: O novo modelo de persistência deve partir de responsabilidades e
  contratos entendidos, e não reproduzir ambiguidades do legado.
- **Alternatives considered**:
  - Executar auditoria e banco em paralelo: rejeitado pelo risco de decisões divergentes.
  - Usar a auditoria apenas como referência: rejeitado porque não impediria uma baseline
    baseada em regras ocultas ou acoplamentos não avaliados.

## Decision 5: Evidência estática e comportamental disponível no repositório

- **Decision**: A análise usará código, testes, documentação, configurações e histórico
  de persistência disponíveis no repositório; indisponibilidade de ambientes externos será
  registrada como limitação, não preenchida por suposição.
- **Rationale**: A auditoria precisa ser reproduzível e segura, sem acessar ou alterar
  produção. Testes existentes ajudam a distinguir contratos observados de hipóteses.
- **Alternatives considered**:
  - Validar somente por leitura de código: rejeitado porque não revela cobertura e
    comportamento observado.
  - Acessar diretamente produção para confirmar regras: rejeitado pela Constituição e
    pela restrição de não alterar nem depender de produção.

## Decision 6: Priorização por risco e reversibilidade

- **Decision**: Achados serão priorizados por impacto no comportamento preservado,
  integridade/segurança dos dados, concentração de responsabilidades, dependências e
  facilidade de validação/reversão.
- **Rationale**: A ordem deve favorecer melhorias que reduzam risco sem criar uma
  reescrita ampla.
- **Alternatives considered**:
  - Priorizar apenas por tamanho do arquivo: rejeitado porque volume de código não mede
    impacto nem risco.
  - Priorizar apenas por esforço: rejeitado porque pode colocar mudanças fáceis, porém
    pouco relevantes, à frente de riscos críticos.
