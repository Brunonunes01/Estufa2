alter table public.hidro_lotes
  drop constraint if exists hidro_lotes_setor_id_fkey,
  drop constraint if exists hidro_lotes_verdura_id_fkey;

alter table public.hidro_ocupacoes
  drop constraint if exists hidro_ocupacoes_setor_id_fkey,
  drop constraint if exists hidro_ocupacoes_estrutura_id_fkey,
  drop constraint if exists hidro_ocupacoes_verdura_id_fkey;

alter table public.hidro_movimentacoes
  drop constraint if exists hidro_movimentacoes_from_estrutura_id_fkey,
  drop constraint if exists hidro_movimentacoes_to_estrutura_id_fkey,
  drop constraint if exists hidro_movimentacoes_verdura_id_fkey;

alter table public.hidro_leituras
  drop constraint if exists hidro_leituras_motor_id_fkey,
  drop constraint if exists hidro_leituras_reservatorio_id_fkey,
  drop constraint if exists hidro_leituras_estrutura_id_fkey;

alter table public.hidro_lotes
  alter column setor_id type text using setor_id::text,
  alter column verdura_id type text using verdura_id::text;

alter table public.hidro_ocupacoes
  alter column setor_id type text using setor_id::text,
  alter column estrutura_id type text using estrutura_id::text,
  alter column verdura_id type text using verdura_id::text;

alter table public.hidro_movimentacoes
  alter column from_estrutura_id type text using from_estrutura_id::text,
  alter column to_estrutura_id type text using to_estrutura_id::text,
  alter column verdura_id type text using verdura_id::text;

alter table public.hidro_leituras
  alter column motor_id type text using motor_id::text,
  alter column reservatorio_id type text using reservatorio_id::text,
  alter column estrutura_id type text using estrutura_id::text,
  alter column setores_aplicados_ids type text[] using coalesce(setores_aplicados_ids::text[], '{}'::text[]);
