import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTenantSqlBackup,
  type TenantDataExport,
} from '../src/services/databaseExportHelpers.ts';

const backup: TenantDataExport = {
  format: 'estufa-pro-data-export',
  format_version: 2,
  exported_at: '2026-07-18T15:00:00.000Z',
  tenant: {
    id: '11111111-1111-4111-8111-111111111111',
    owner_user_id: '22222222-2222-4222-8222-222222222222',
    name: "Estufa d'Água",
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-07-18T15:00:00.000Z',
  },
  tables: {
    clientes: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        observacoes: '$estufa_pro_backup$',
      },
    ],
  },
};

test('backup SQL preserva a conta em um script administrativo', () => {
  const sql = buildTenantSqlBackup(backup);

  assert.match(sql, /ESTUFA PRO - BACKUP COMPLETO DA CONTA/);
  assert.match(sql, /Estufa d''Água/);
  assert.match(sql, /\$estufa_pro_backup_x\$/);
  assert.match(sql, /restore_tenant_data/);
  assert.match(sql, /33333333-3333-4333-8333-333333333333/);
});

test('backup SQL exige o identificador do proprietário', () => {
  const withoutOwner = {
    ...backup,
    tenant: { ...backup.tenant, owner_user_id: undefined },
  };

  assert.throws(() => buildTenantSqlBackup(withoutOwner), /proprietário/);
});
