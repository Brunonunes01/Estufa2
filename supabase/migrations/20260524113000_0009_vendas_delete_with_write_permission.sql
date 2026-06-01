-- Permite exclusão operacional de vendas/colheitas para membros com permissão de escrita.
-- Antes, o delete exigia can_delete=true e bloqueava o fluxo para operadores.

drop policy if exists colheitas_delete on public.colheitas;
create policy colheitas_delete
  on public.colheitas
  for delete
  using (public.can_write_tenant(tenant_id));

drop policy if exists vendas_delete on public.vendas;
create policy vendas_delete
  on public.vendas
  for delete
  using (public.can_write_tenant(tenant_id));

drop policy if exists venda_itens_delete on public.venda_itens;
create policy venda_itens_delete
  on public.venda_itens
  for delete
  using (public.can_write_tenant(tenant_id));

