# Research: Limpeza Segura do Projeto

## 1. Forma do inventário

**Decision**: Usar artefatos Markdown versionados: um inventário central, uma baseline inicial e um documento por lote.

**Rationale**: O trabalho depende de revisão humana, justificativas, aprovações e rastreabilidade. Markdown permite diff legível, links relativos e revisão sem adicionar dependências ou uma aplicação administrativa.

**Alternatives considered**:

- Planilha externa: rejeitada porque separa a decisão do histórico do repositório e dificulta revisão por diff.
- Banco ou painel próprio: rejeitado por complexidade desproporcional e por ampliar o escopo técnico.
- JSON como fonte primária: rejeitado porque aprovações e justificativas extensas ficam menos legíveis; poderá ser derivado futuramente se houver necessidade comprovada.

## 2. Critério de evidência para remoção

**Decision**: Exigir cumulativamente análise de referências, validações aprovadas e confirmação de ausência de uso operacional conhecido.

**Rationale**: Imports e referências textuais não cobrem carregamento dinâmico, convenções, scripts, assets, configuração ou processos manuais. A combinação atende à clarificação aprovada e reduz falsos positivos.

**Alternatives considered**:

- Ausência de imports: rejeitada por não cobrir usos indiretos.
- Cobertura de testes isoladamente: rejeitada porque a suíte pode não representar todos os fluxos operacionais.
- Decisão discricionária do revisor: rejeitada por não ser reproduzível.

## 3. Detecção de código e arquivos sem uso

**Decision**: Partir das entradas conhecidas (`index.ts`, `App.tsx`, scripts do `package.json`, configurações, portal de suporte, automações e documentação), cruzar referências com `rg` e inspeção do TypeScript, e registrar lacunas como `investigar`.

**Rationale**: O projeto possui múltiplas entradas, assets, scripts PowerShell/Node/Python e convenções de Expo. Nenhum analisador único prova ausência de uso em todas essas fronteiras.

**Alternatives considered**:

- Adicionar detector externo de código morto: rejeitado porque mudaria dependências e ainda não cobriria uso operacional ou dinâmico.
- Considerar todo arquivo sem import como removível: rejeitado por risco de build, configuração e operação.

## 4. Granularidade de coleções geradas

**Decision**: Inventariar dependências instaladas, caches e temporários como unidades agregadas, registrando origem, regra de regeneração e política de versionamento.

**Rationale**: Analisar milhares de itens homogêneos individualmente não melhora a decisão. O contrato da spec permite agregação quando origem e tratamento são comuns.

**Alternatives considered**:

- Uma linha por arquivo gerado: rejeitada por volume e baixa utilidade de revisão.
- Ignorar conteúdo não versionado: rejeitado porque a clarificação inclui todo o repositório visível.

## 5. Áreas protegidas

**Decision**: Tratar governança, especificações, histórico de migrations, segredos, ambientes, metadados de versionamento e infraestrutura crítica como somente auditáveis. Candidatos nessas áreas recebem recomendação `manter` ou `investigar`, nunca lote de alteração nesta feature.

**Rationale**: Essas áreas estão explicitamente protegidas pela spec e pela constituição; uma possível redundância deve originar especificação própria.

**Alternatives considered**:

- Permitir remoção após dupla aprovação: rejeitada porque contrariaria FR-006A.
- Excluir áreas protegidas do inventário: rejeitada porque impediria o mapa completo solicitado.

## 6. Fronteira de um lote

**Decision**: Um lote representa uma única justificativa semântica e uma única estratégia coerente de validação e reversão; não haverá limite arbitrário por quantidade de arquivos.

**Rationale**: Um grupo de arquivos gerados pode ser grande e atômico, enquanto um único arquivo de entrada pode ter risco alto. Coesão e reversibilidade são medidas mais úteis que contagem.

**Alternatives considered**:

- Limite fixo de arquivos: rejeitado por não representar risco.
- Um lote único para toda a limpeza: rejeitado por dificultar diagnóstico e reversão.
- Um arquivo por lote: rejeitado por fragmentar grupos que só fazem sentido juntos.

## 7. Árvore de trabalho preexistente

**Decision**: Registrar a baseline de `git status --short` e considerar toda alteração já presente como pertencente ao usuário ou a outra feature. Candidato sobreposto fica bloqueado até que seja possível distinguir os diffs com segurança.

**Rationale**: O repositório já contém arquivos modificados, removidos e não rastreados. Sobrescrever ou atribuir essas mudanças à limpeza violaria preservação e rastreabilidade.

**Alternatives considered**:

- Exigir árvore limpa: rejeitada porque poderia bloquear trabalho legítimo e induzir operações de Git não autorizadas.
- Reverter mudanças existentes: rejeitada por ser destrutiva e fora do escopo.

## 8. Validação proporcional ao risco

**Decision**: Todo lote executa verificações focadas e `npm run validate`; lotes que alcançam UI, navegação, persistência, segurança, offline, build ou operação também executam as jornadas e verificações específicas dessa fronteira.

**Rationale**: O gate geral detecta regressões amplas, mas não prova sozinho carregamento de assets, fluxos manuais, isolamento de tenant ou operação offline.

**Alternatives considered**:

- Somente suíte completa: rejeitada porque pode não indicar claramente a causa e não cobre toda operação manual.
- Somente testes focados: rejeitada porque pode ocultar regressões transversais.

## 9. Registro das aprovações

**Decision**: Registrar no documento do lote duas decisões independentes: aprovação de escopo pelo responsável do produto e validação técnica de evidências, riscos e reversão.

**Rationale**: A separação implementa a clarificação aprovada e impede que uma única perspectiva autorize a remoção.

**Alternatives considered**:

- Aprovação informal fora do artefato: rejeitada por não ser auditável.
- Uma assinatura única: rejeitada porque mistura responsabilidade de produto e técnica.
