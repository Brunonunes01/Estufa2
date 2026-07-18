export type TenantDataExport = {
  format: string;
  format_version: number;
  exported_at: string;
  tenant: {
    id: string;
    name: string;
    owner_user_id?: string;
    created_at?: string;
    updated_at?: string;
  };
  tables: Record<string, unknown[]>;
};

export const assertValidTenantBackup = (value: unknown): TenantDataExport => {
  if (!value || typeof value !== 'object') {
    throw new Error('O servidor retornou um arquivo de exportação inválido.');
  }

  const candidate = value as Partial<TenantDataExport>;
  if (
    candidate.format !== 'estufa-pro-data-export' ||
    !candidate.format_version ||
    candidate.format_version > 2 ||
    !candidate.tenant?.id ||
    !candidate.tables ||
    Array.isArray(candidate.tables)
  ) {
    throw new Error('O servidor retornou um arquivo de exportação inválido.');
  }

  return candidate as TenantDataExport;
};

const quoteSqlLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

export const buildTenantSqlBackup = (backup: TenantDataExport) => {
  const ownerUserId = backup.tenant.owner_user_id;
  if (!ownerUserId) {
    throw new Error(
      'O servidor não informou o proprietário necessário para gerar o backup SQL.'
    );
  }

  const json = JSON.stringify(backup, null, 2);
  let dollarTag = 'estufa_pro_backup';
  while (json.includes(`$${dollarTag}$`)) dollarTag += '_x';
  const delimiter = `$${dollarTag}$`;
  const createdAt = backup.tenant.created_at || backup.exported_at;
  const updatedAt = backup.tenant.updated_at || backup.exported_at;

  return `-- ESTUFA PRO - BACKUP COMPLETO DA CONTA
-- Gerado em: ${backup.exported_at}
-- Conta: ${backup.tenant.name}
--
-- Este arquivo contem somente a conta indicada acima.
-- Para restaurar diretamente, execute no Supabase SQL Editor do projeto
-- depois que as migrations do Estufa Pro estiverem instaladas.
-- O usuario proprietário precisa existir em auth.users com o UUID original.

begin;

insert into public.tenants (id, owner_user_id, name, created_at, updated_at)
values (
  ${quoteSqlLiteral(backup.tenant.id)}::uuid,
  ${quoteSqlLiteral(ownerUserId)}::uuid,
  ${quoteSqlLiteral(backup.tenant.name)},
  ${quoteSqlLiteral(createdAt)}::timestamptz,
  ${quoteSqlLiteral(updatedAt)}::timestamptz
)
on conflict (id) do update
set name = excluded.name,
    updated_at = excluded.updated_at
where public.tenants.owner_user_id = excluded.owner_user_id;

select set_config('request.jwt.claim.sub', ${quoteSqlLiteral(ownerUserId)}, true);

/* ESTUFA_PRO_BACKUP_JSON_BEGIN */
select public.restore_tenant_data(
  ${quoteSqlLiteral(backup.tenant.id)}::uuid,
  ${delimiter}
${json}
${delimiter}::jsonb
);
/* ESTUFA_PRO_BACKUP_JSON_END */

commit;
`;
};
