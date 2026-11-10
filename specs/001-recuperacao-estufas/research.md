# Research: Recuperação e Simplificação do Estufa2

## Decision 1: Restringir o modo produtivo ativo a estufas convencionais

- Decision: O aplicativo deve expor somente o modo de operação de estufa convencional. O
  modo campo e parâmetros de origem de campo deixam de ser caminhos ativos.
- Rationale: rootNavigatorConfig.ts, appSettingsHelpers.ts e DashboardScreen.tsx
  condicionam títulos, ícones, ações e entradas à produção de campo.
- Alternatives considered: Manter um seletor de modo e apenas ocultar algumas telas.
  Rejeitado porque preservaria caminhos indiretos entre navegação, formulários e relatórios.

## Decision 2: Retirar a superfície de navegação antes de alterar persistência

- Decision: Rotas, tabs, ações rápidas e telas exclusivas de campo/talhão deixam de ser
  acessíveis; dados persistidos não serão apagados.
- Rationale: MainTabsNavigator.tsx alterna entre CampoHubScreen e EstufasListScreen;
  AppStackNavigator.tsx registra TalhoesList, TalhaoForm e CampoVendaForm.
- Alternatives considered: Remover tabelas e colunas do Supabase. Rejeitado pela Constituição,
  pela especificação e pela necessidade de preservar históricos.

## Decision 3: Desacoplar fluxos compartilhados de entidades exclusivas

- Decision: Plantios, colheitas, vendas e relatórios de estufa devem operar sem exigir
  talhaoId, origem campo ou lote hidroponia; relações legadas permanecem para
  compatibilidade histórica quando necessário.
- Rationale: PlantioFormScreen, ColheitaFormScreen, VendasListScreen,
  RelatorioOperacionalScreen e os wizards ainda possuem referências de origem de campo.
- Alternatives considered: Converter automaticamente registros legados para estufas.
  Rejeitado porque inventaria relações e poderia corromper a integridade histórica.

## Decision 4: Preservar o schema legado sem reativar hidroponia

- Decision: Tipos e tabelas legadas hidro_* e campos hydro_lote_id ou
  hydroponic_system_type não serão removidos nesta iniciativa. O plano retira seus caminhos
  de uso ativo e mantém os dados sem acesso operacional.
- Rationale: O schema inicial e os tipos gerados ainda contêm estruturas hidroponia,
  inclusive relações com estufas.
- Alternatives considered: Apagar enumerações, tabelas ou colunas. Rejeitado por risco de
  perda histórica e por estar fora do escopo aprovado.

## Decision 5: Usar regressão existente e validação completa

- Decision: Validar com typecheck, lint, testes unitários/integrados existentes e
  cenários manuais multiplataforma, priorizando tenant, origem de produção e offline.
- Rationale: O projeto já possui npm run validate e testes focados em
  productionOriginGuard, tenant e sincronização offline.
- Alternatives considered: Validar apenas compilação. Rejeitado porque a remoção de
  caminhos pode quebrar segurança, relações de origem e sincronização sem erro de tipo.

## Decision 6: Não introduzir dependências

- Decision: Reutilizar React Navigation, serviços existentes, armazenamento offline,
  Supabase e runner de testes atuais.
- Rationale: A Constituição exige justificativa e autorização para mudanças de dependência.
- Alternatives considered: Adotar biblioteca de feature flags ou roteamento. Rejeitado por
  aumentar a superfície sem necessidade para o escopo.

