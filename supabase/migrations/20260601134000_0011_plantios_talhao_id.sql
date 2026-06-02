-- Relaciona plantios com talhoes para operacao de campo.

alter table public.plantios
  add column if not exists talhao_id uuid references public.talhoes(id) on delete set null;

create index if not exists plantios_talhao_idx on public.plantios(tenant_id, talhao_id);
