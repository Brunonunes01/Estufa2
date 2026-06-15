import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { getCurrentAuthUserBridge } from './authBridge';
import { canChangePassword, normalizePasswordForVerification } from './securityServiceHelpers.ts';

const ensureSupabaseReady = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase nao configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
};

export const verifyCurrentUserPassword = async (password: string): Promise<boolean> => {
  ensureSupabaseReady();
  const authUser = await getCurrentAuthUserBridge();
  if (!authUser?.email) throw new Error('Usuario nao autenticado.');

  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: normalizePasswordForVerification(password),
    });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
};

export const changeCurrentUserPassword = async (currentPassword: string, newPassword: string) => {
  ensureSupabaseReady();
  const isValid = await verifyCurrentUserPassword(currentPassword);
  canChangePassword(isValid);

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};
