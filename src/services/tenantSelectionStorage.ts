import AsyncStorage from '@react-native-async-storage/async-storage';

const tenantSelectionKey = (userId: string) => `tenant_selection_v1:${userId}`;

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

  return {
    loadPersistedTenantSelection,
    persistTenantSelection,
  };
};

const tenantSelectionStorage = createTenantSelectionStorage(AsyncStorage);

export const loadPersistedTenantSelection = tenantSelectionStorage.loadPersistedTenantSelection;
export const persistTenantSelection = tenantSelectionStorage.persistTenantSelection;
