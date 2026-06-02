-- Campo e estufa sao contextos distintos; plantio de campo nao exige estufa.

alter table public.plantios
  alter column estufa_id drop not null;
