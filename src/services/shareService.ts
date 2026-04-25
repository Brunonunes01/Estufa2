// src/services/shareService.ts
import { db } from './firebaseConfig';
import { 
    collection, getDocs, doc, setDoc, getDoc, writeBatch, Timestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShareCode, Tenant } from '../types/domain';

const REDEEM_RATE_KEY = 'share_redeem_rate_v1';
const REDEEM_WINDOW_MS = 10 * 60 * 1000;
const REDEEM_MAX_ATTEMPTS = 8;
const REDEEM_COOLDOWN_MS = 15 * 1000;

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

const generateSecureShareCode = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(12); // 96 bits
        crypto.getRandomValues(bytes);
        return Array.from(bytes)
            .map((item) => item.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    return doc(collection(db, 'share_codes'))
        .id
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
};

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

    throw new Error('Não foi possível gerar um código de compartilhamento. Tente novamente.');
};

// Resgata o código (Onde a mágica acontece)
export const redeemShareCode = async (code: string, userId: string): Promise<boolean> => {
    try {
        await enforceRedeemRateLimit();
        const normalizedCode = code.trim().toUpperCase();
        if (!normalizedCode) throw new Error("Código inválido.");

        // Busca o código pelo ID do documento
        const shareRef = doc(db, 'share_codes', normalizedCode);
        const shareSnap = await getDoc(shareRef);
        if (!shareSnap.exists()) throw new Error("Código inválido.");

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
        if (Date.now() > toMillis(shareData.expiresAt)) throw new Error("Código expirado.");
        if (shareData.consumed) throw new Error("Código já utilizado.");
        if (shareData.tenantId === userId) throw new Error("Você já é o dono deste tenant.");

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

        return true;

    } catch (error) {
        await registerRedeemAttempt(false);
        console.error("Erro ao resgatar código:", error);
        throw error;
    }
};

// Busca os tenants compartilhados com o usuário
export const getSharedTenants = async (userId: string): Promise<Tenant[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'users', userId, 'accessible_tenants'));
        return snapshot.docs.map(doc => ({
            uid: doc.data().tenantId,
            name: doc.data().name,
            ownerId: '', // Não crítico para listagem
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
