# Validação US3

Data: 2026-11-12.

- Matriz read/write/delete/manageSharing: próprio tenant respeita a permissão; tenant divergente e sessão ausente são rejeitados.
- Sanitização recursiva comprovada na UI, objeto seguro, buffer local e payload preparado para sincronização.
- Campos obrigatórios são rejeitados na fronteira antes da persistência.
- Relações divergentes de tenant geram erro de autorização sem revelar existência.
- Consultas essenciais descartam respostas recebidas após troca de usuário/tenant.
- Escritas encadeadas expõem reconciliação e não apresentam sucesso integral quando uma etapa posterior falha.
- Contratos SQL estáticos confirmam grants, RLS, retenção e rollback de `diagnostic_events`.

Não foram usados Docker, Supabase local ou banco remoto. Regras allow/deny descritas na migration foram verificadas declarativamente.
