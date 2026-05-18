import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { getCurrentAuthUserBridge } from './authBridge';

const ensureSupabaseReady = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
};

export const verifyCurrentUserPassword = async (password: string): Promise<boolean> => {
  ensureSupabaseReady();
  const authUser = await getCurrentAuthUserBridge();
  if (!authUser?.email) throw new Error('Usuário não autenticado.');

  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password,
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
  if (!isValid) {
    throw new Error('Senha atual inválida.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};
