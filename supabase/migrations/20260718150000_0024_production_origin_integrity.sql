-- Impede que a mesma produção ou venda seja classificada como Campo e Estufa.
-- NOT VALID preserva dados legados; a regra já vale para toda nova gravação.

alter table public.plantios
  drop constraint if exists plantios_single_production_origin;

alter table public.plantios
  add constraint plantios_single_production_origin
  check (not (estufa_id is not null and talhao_id is not null))
  not valid;

alter table public.vendas
  drop constraint if exists vendas_single_production_origin;

alter table public.vendas
  add constraint vendas_single_production_origin
  check (not (estufa_id is not null and talhao_id is not null))
  not valid;

do $$
begin
  if not exists (
    select 1
    from public.plantios
    where estufa_id is not null and talhao_id is not null
  ) then
    alter table public.plantios
      validate constraint plantios_single_production_origin;
  else
    raise warning 'Existem plantios legados com origem mista; novos registros já estão protegidos.';
  end if;

  if not exists (
    select 1
    from public.vendas
    where estufa_id is not null and talhao_id is not null
  ) then
    alter table public.vendas
      validate constraint vendas_single_production_origin;
  else
    raise warning 'Existem vendas legadas com origem mista; novos registros já estão protegidos.';
  end if;
end
$$;

comment on constraint plantios_single_production_origin on public.plantios is
  'Um ciclo pertence ao Campo (talhao_id) ou à Estufa (estufa_id), nunca aos dois.';

comment on constraint vendas_single_production_origin on public.vendas is
  'Uma venda pertence ao Campo (talhao_id) ou à Estufa (estufa_id), nunca aos dois.';

create or replace function public.enforce_colheita_production_origin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_estufa_id uuid;
  linked_talhao_id uuid;
begin
  select p.estufa_id, p.talhao_id
    into linked_estufa_id, linked_talhao_id
  from public.plantios p
  where p.id = new.plantio_id
    and p.tenant_id = new.tenant_id;

  if linked_talhao_id is not null and new.estufa_id is not null then
    raise exception 'Venda/colheita de Campo não pode possuir estufa_id.'
      using errcode = '23514';
  end if;

  if linked_estufa_id is not null and new.estufa_id is distinct from linked_estufa_id then
    raise exception 'A estufa da venda/colheita deve ser a mesma do plantio.'
      using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists colheitas_enforce_production_origin on public.colheitas;
create trigger colheitas_enforce_production_origin
before insert or update of plantio_id, estufa_id
on public.colheitas
for each row
execute function public.enforce_colheita_production_origin();

create or replace function public.enforce_venda_production_origin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_estufa_id uuid;
  linked_talhao_id uuid;
begin
  if new.plantio_id is null then
    return new;
  end if;

  select p.estufa_id, p.talhao_id
    into linked_estufa_id, linked_talhao_id
  from public.plantios p
  where p.id = new.plantio_id
    and p.tenant_id = new.tenant_id;

  if linked_talhao_id is not null then
    if new.estufa_id is not null or new.talhao_id is distinct from linked_talhao_id then
      raise exception 'Venda de Campo deve possuir somente o talhao_id do plantio.'
        using errcode = '23514';
    end if;
  elsif linked_estufa_id is not null then
    if new.talhao_id is not null or new.estufa_id is distinct from linked_estufa_id then
      raise exception 'Venda de Estufa deve possuir somente o estufa_id do plantio.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists vendas_enforce_production_origin on public.vendas;
create trigger vendas_enforce_production_origin
before insert or update of plantio_id, estufa_id, talhao_id
on public.vendas
for each row
execute function public.enforce_venda_production_origin();
