-- Vincula despesa a pessoa responsavel pela saida de caixa.

alter table public.despesas
  add column if not exists pagamento_para uuid references public.caixa_pessoas(id) on delete set null;

create index if not exists idx_despesas_pagamento_para
on public.despesas (pagamento_para);
