# Support Portal (Externo)

Portal de suporte separado do app principal, com autenticacao no Supabase e trilha de auditoria.

## Execucao local

```bash
npm run support:portal
```

Abrir:

`http://localhost:4173`

## Requisitos

1. Usuario autenticado no Supabase.
2. Perfil em `public.profiles` com `is_support_agent = true` (ou `role = 'admin'`).
3. Migration `20260523132000_0005_support_portal.sql` aplicada no banco.

## Seguranca

- Portal separado do app.
- Escrita com justificativa obrigatoria.
- Registro de auditoria em `public.support_audit`.
