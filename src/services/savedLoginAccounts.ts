import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@estufa2:saved_login_accounts';
const MAX_SAVED_ACCOUNTS = 5;

export interface SavedLoginAccount {
  email: string;
  lastUsedAt: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeAccounts = (accounts: SavedLoginAccount[]): SavedLoginAccount[] => {
  const unique = new Map<string, SavedLoginAccount>();

  accounts.forEach((account) => {
    const normalizedEmail = normalizeEmail(account.email);
    if (!normalizedEmail) return;

    unique.set(normalizedEmail, {
      email: normalizedEmail,
      lastUsedAt: account.lastUsedAt || new Date(0).toISOString(),
    });
  });

  return Array.from(unique.values())
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, MAX_SAVED_ACCOUNTS);
};

export const getSavedLoginAccounts = async (): Promise<SavedLoginAccount[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sanitizeAccounts(parsed as SavedLoginAccount[]);
  } catch (error) {
    console.error('Erro ao carregar contas salvas:', error);
    return [];
  }
};

export const saveLoginAccount = async (email: string): Promise<SavedLoginAccount[]> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return getSavedLoginAccounts();

  const current = await getSavedLoginAccounts();
  const next = sanitizeAccounts([
    { email: normalizedEmail, lastUsedAt: new Date().toISOString() },
    ...current.filter((account) => account.email !== normalizedEmail),
  ]);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const removeSavedLoginAccount = async (email: string): Promise<SavedLoginAccount[]> => {
  const normalizedEmail = normalizeEmail(email);
  const current = await getSavedLoginAccounts();
  const next = current.filter((account) => account.email !== normalizedEmail);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};
