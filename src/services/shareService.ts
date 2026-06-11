import AsyncStorage from '@react-native-async-storage/async-storage';

import { Tenant } from '../types/domain';
import { getSupabaseClient } from './supabaseClient';

const REDEEM_RATE_KEY = 'share_redeem_rate_v1';
const REDEEM_WINDOW_MS = 10 * 60 * 1000;
const REDEEM_MAX_ATTEMPTS = 8;
const REDEEM_COOLDOWN_MS = 15 * 1000;

export const SHARE_CODE_MIN_LENGTH = 20;
export const SHARE_CODE_DEFAULT_LENGTH = 24;

export type ShareAccessProfile = 'manager' | 'operator' | 'viewer';

export interface TenantMember {
  userId: string;
  name: string;
  email?: string | null;
  role: 'guest' | 'operator' | 'admin';
  sharedAt?: string | null;
  lastAccessAt?: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageSharing: boolean;
}

type TenantMemberRole = TenantMember['role'];

type RedeemRateState = {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const shareProfileConfig: Record<
  ShareAccessProfile,
  {
    grantRole: 'guest' | 'operator' | 'admin';
    permissions: {
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      canManageSharing: boolean;
    };
  }
> = {
  manager: {
    grantRole: 'admin',
    permissions: { canRead: true, canWrite: true, canDelete: true, canManageSharing: true },
  },
  operator: {
    grantRole: 'operator',
    permissions: { canRead: true, canWrite: true, canDelete: false, canManageSharing: false },
  },
  viewer: {
    grantRole: 'guest',
    permissions: { canRead: true, canWrite: false, canDelete: false, canManageSharing: false },
  },
};

const resolveShareProfile = (profile: ShareAccessProfile = 'operator') =>
  shareProfileConfig[profile] || shareProfileConfig.operator;

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

const loadRedeemRateState = async (): Promise<RedeemRateState> => {
  try {
    const raw = await AsyncStorage.getItem(REDEEM_RATE_KEY);
    if (!raw) {
      return { attempts: 0, windowStartedAt: Date.now(), blockedUntil: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<RedeemRateState>;
    return {
      attempts: Number(parsed.attempts || 0),
      windowStartedAt: Number(parsed.windowStartedAt || Date.now()),
      blockedUntil: Number(parsed.blockedUntil || 0),
    };
  } catch {
    return { attempts: 0, windowStartedAt: Date.now(), blockedUntil: 0 };
  }
};

const saveRedeemRateState = async (state: RedeemRateState) => {
  await AsyncStorage.setItem(REDEEM_RATE_KEY, JSON.stringify(state));
};

const enforceRedeemRateLimit = async () => {
  const now = Date.now();
  const state = await loadRedeemRateState();
  if (state.blockedUntil > now) {
    const waitSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    throw new Error(`Muitas tentativas. Aguarde ${waitSeconds}s para tentar novamente.`);
  }

  if (now - state.windowStartedAt > REDEEM_WINDOW_MS) {
    await saveRedeemRateState({ attempts: 0, windowStartedAt: now, blockedUntil: 0 });
  }
};

const registerRedeemAttempt = async (success: boolean) => {
  const now = Date.now();
  const state = await loadRedeemRateState();
  const withinWindow = now - state.windowStartedAt <= REDEEM_WINDOW_MS;
  const attempts = success ? 0 : withinWindow ? state.attempts + 1 : 1;
  const blockedUntil = !success && attempts >= REDEEM_MAX_ATTEMPTS ? now + REDEEM_COOLDOWN_MS : 0;

  await saveRedeemRateState({
    attempts,
    windowStartedAt: withinWindow ? state.windowStartedAt : now,
    blockedUntil,
  });
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

export const generateShareCode = async (
  tenantId: string,
  tenantName: string,
  ownerName: string,
  profile: ShareAccessProfile = 'operator'
) => {
  const supabase = getSupabaseClient();
  const supabaseUid = (await supabase.auth.getUser()).data.user?.id;
  if (!supabaseUid) throw new Error('Usuario nao autenticado.');

  await ensureSupabaseSharePermission(tenantId, supabaseUid);

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('owner_user_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError) {
    throw new Error(`Nao foi possivel validar o proprietario. ${tenantError.message}`);
  }
  if (profile === 'manager' && tenantRow?.owner_user_id !== supabaseUid) {
    throw new Error('Somente o proprietario pode convidar um gerente.');
  }

  const resolvedProfile = resolveShareProfile(profile);
  const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSecureShareCode();
    const { error } = await supabase.from('share_codes').insert({
      tenant_id: tenantId,
      code,
      tenant_name: tenantName || null,
      owner_name: ownerName || null,
      grant_role: resolvedProfile.grantRole,
      permissions: resolvedProfile.permissions,
      created_by: supabaseUid,
      expires_at: expiresAtIso,
      used_by: [],
    });

    if (!error) return code;
    if (!String(error.message || '').toLowerCase().includes('duplicate')) {
      throw new Error(`Nao foi possivel gerar convite. ${error.message}`);
    }
  }

  throw new Error('Nao foi possivel gerar um codigo de compartilhamento. Tente novamente.');
};

export const redeemShareCode = async (code: string, userId: string): Promise<string> => {
  try {
    await enforceRedeemRateLimit();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('Codigo invalido.');
    if (normalizedCode.length < SHARE_CODE_MIN_LENGTH) {
      throw new Error(`Codigo invalido. Use o codigo completo (${SHARE_CODE_MIN_LENGTH}+ caracteres).`);
    }

    const supabase = getSupabaseClient();
    const authUser = (await supabase.auth.getUser()).data.user;
    if (!authUser?.id || authUser.id !== userId) {
      throw new Error('Sessao invalida para resgatar convite.');
    }

    const { data: shareCodeData, error: shareCodeError } = await supabase
      .from('share_codes')
      .select('tenant_id')
      .eq('code', normalizedCode)
      .maybeSingle();
    if (shareCodeError) {
      throw new Error(shareCodeError.message || 'Falha ao validar convite.');
    }
    if (!shareCodeData?.tenant_id) {
      throw new Error('Codigo invalido.');
    }

    const { data, error } = await supabase.rpc('redeem_share_code', {
      p_code: normalizedCode,
    });
    if (error) {
      throw new Error(error.message || 'Falha ao resgatar convite.');
    }
    if (!data) {
      throw new Error('Falha ao resgatar convite.');
    }

    await registerRedeemAttempt(true);
    return shareCodeData.tenant_id as string;
  } catch (error) {
    await registerRedeemAttempt(false);
    console.error('Erro ao resgatar codigo:', error);
    throw error;
  }
};

export const getSharedTenants = async (userId: string): Promise<Tenant[]> => {
  try {
    const supabase = getSupabaseClient();
    const { data: memberships, error } = await supabase
      .from('tenant_memberships')
      .select(
        'tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, created_at, tenants(id, name, owner_user_id)'
      )
      .eq('user_id', userId);

    if (error) {
      console.error(error);
      return [];
    }

    const filtered = (memberships || []).filter((item: any) => item.tenants?.owner_user_id !== userId);
    const ownerIds = Array.from(new Set(filtered.map((item: any) => item.tenants?.owner_user_id).filter(Boolean))) as string[];

    const ownerNamesMap = new Map<string, string>();
    const ownerEmailsMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', ownerIds);
      (profiles || []).forEach((profile: any) => {
        ownerNamesMap.set(profile.id, profile.name || 'Parceiro');
        if (profile?.email) ownerEmailsMap.set(profile.id, profile.email);
      });
    }

    return filtered.map((item: any) => {
      const ownerId = item.tenants?.owner_user_id;
      return {
        uid: item.tenant_id,
        name: item.tenants?.name || 'Estufa Compartilhada',
        ownerId: ownerId || '',
        sharedBy: ownerNamesMap.get(ownerId) || 'Parceiro',
        sharedByEmail: ownerEmailsMap.get(ownerId) || null,
        ownerEmail: ownerEmailsMap.get(ownerId) || null,
        role: item.role || 'guest',
        permissions: {
          canRead: !!item.can_read,
          canWrite: !!item.can_write,
          canDelete: !!item.can_delete,
          canManageSharing: !!item.can_manage_sharing,
        },
        sharedAt: item.created_at || null,
      } as Tenant;
    });
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const listTenantMembers = async (tenantId: string, currentUserId: string): Promise<TenantMember[]> => {
  if (!tenantId) return [];

  const supabase = getSupabaseClient();
  await ensureSupabaseSharePermission(tenantId, currentUserId);

  const { data: memberships, error } = await supabase
    .from('tenant_memberships')
    .select('user_id, role, can_read, can_write, can_delete, can_manage_sharing, created_at, updated_at')
    .eq('tenant_id', tenantId);
  if (error) {
    throw new Error(`Falha ao listar membros do tenant. ${error.message}`);
  }

  const rows = (memberships || []) as any[];
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((item) => item.user_id).filter(Boolean))) as string[];
  const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
  const profilesMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return rows.map((item) => {
    const profile = profilesMap.get(item.user_id);
    return {
      userId: item.user_id,
      name: profile?.name || 'Usuario',
      email: profile?.email || null,
      role: (item.role || 'guest') as TenantMember['role'],
      sharedAt: item.created_at || null,
      lastAccessAt: item.updated_at || item.created_at || null,
      canRead: !!item.can_read,
      canWrite: !!item.can_write,
      canDelete: !!item.can_delete,
      canManageSharing: !!item.can_manage_sharing,
    };
  });
};

export const updateTenantMemberProfile = async (
  tenantId: string,
  memberUserId: string,
  currentUserId: string,
  profile: ShareAccessProfile
) => {
  if (!tenantId || !memberUserId || !currentUserId) {
    throw new Error('Parametros invalidos para atualizar parceiro.');
  }
  if (memberUserId === currentUserId) {
    throw new Error('Voce nao pode alterar seu proprio perfil por esta tela.');
  }

  const supabase = getSupabaseClient();
  await ensureSupabaseSharePermission(tenantId, currentUserId);

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('owner_user_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError) {
    throw new Error(`Falha ao validar proprietario do tenant. ${tenantError.message}`);
  }
  if (tenantRow?.owner_user_id === memberUserId) {
    throw new Error('Nao e permitido alterar o perfil do proprietario do tenant.');
  }

  const currentIsOwner = tenantRow?.owner_user_id === currentUserId;
  if (profile === 'manager' && !currentIsOwner) {
    throw new Error('Somente o proprietario pode promover um parceiro para gerente.');
  }

  const { data: targetMembership, error: targetMembershipError } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId)
    .maybeSingle();
  if (targetMembershipError) {
    throw new Error(`Falha ao validar o perfil do parceiro. ${targetMembershipError.message}`);
  }
  if (!targetMembership) {
    throw new Error('Parceiro nao encontrado neste tenant.');
  }
  if ((targetMembership.role as TenantMemberRole) === 'admin' && !currentIsOwner) {
    throw new Error('Somente o proprietario pode alterar o perfil de um gerente.');
  }

  const resolvedProfile = resolveShareProfile(profile);
  const { error } = await supabase
    .from('tenant_memberships')
    .update({
      role: resolvedProfile.grantRole,
      can_read: resolvedProfile.permissions.canRead,
      can_write: resolvedProfile.permissions.canWrite,
      can_delete: resolvedProfile.permissions.canDelete,
      can_manage_sharing: resolvedProfile.permissions.canManageSharing,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId);
  if (error) {
    throw new Error(`Falha ao atualizar perfil do parceiro. ${error.message}`);
  }
};

export const removeTenantMember = async (tenantId: string, memberUserId: string, currentUserId: string) => {
  if (!tenantId || !memberUserId) {
    throw new Error('Parametros invalidos para remover parceiro.');
  }
  if (memberUserId === currentUserId) {
    throw new Error('Voce nao pode remover seu proprio acesso por esta tela.');
  }

  const supabase = getSupabaseClient();
  await ensureSupabaseSharePermission(tenantId, currentUserId);

  const { data: currentMembership, error: currentMembershipError } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (currentMembershipError) {
    throw new Error(`Falha ao validar seu acesso no tenant. ${currentMembershipError.message}`);
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('owner_user_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError) {
    throw new Error(`Falha ao validar proprietario do tenant. ${tenantError.message}`);
  }
  if (tenantRow?.owner_user_id === memberUserId) {
    throw new Error('Nao e permitido remover o proprietario do tenant.');
  }

  const { data: targetMembership, error: targetMembershipError } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId)
    .maybeSingle();
  if (targetMembershipError) {
    throw new Error(`Falha ao validar o perfil do parceiro. ${targetMembershipError.message}`);
  }

  const currentIsOwner = tenantRow?.owner_user_id === currentUserId;
  const currentRole = currentIsOwner ? 'owner' : currentMembership?.role || 'guest';
  const targetRole = targetMembership?.role || 'guest';
  if (!currentIsOwner && currentRole === 'admin' && targetRole === 'admin') {
    throw new Error('Somente o proprietario pode remover um gerente.');
  }

  const { error } = await supabase
    .from('tenant_memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId);
  if (error) {
    throw new Error(`Falha ao remover parceiro. ${error.message}`);
  }
};
