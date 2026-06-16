import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseClient } from './supabaseClient.ts';
import { createShareService, SHARE_CODE_DEFAULT_LENGTH } from './shareServiceCore.ts';

export {
  createShareService,
  SHARE_CODE_DEFAULT_LENGTH,
  type ShareAccessProfile,
  type TenantMember,
} from './shareServiceCore.ts';

const generatePseudoRandomString = (length: number) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
};

const generateSecureShareCode = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((item) => item.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  const timePart = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const randomPart = generatePseudoRandomString(32);
  return `${timePart}${randomPart}`.slice(0, SHARE_CODE_DEFAULT_LENGTH);
};

const ensureSupabaseSharePermission = async (tenantId: string, currentUid: string) => {
  const supabase = getSupabaseClient();
  const { data: membership, error } = await supabase
    .from('tenant_memberships')
    .select('can_manage_sharing')
    .eq('tenant_id', tenantId)
    .eq('user_id', currentUid)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar permissao de compartilhamento. ${error.message}`);
  }
  if (!membership?.can_manage_sharing) {
    throw new Error('Somente administradores do tenant podem gerar convite.');
  }
};

const ensureSupabaseTenantReadPermission = async (tenantId: string, currentUid: string) => {
  const supabase = getSupabaseClient();
  const { data: membership, error } = await supabase
    .from('tenant_memberships')
    .select('can_read')
    .eq('tenant_id', tenantId)
    .eq('user_id', currentUid)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar permissao de leitura do tenant. ${error.message}`);
  }
  if (!membership?.can_read) {
    throw new Error('Voce nao tem permissao para visualizar os parceiros deste tenant.');
  }
};

const defaultShareService = createShareService({
  storage: AsyncStorage,
  now: () => Date.now(),
  generateShareCodeValue: () => generateSecureShareCode(),
  getAuthenticatedUserId: async () => (await getSupabaseClient().auth.getUser()).data.user?.id || null,
  ensureSharePermission: ensureSupabaseSharePermission,
  ensureTenantReadPermission: ensureSupabaseTenantReadPermission,
  getTenantOwnerId: async (tenantId) => {
    const supabase = getSupabaseClient();
    const { data: tenantRow, error } = await supabase.from('tenants').select('owner_user_id').eq('id', tenantId).maybeSingle();
    if (error) {
      throw new Error(`Nao foi possivel validar o proprietario. ${error.message}`);
    }
    return tenantRow?.owner_user_id || null;
  },
  insertShareCodeRecord: async (record) => {
    const { error } = await getSupabaseClient().from('share_codes').insert(record);
    if (!error) return { duplicate: false };
    if (String(error.message || '').toLowerCase().includes('duplicate')) {
      return { duplicate: true };
    }
    return { duplicate: true, message: error.message };
  },
  getShareCodeTenantId: async (code) => {
    const { data, error } = await getSupabaseClient().from('share_codes').select('tenant_id').eq('code', code).maybeSingle();
    if (error) {
      const message = String(error.message || '').toLowerCase();
      if (message.includes('row-level security') || message.includes('permission denied')) {
        return null;
      }
      throw new Error(error.message || 'Falha ao validar convite.');
    }
    return data?.tenant_id || null;
  },
  redeemShareCodeRpc: async (code) => {
    const { data, error } = await getSupabaseClient().rpc('redeem_share_code', {
      p_code: code,
    });
    if (error) {
      throw new Error(error.message || 'Falha ao resgatar convite.');
    }
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    return Boolean(data);
  },
  listSharedMemberships: async (userId) => {
    const { data, error } = await getSupabaseClient()
      .from('tenant_memberships')
      .select(
        'tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, created_at, tenants(id, name, owner_user_id)'
      )
      .eq('user_id', userId);
    if (error) {
      throw new Error(`Falha ao listar tenants compartilhados. ${error.message}`);
    }
    return data || [];
  },
  loadProfilesByIds: async (userIds) => {
    const { data, error } = await getSupabaseClient().from('profiles').select('id, name, email').in('id', userIds);
    if (error) {
      throw error;
    }
    return data || [];
  },
  listTenantMemberships: async (tenantId) => {
    const { data, error } = await getSupabaseClient()
      .from('tenant_memberships')
      .select('user_id, role, can_read, can_write, can_delete, can_manage_sharing, created_at, updated_at')
      .eq('tenant_id', tenantId);
    if (error) {
      throw new Error(`Falha ao listar membros do tenant. ${error.message}`);
    }
    return data || [];
  },
  getMembershipRole: async (tenantId, userId) => {
    const { data, error } = await getSupabaseClient()
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Falha ao validar o perfil do parceiro. ${error.message}`);
    }
    return data?.role || null;
  },
  updateMembership: async (tenantId, userId, payload) => {
    const { error } = await getSupabaseClient().from('tenant_memberships').update(payload).eq('tenant_id', tenantId).eq('user_id', userId);
    if (error) {
      throw new Error(`Falha ao atualizar perfil do parceiro. ${error.message}`);
    }
  },
  deleteMembership: async (tenantId, userId) => {
    const { error } = await getSupabaseClient().from('tenant_memberships').delete().eq('tenant_id', tenantId).eq('user_id', userId);
    if (error) {
      throw new Error(`Falha ao remover parceiro. ${error.message}`);
    }
  },
});

export const generateShareCode = defaultShareService.generateShareCode;
export const redeemShareCode = defaultShareService.redeemShareCode;
export const getSharedTenants = defaultShareService.getSharedTenants;
export const listTenantMembers = defaultShareService.listTenantMembers;
export const updateTenantMemberProfile = defaultShareService.updateTenantMemberProfile;
export const removeTenantMember = defaultShareService.removeTenantMember;
