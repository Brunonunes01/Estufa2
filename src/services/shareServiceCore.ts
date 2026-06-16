import type { Tenant } from '../types/domain.ts';
import {
  listSharedTenantOwnerIds,
  mapSharedTenantRows,
  mapTenantMembers,
} from './shareServiceHelpers.ts';
import type { ProfileLookupRow, SharedTenantMembershipRow, TenantMembershipRow } from './shareServiceHelpers.ts';
import {
  applyRedeemAttempt,
  getRedeemCooldownSeconds,
  normalizeShareCode,
  SHARE_CODE_MIN_LENGTH,
  shouldResetRedeemWindow,
  validateNormalizedShareCode,
} from './shareRedeemHelpers.ts';
import type { RedeemRateState } from './shareRedeemHelpers.ts';

const REDEEM_RATE_KEY = 'share_redeem_rate_v1';
const REDEEM_WINDOW_MS = 10 * 60 * 1000;
const REDEEM_MAX_ATTEMPTS = 8;
const REDEEM_COOLDOWN_MS = 15 * 1000;
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

type SharePermissionRecord = {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageSharing: boolean;
};

export type ShareServiceDeps = {
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };
  now(): number;
  generateShareCodeValue(length: number): string;
  getAuthenticatedUserId(): Promise<string | null>;
  ensureSharePermission(tenantId: string, currentUid: string): Promise<void>;
  ensureTenantReadPermission(tenantId: string, currentUid: string): Promise<void>;
  getTenantOwnerId(tenantId: string): Promise<string | null>;
  insertShareCodeRecord(record: {
    tenant_id: string;
    code: string;
    tenant_name: string | null;
    owner_name: string | null;
    grant_role: TenantMemberRole;
    permissions: SharePermissionRecord;
    created_by: string;
    expires_at: string;
    used_by: string[];
  }): Promise<{ duplicate: boolean; message?: string }>;
  getShareCodeTenantId(code: string): Promise<string | null>;
  redeemShareCodeRpc(code: string): Promise<string | boolean | null>;
  listSharedMemberships(userId: string): Promise<SharedTenantMembershipRow[]>;
  loadProfilesByIds(userIds: string[]): Promise<ProfileLookupRow[]>;
  listTenantMemberships(tenantId: string): Promise<TenantMembershipRow[]>;
  getMembershipRole(tenantId: string, userId: string): Promise<TenantMemberRole | null>;
  updateMembership(
    tenantId: string,
    userId: string,
    payload: {
      role: TenantMemberRole;
      can_read: boolean;
      can_write: boolean;
      can_delete: boolean;
      can_manage_sharing: boolean;
      updated_at: string;
    }
  ): Promise<void>;
  deleteMembership(tenantId: string, userId: string): Promise<void>;
};

