# Registro da implementação abortada do banco novo

Em 2026-11-12 foi cancelada a reconstrução do banco descrita na [spec 005](../../005-reconstrucao-controlada-persistencia/spec.md).

O app voltou a apontar para o projeto legado `fdbzhrpnyrqinmxowgzf`; o projeto novo
`okzvcnslwttslkngvexr` não é mais alvo operacional.

As migrations locais do novo projeto foram removidas. As migrations do legado permanecem
em `supabase/migrations/`. Nenhuma alteração remota foi executada durante a remoção local.

Os testes TypeScript exclusivos da baseline nova também foram removidos, incluindo os
testes de `tests/persistence`, contratos da baseline e integrações de cutover. Testes
transversais da auditoria que não dependem do banco novo foram preservados.

Esta evidência impede que a implementação abortada seja confundida com uma baseline ativa
ou com um cutover concluído.
