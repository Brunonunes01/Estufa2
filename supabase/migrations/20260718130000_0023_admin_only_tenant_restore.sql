revoke execute on function public.restore_tenant_data(uuid, jsonb) from authenticated;
grant execute on function public.restore_tenant_data(uuid, jsonb) to service_role;

comment on function public.restore_tenant_data(uuid, jsonb) is
  'Restores a tenant SQL backup transactionally. Execution is restricted to database administrators and service_role; it is not available to app users.';
