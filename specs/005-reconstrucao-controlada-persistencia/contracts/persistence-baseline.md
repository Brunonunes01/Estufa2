# Contrato da Baseline de Persistência

## Objetivo

Definir o que uma baseline nova precisa garantir para que o banco seja criado do zero com segurança, rastreabilidade e compatibilidade com o aplicativo, sem alterar o legado.

## Regras obrigatórias

- A baseline é ordenada, versionada e reproduzível em ambiente vazio.
- Nenhuma migration depende de dados existentes no banco legado.
- O cadastro inicial cria usuários e memberships do zero, sem importar identidades ou credenciais legadas.
- Cada objeto possui justificativa no modelo aprovado.
- Tenant e permissões são aplicados antes de qualquer operação operacional.
- Toda tabela operacional possui escopo de tenant e políticas de leitura/escrita adequadas.
- RLS não pode permitir acesso cruzado entre tenants.
- Vínculos de estufa, ciclo, plantio, colheita e venda preservam a integridade do domínio.
- Estados financeiros mantêm valor combinado, recebido, pendência e cheque compensado separados.
- Auditoria e rastreabilidade não armazenam segredos.
- Falha de credencial ou integração não resulta em aprovação fictícia.
- O banco legado permanece intacto e separado.
- Cutover exige aprovação explícita, evidências de staging e rollback.

## Evidências mínimas

Cada migration deve ter teste de aplicação limpa. O cadastro novo deve ser testado sem usuários prévios. Cada política de segurança deve ter teste permitido e negado. Cada vínculo produtivo deve ter teste de tenant divergente. Cada alteração de cutover deve possuir registro de decisão, responsável, janela e reversão.

## Resultado local

- Testes de ordem, reprodutibilidade, inventário, isolamento, contratos financeiros,
  auditoria, offline e gates de credenciais: PASS.
- As migrations aplicam RLS por tenant e constraints compostas para vínculos de
  estufa, plantio, colheita, venda e recebimento.
- Staging, cutover, responsável, janela e aprovação permanecem sem registro até que
  credenciais e aprovação explícita sejam fornecidas.

## Evidência do projeto novo

- `Agro_Estufa` foi criado vazio e recebeu as migrations `0001`–`0012` via CLI.
- A segunda execução em modo dry-run confirmou que não há migrations pendentes.
- A aplicação ocorreu somente no projeto novo; o legado não foi vinculado nem alterado.
