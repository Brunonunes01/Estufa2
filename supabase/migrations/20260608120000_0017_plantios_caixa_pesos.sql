alter table public.plantios
  add column if not exists caixa_pesos jsonb not null default '[]'::jsonb;
