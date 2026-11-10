# Contrato do Gate de Aprovação da Auditoria

## Estado

**Estado atual desta iniciativa:** **Bloqueado**, aguardando revisão e aprovação formal
do relatório em [audit-report.md](../audit-report.md). A auditoria documental foi
consolidada, mas o estado Aprovado só pode ser registrado por responsável autorizado.

**Atualização após a iniciativa 001:** a retirada aprovada da superfície de Campo/Talhão foi
registrada em [audit-report.md](../audit-report.md), incluindo a remoção das rotas de
`AppStackNavigator.tsx`, da entrada de `CampoHubScreen` e dos arquivos exclusivos de Campo.
Essa retirada não equivale à exclusão de dados históricos nem libera a especificação do novo
banco; o gate permanece Bloqueado.

O gate possui um dos estados:

- **Pendente**: auditoria ainda não concluída ou evidências insuficientes.
- **Bloqueado**: há risco crítico, decisão pendente ou violação constitucional.
- **Aprovado**: relatório revisado e aceito para iniciar a especificação do novo banco.

## Condições para aprovação

- Escopo da auditoria concluído conforme a decisão registrada.
- Fluxos preservados de estufa e módulos compartilhados avaliados.
- Contratos de segurança, multi-tenant, offline e integridade documentados.
- Achados críticos classificados e tratados ou explicitamente aceitos.
- Lacunas e limitações registradas.
- A retirada de rotas, telas e dependências diretas da iniciativa 001 está registrada, com
  preservação explícita dos tipos, serviços de leitura, migrations e dados históricos
  legados.
- Nenhuma alteração de código, dependência, migration ou dado executada como parte da
  auditoria.
- Aprovação registrada por responsável autorizado.

## Efeito

Somente o estado **Aprovado** permite iniciar uma especificação posterior do novo banco.
A aprovação não autoriza refatorações, migrations, criação do projeto Supabase ou
alterações de produção.

## Motivos atuais do bloqueio

- A retirada da superfície ativa foi executada pela iniciativa 001, mas ainda depende de
  revisão humana conjunta com os contratos históricos preservados.
- Permanecem pendentes as decisões sobre compatibilidade, RLS, migração, arquivamento e
  tratamento de dados legados de Campo, Talhão e Hidroponia.
- A validação manual autenticada Android/iOS/web da iniciativa 001 ainda não foi concluída.
- A revisão e aprovação formal deste gate continuam pendentes; portanto, a especificação
  ou criação do novo banco não está autorizada.
