import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getSupabaseClient } from './supabaseClient';
import {
  assertValidTenantBackup,
  buildTenantSqlBackup,
} from './databaseExportHelpers';

export type { TenantDataExport } from './databaseExportHelpers';

const sanitizeFileName = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'conta';
};

const buildFileName = (tenantName: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `backup-estufa-${sanitizeFileName(tenantName)}-${timestamp}.sql`;
};

const downloadOnWeb = (contents: string, fileName: string) => {
  if (typeof document === 'undefined') return false;

  const blob = new Blob([contents], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
};

export const exportTenantDatabase = async (
  tenantId: string,
  tenantName: string
) => {
  if (!tenantId) throw new Error('Nenhuma conta ativa foi selecionada.');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('export_tenant_data', {
    p_tenant_id: tenantId,
  });

  if (error) {
    if (
      error.code === '42501' ||
      error.message.toLowerCase().includes('proprietario')
    ) {
      throw new Error(
        'Somente o proprietario pode exportar os dados desta conta.'
      );
    }
    throw new Error(`Nao foi possivel preparar a exportacao. ${error.message}`);
  }

  const exportData = assertValidTenantBackup(data);
  const contents = buildTenantSqlBackup(exportData);
  const fileName = buildFileName(tenantName || exportData.tenant.name);

  if (downloadOnWeb(contents, fileName)) {
    return { fileName, delivery: 'download' as const };
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error(
      'O armazenamento temporario nao esta disponivel neste dispositivo.'
    );
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      'O compartilhamento de arquivos nao esta disponivel neste dispositivo.'
    );
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/sql',
    dialogTitle: 'Enviar backup pelo WhatsApp',
    UTI: 'public.plain-text',
  });

  return { fileName, delivery: 'share' as const };
};
