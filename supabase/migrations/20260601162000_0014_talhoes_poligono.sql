-- Suporte a desenho de poligono para medir area do talhao.

alter table public.talhoes
  add column if not exists boundary_points jsonb,
  add column if not exists area_calculada_hectares numeric(12,4);
