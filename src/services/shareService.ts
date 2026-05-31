// src/services/shareService.ts
import { auth, db } from './removedBackend';
import { 
    collection, getDocs, doc, setDoc, getDoc, writeBatch, Timestamp
} from '../compat/legacyDataApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShareCode, Tenant } from '../types/domain';
import { isSupabaseBackend } from './backendConfig';
import { getSupabaseClient } from './supabaseClient';

const REDEEM_RATE_KEY = 'share_redeem_rate_v1';
const REDEEM_WINDOW_MS = 10 * 60 * 1000;
const REDEEM_MAX_ATTEMPTS = 8;
const REDEEM_COOLDOWN_MS = 15 * 1000;
export const SHARE_CODE_MIN_LENGTH = 20;
export const SHARE_CODE_DEFAULT_LENGTH = 24;

const toMillis = (value: ShareCode['expiresAt']) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return new Date(value).getTime();
    return value?.toMillis ? value.toMillis() : 0;
};

const defaultSharePermissions = {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canManageSharing: false,
};

const generatePseudoRandomString = (length: number) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let output = '';
    for (let i = 0; i < length; i += 1) {
        const idx = Math.floor(Math.random() * alphabet.length);
        output += alphabet[idx];
    }
    return output;
};

const generateSecureShareCode = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(12); // 96 bits => 24 chars em hexadecimal
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

type RedeemRateState = {
    attempts: number;
    windowStartedAt: number;
    blockedUntil: number;
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
        await saveRedeemRateState({
            attempts: 0,
            windowStartedAt: now,
            blockedUntil: 0,
        });
    }
};

const registerRedeemAttempt = async (success: boolean) => {
    const now = Date.now();
    const state = await loadRedeemRateState();
    const withinWindow = now - state.windowStartedAt <= REDEEM_WINDOW_MS;
    const attempts = success ? 0 : (withinWindow ? state.attempts + 1 : 1);
    const blockedUntil = !success && attempts >= REDEEM_MAX_ATTEMPTS ? now + REDEEM_COOLDOWN_MS : 0;

    await saveRedeemRateState({
        attempts,
        windowStartedAt: withinWindow ? state.windowStartedAt : now,
        blockedUntil,
    });
};

// Gera um código de compartilhamento mais forte (sem Cloud Functions)
export const generateShareCode = async (tenantId: string, tenantName: string, ownerName: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || currentUid !== tenantId) {
        if (!isSupabaseBackend()) {
            throw new Error('Somente o dono do tenant pode gerar convite desta conta.');
        }
    }

    if (isSupabaseBackend()) {
        const supabase = getSupabaseClient();
        const supabaseUid = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : null;
        if (!supabaseUid) throw new Error('Usuario nao autenticado.');

        await ensureSupabaseSharePermission(tenantId, supabaseUid);

        const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const code = generateSecureShareCode();
            const { error } = await supabase.from('share_codes').insert({
                tenant_id: tenantId,
                code,
                tenant_name: tenantName || null,
                owner_name: ownerName || null,
                grant_role: 'operator',
                permissions: defaultSharePermissions,
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
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + (24 * 60 * 60 * 1000)); // 24 horas

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateSecureShareCode();
        const shareRef = doc(db, 'share_codes', code);
        const existing = await getDoc(shareRef);
        if (existing.exists()) continue;

        await setDoc(shareRef, {
            code,
            tenantId,
            tenantName,
            ownerName,
            createdBy: tenantId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            grantRole: 'operator',
            permissions: defaultSharePermissions,
            expiresAt,
            consumed: false,
            consumedBy: null,
            consumedAt: null,
        });
        return code;
    }

    throw new Error('Nao foi possivel gerar um codigo de compartilhamento. Tente novamente.');
};

