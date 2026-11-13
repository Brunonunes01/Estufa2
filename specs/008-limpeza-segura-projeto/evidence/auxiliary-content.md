# Evidência: Conteúdo auxiliar

**Capturada em**: 2026-11-13
**Métodos**: listagem, hashes, configuração Expo, scripts e busca de referências

## EVD-0009 — Assets Expo

`adaptive-icon.png`, `icon.png` e `splash-icon.png` possuem o mesmo SHA-256, mas os três caminhos são consumidos explicitamente por `app.json` para funções distintas de build.

**Resultado**: manter. Uma consolidação exigiria alterar configuração protegida e validar builds, portanto fica fora desta limpeza.

## EVD-0010 — Portal de suporte

`support-portal/server.mjs` é executado por `npm run support:portal` e serve `index.html`, `portal.js`, `styles.css` e documentação própria.

**Resultado**: manter como aplicação auxiliar ativa.

## EVD-0011 — Documentação técnica e histórica

`docs/` possui 13 arquivos sobre arquitetura, Supabase, frontend, suporte, relatórios de progresso e pesquisas históricas de Campo/Hidroponia. Parte não representa o domínio produtivo atual, mas pode ser necessária para auditoria e continuidade.

**Resultado**: investigar documentos históricos individualmente em iniciativa documental; não remover nesta rodada.

## EVD-0012 — Materiais de atualização visual

`Atualização/` contém dois planos de UX/UI sem referência automatizada. Eles podem representar backlog ou histórico de decisão.

**Resultado**: investigar; confirmação operacional ausente.

## EVD-0013 — Imagens de comprovantes

`exemplos de comprovate/` contém duas imagens sem referências no código. Podem ser exemplos manuais de design ou validação visual.

**Resultado**: investigar; confirmação operacional ausente e o nome da pasta não é evidência suficiente para remoção.
