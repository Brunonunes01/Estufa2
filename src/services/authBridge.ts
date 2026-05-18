import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type AuthBridgeUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

const ensureSupabaseReady = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
};

export const signInWithPasswordBridge = async (email: string, password: string) => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
};

export const signUpWithPasswordBridge = async (name: string, email: string, password: string) => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: name },
    },
  });
  if (error) throw error;

  const user = data.user;
  if (!user) {
    throw new Error('Não foi possível criar a conta.');
  }

  // Com confirmação de e-mail ativa, pode não haver sessão imediata.
  if (!data.session) {
    return;
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email || email.trim(),
      name,
      role: 'admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileError) throw profileError;

  const tenantName = `Estufa de ${name.split(' ')[0] || 'Usuário'}`;
  const { error: tenantError } = await supabase.from('tenants').insert({
    owner_user_id: user.id,
    name: tenantName,
  });
  if (tenantError) {
    const msg = String(tenantError.message || '');
    if (!msg.toLowerCase().includes('duplicate')) {
      throw tenantError;
    }
  }
};

export const signOutBridge = async () => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const onAuthStateChangedBridge = (
  callback: (user: AuthBridgeUser | null) => void
) => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    callback(
      user
        ? {
            id: user.id,
            email: user.email,
            displayName: (user.user_metadata?.display_name as string | undefined) || null,
          }
        : null
    );
  });

  return () => data.subscription.unsubscribe();
};

export const getCurrentAuthUserBridge = async (): Promise<AuthBridgeUser | null> => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: (user.user_metadata?.display_name as string | undefined) || null,
  };
};