// Resgata o código (Onde a mágica acontece)
export const redeemShareCode = async (code: string, userId: string): Promise<string> => {
    try {
        await enforceRedeemRateLimit();
        const normalizedCode = code.trim().toUpperCase();
        if (!normalizedCode) throw new Error("Codigo invalido.");
        if (normalizedCode.length < SHARE_CODE_MIN_LENGTH) {
            throw new Error(`Codigo invalido. Use o codigo completo (${SHARE_CODE_MIN_LENGTH}+ caracteres).`);
        }

        if (isSupabaseBackend()) {
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
                throw new Error("Codigo invalido.");
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
        }

        // Busca o código pelo ID do documento
        const shareRef = doc(db, 'share_codes', normalizedCode);
        const shareSnap = await getDoc(shareRef);
        if (!shareSnap.exists()) throw new Error("Codigo invalido.");

        const shareData = shareSnap.data() as ShareCode & {
            tenantName?: string;
            ownerName?: string;
            consumed?: boolean;
            consumedBy?: string | null;
            grantRole?: 'guest' | 'operator';
            permissions?: {
                canRead: boolean;
                canWrite: boolean;
                canDelete: boolean;
                canManageSharing: boolean;
            };
        };

        // 2. Verifica validade
        if (Date.now() > toMillis(shareData.expiresAt)) throw new Error("Codigo expirado.");
        if (shareData.consumed) throw new Error("Codigo ja utilizado.");
        if (shareData.tenantId === userId) throw new Error("Voce ja e o dono deste tenant.");

        // 3. Grava vínculo e consome código no mesmo commit
        const now = Timestamp.now();
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', userId, 'accessible_tenants', shareData.tenantId), {
            tenantId: shareData.tenantId,
            name: shareData.tenantName || `Estufa de ${shareData.ownerName || 'Parceiro'}`,
            sharedBy: shareData.ownerName || 'Parceiro',
            sharedAt: now,
            role: shareData.grantRole || 'operator',
            permissions: shareData.permissions || defaultSharePermissions,
            redeemCode: normalizedCode,
        });
        batch.update(shareRef, {
            consumed: true,
            consumedBy: userId,
            consumedAt: now,
            updatedAt: now,
        });
        await batch.commit();
        await registerRedeemAttempt(true);

        return shareData.tenantId;

    } catch (error) {
        await registerRedeemAttempt(false);
        console.error("Erro ao resgatar codigo:", error);
        throw error;
    }
};

// Busca os tenants compartilhados com o usuário
export const getSharedTenants = async (userId: string): Promise<Tenant[]> => {
    try {
        if (isSupabaseBackend()) {
            const supabase = getSupabaseClient();
            const { data: memberships, error } = await supabase
                .from('tenant_memberships')
                .select('tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, created_at, tenants(id, name, owner_user_id)')
                .eq('user_id', userId);
            if (error) {
                console.error(error);
                return [];
            }

            const filtered = (memberships || []).filter((item: any) => item.tenants?.owner_user_id !== userId);
            const ownerIds = Array.from(
                new Set(filtered.map((item: any) => item.tenants?.owner_user_id).filter(Boolean))
            ) as string[];

            const ownerNamesMap = new Map<string, string>();
            if (ownerIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', ownerIds);
                (profiles || []).forEach((profile: any) => {
                    ownerNamesMap.set(profile.id, profile.name || 'Parceiro');
                });
            }

            return filtered.map((item: any) => {
                const ownerId = item.tenants?.owner_user_id;
                return {
                    uid: item.tenant_id,
                    name: item.tenants?.name || 'Estufa Compartilhada',
                    ownerId: ownerId || '',
                    sharedBy: ownerNamesMap.get(ownerId) || 'Parceiro',
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
        }

        const snapshot = await getDocs(collection(db, 'users', userId, 'accessible_tenants'));
        return snapshot.docs.map(doc => ({
            uid: doc.data().tenantId,
            name: doc.data().name,
            ownerId: '', // Nao critico para listagem
            sharedBy: doc.data().sharedBy || 'Desconhecido',
            role: doc.data().role || 'guest',
            permissions: doc.data().permissions || null,
            sharedAt: doc.data().sharedAt || null
        })) as Tenant[];
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const listTenantMembers = async (tenantId: string, currentUserId: string): Promise<TenantMember[]> => {
    if (!tenantId) return [];
    if (!isSupabaseBackend()) return [];

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
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

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

export const removeTenantMember = async (tenantId: string, memberUserId: string, currentUserId: string) => {
    if (!tenantId || !memberUserId) {
        throw new Error('Parametros invalidos para remover parceiro.');
    }
    if (!isSupabaseBackend()) {
        throw new Error('Operacao disponivel apenas no modo Supabase.');
    }
    if (memberUserId === currentUserId) {
        throw new Error('Voce nao pode remover seu proprio acesso por esta tela.');
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
        throw new Error('Nao e permitido remover o proprietario do tenant.');
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