const shareProfileConfig: Record<
  ShareAccessProfile,
  {
    grantRole: TenantMemberRole;
    permissions: SharePermissionRecord;
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

export const createShareService = (deps: ShareServiceDeps) => {
  const loadRedeemRateState = async (): Promise<RedeemRateState> => {
    try {
      const raw = await deps.storage.getItem(REDEEM_RATE_KEY);
      if (!raw) {
        return { attempts: 0, windowStartedAt: deps.now(), blockedUntil: 0 };
      }
      const parsed = JSON.parse(raw) as Partial<RedeemRateState>;
      return {
        attempts: Number(parsed.attempts || 0),
        windowStartedAt: Number(parsed.windowStartedAt || deps.now()),
        blockedUntil: Number(parsed.blockedUntil || 0),
      };
    } catch {
      return { attempts: 0, windowStartedAt: deps.now(), blockedUntil: 0 };
    }
  };

  const saveRedeemRateState = async (state: RedeemRateState) => {
    await deps.storage.setItem(REDEEM_RATE_KEY, JSON.stringify(state));
  };

  const enforceRedeemRateLimit = async () => {
    const now = deps.now();
    const state = await loadRedeemRateState();
    if (state.blockedUntil > now) {
      const waitSeconds = getRedeemCooldownSeconds(state.blockedUntil, now);
      throw new Error(`Muitas tentativas. Aguarde ${waitSeconds}s para tentar novamente.`);
    }

    if (shouldResetRedeemWindow(state, now, REDEEM_WINDOW_MS)) {
      await saveRedeemRateState({ attempts: 0, windowStartedAt: now, blockedUntil: 0 });
    }
  };

  const registerRedeemAttempt = async (success: boolean) => {
    const now = deps.now();
    const state = await loadRedeemRateState();
    await saveRedeemRateState(
      applyRedeemAttempt(state, success, now, REDEEM_WINDOW_MS, REDEEM_MAX_ATTEMPTS, REDEEM_COOLDOWN_MS)
    );
  };

  const generateShareCode = async (
    tenantId: string,
    tenantName: string,
    ownerName: string,
    profile: ShareAccessProfile = 'operator'
  ) => {
    const currentUid = await deps.getAuthenticatedUserId();
    if (!currentUid) throw new Error('Usuario nao autenticado.');

    await deps.ensureSharePermission(tenantId, currentUid);

    const ownerUserId = await deps.getTenantOwnerId(tenantId);
    if (profile === 'manager' && ownerUserId !== currentUid) {
      throw new Error('Somente o proprietario pode convidar um gerente.');
    }

    const resolvedProfile = resolveShareProfile(profile);
    const expiresAtIso = new Date(deps.now() + 24 * 60 * 60 * 1000).toISOString();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = deps.generateShareCodeValue(SHARE_CODE_DEFAULT_LENGTH);
      const insertResult = await deps.insertShareCodeRecord({
        tenant_id: tenantId,
        code,
        tenant_name: tenantName || null,
        owner_name: ownerName || null,
        grant_role: resolvedProfile.grantRole,
        permissions: resolvedProfile.permissions,
        created_by: currentUid,
        expires_at: expiresAtIso,
        used_by: [],
      });

      if (!insertResult.duplicate) return code;
      if (insertResult.message) {
        throw new Error(`Nao foi possivel gerar convite. ${insertResult.message}`);
      }
    }

    throw new Error('Nao foi possivel gerar um codigo de compartilhamento. Tente novamente.');
  };

  const redeemShareCode = async (code: string, userId: string): Promise<string> => {
    try {
      await enforceRedeemRateLimit();
      const normalizedCode = normalizeShareCode(code);
      validateNormalizedShareCode(normalizedCode, SHARE_CODE_MIN_LENGTH);

      const authUserId = await deps.getAuthenticatedUserId();
      if (!authUserId || authUserId !== userId) {
        throw new Error('Sessao invalida para resgatar convite.');
      }

      const redeemResult = await deps.redeemShareCodeRpc(normalizedCode);
      const tenantId =
        typeof redeemResult === 'string' && redeemResult.trim()
          ? redeemResult.trim()
          : await deps.getShareCodeTenantId(normalizedCode);

      if (!tenantId) {
        throw new Error('Codigo invalido.');
      }

      if (!redeemResult) {
        throw new Error('Falha ao resgatar convite.');
      }

      await registerRedeemAttempt(true);
      return tenantId;
    } catch (error) {
      await registerRedeemAttempt(false);
      console.error('Erro ao resgatar codigo:', error);
      throw error;
    }
  };

  const getSharedTenants = async (userId: string): Promise<Tenant[]> => {
    const rows = await deps.listSharedMemberships(userId);
    const ownerIds = listSharedTenantOwnerIds(rows, userId);

    const ownerNamesMap = new Map<string, string>();
    const ownerEmailsMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const profiles = await deps.loadProfilesByIds(ownerIds);
      profiles.forEach((row) => {
        ownerNamesMap.set(row.id, row.name || 'Parceiro');
        if (row.email) ownerEmailsMap.set(row.id, row.email);
      });
    }

    return mapSharedTenantRows(rows, userId, ownerNamesMap, ownerEmailsMap) as Tenant[];
  };

  const listTenantMembers = async (tenantId: string, currentUserId: string): Promise<TenantMember[]> => {
    if (!tenantId) return [];

    await deps.ensureTenantReadPermission(tenantId, currentUserId);

    const rows = await deps.listTenantMemberships(tenantId);
    if (rows.length === 0) return [];

    const userIds = Array.from(new Set(rows.map((item) => item.user_id).filter(Boolean))) as string[];
    const profiles = await deps.loadProfilesByIds(userIds);
    const profilesMap = new Map(profiles.map((profile) => [profile.id, profile] as const));

    return mapTenantMembers(rows, profilesMap) as TenantMember[];
  };

  const updateTenantMemberProfile = async (
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

    await deps.ensureSharePermission(tenantId, currentUserId);

    const ownerUserId = await deps.getTenantOwnerId(tenantId);
    if (ownerUserId === memberUserId) {
      throw new Error('Nao e permitido alterar o perfil do proprietario do tenant.');
    }

    const currentIsOwner = ownerUserId === currentUserId;
    if (profile === 'manager' && !currentIsOwner) {
      throw new Error('Somente o proprietario pode promover um parceiro para gerente.');
    }

    const targetRole = await deps.getMembershipRole(tenantId, memberUserId);
    if (!targetRole) {
      throw new Error('Parceiro nao encontrado neste tenant.');
    }
    if (targetRole === 'admin' && !currentIsOwner) {
      throw new Error('Somente o proprietario pode alterar o perfil de um gerente.');
    }

    const resolvedProfile = resolveShareProfile(profile);
    await deps.updateMembership(tenantId, memberUserId, {
      role: resolvedProfile.grantRole,
      can_read: resolvedProfile.permissions.canRead,
      can_write: resolvedProfile.permissions.canWrite,
      can_delete: resolvedProfile.permissions.canDelete,
      can_manage_sharing: resolvedProfile.permissions.canManageSharing,
      updated_at: new Date(deps.now()).toISOString(),
    });
  };

  const removeTenantMember = async (tenantId: string, memberUserId: string, currentUserId: string) => {
    if (!tenantId || !memberUserId) {
      throw new Error('Parametros invalidos para remover parceiro.');
    }
    if (memberUserId === currentUserId) {
      throw new Error('Voce nao pode remover seu proprio acesso por esta tela.');
    }

    await deps.ensureSharePermission(tenantId, currentUserId);

    const currentRole = await deps.getMembershipRole(tenantId, currentUserId);
    const ownerUserId = await deps.getTenantOwnerId(tenantId);
    if (ownerUserId === memberUserId) {
      throw new Error('Nao e permitido remover o proprietario do tenant.');
    }

    const targetRole = await deps.getMembershipRole(tenantId, memberUserId);
    const currentIsOwner = ownerUserId === currentUserId;
    const resolvedCurrentRole = currentIsOwner ? 'owner' : currentRole || 'guest';
    const resolvedTargetRole = targetRole || 'guest';

    if (!currentIsOwner && resolvedCurrentRole === 'admin' && resolvedTargetRole === 'admin') {
      throw new Error('Somente o proprietario pode remover um gerente.');
    }

    await deps.deleteMembership(tenantId, memberUserId);
  };

  return {
    generateShareCode,
    redeemShareCode,
    getSharedTenants,
    listTenantMembers,
    updateTenantMemberProfile,
    removeTenantMember,
  };
};
