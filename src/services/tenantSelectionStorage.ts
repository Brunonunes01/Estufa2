import AsyncStorage from '@react-native-async-storage/async-storage';

const tenantSelectionKey = (userId: string) => `tenant_selection_v1:${userId}`;
const tenantAuthorizationKey = (userId: string) => `tenant_authorization_v1:${userId}`;

export type PersistedTenantAuthorization = {
  tenantId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageSharing: boolean;
};

type TenantSelectionStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export const createTenantSelectionStorage = (storage: TenantSelectionStorageLike) => {
  const loadPersistedTenantSelection = async (userId: string): Promise<string> => {
    if (!userId.trim()) return '';

    try {
      return (await storage.getItem(tenantSelectionKey(userId))) || '';
    } catch {
      return '';
    }
  };

  const persistTenantSelection = async (userId: string, tenantId: string) => {
    if (!userId.trim() || !tenantId.trim()) return;

    try {
      await storage.setItem(tenantSelectionKey(userId), tenantId);
    } catch {
      // Best effort only. Selection still works in-memory if storage fails.
    }
  };

  const loadPersistedTenantAuthorization = async (
    userId: string
  ): Promise<PersistedTenantAuthorization | null> => {
    if (!userId.trim()) return null;
    try {
      const raw = await storage.getItem(tenantAuthorizationKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedTenantAuthorization>;
      if (typeof parsed.tenantId !== 'string' || !parsed.tenantId.trim()) return null;
      return {
        tenantId: parsed.tenantId.trim(),
        canRead: Boolean(parsed.canRead),
        canWrite: Boolean(parsed.canWrite),
        canDelete: Boolean(parsed.canDelete),
        canManageSharing: Boolean(parsed.canManageSharing),
      };
    } catch {
      return null;
    }
  };

  const persistTenantAuthorization = async (
    userId: string,
    tenantId: string,
    permissions?: Partial<Omit<PersistedTenantAuthorization, 'tenantId'>>
  ) => {
    if (!userId.trim() || !tenantId.trim() || !permissions) return;
    try {
      await storage.setItem(
        tenantAuthorizationKey(userId),
        JSON.stringify({
          tenantId: tenantId.trim(),
          canRead: Boolean(permissions.canRead),
          canWrite: Boolean(permissions.canWrite),
          canDelete: Boolean(permissions.canDelete),
          canManageSharing: Boolean(permissions.canManageSharing),
        })
      );
    } catch {
      // Best effort only. The in-memory authorization remains authoritative for the UI.
    }
  };

  return {
    loadPersistedTenantSelection,
    persistTenantSelection,
    loadPersistedTenantAuthorization,
    persistTenantAuthorization,
  };
};

const tenantSelectionStorage = createTenantSelectionStorage(AsyncStorage);

export const loadPersistedTenantSelection = tenantSelectionStorage.loadPersistedTenantSelection;
export const persistTenantSelection = tenantSelectionStorage.persistTenantSelection;
export const loadPersistedTenantAuthorization = tenantSelectionStorage.loadPersistedTenantAuthorization;
export const persistTenantAuthorization = tenantSelectionStorage.persistTenantAuthorization;
