import { mapSessionUserToAuthBridgeUser, AuthBridgeUser, isInvalidRefreshTokenError } from './authBridgeHelpers.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

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

export const resetPasswordForEmailBridge = async (email: string) => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
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
};

export const signOutBridge = async () => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

const clearInvalidLocalSession = async () => {
  const supabase = getSupabaseClient();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Best effort cleanup only.
  }
};

export const onAuthStateChangedBridge = (
  callback: (user: AuthBridgeUser | null) => void
) => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  let hasResolvedInitialSession = false;
  let pendingUser: AuthBridgeUser | null | undefined;
  let isActive = true;

  const flushUser = (user: AuthBridgeUser | null) => {
    if (!isActive) return;
    hasResolvedInitialSession = true;
    callback(pendingUser !== undefined ? pendingUser : user);
    pendingUser = undefined;
  };

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const mappedUser = mapSessionUserToAuthBridgeUser(session?.user);
    if (!hasResolvedInitialSession) {
      pendingUser = mappedUser;
      return;
    }
    if (!isActive) return;
    callback(mappedUser);
  });

  void supabase.auth
    .getSession()
    .then(async ({ data: sessionData, error }) => {
      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearInvalidLocalSession();
          flushUser(null);
          return;
        }
        throw error;
      }
      flushUser(mapSessionUserToAuthBridgeUser(sessionData.session?.user));
    })
    .catch(async (error) => {
      if (isInvalidRefreshTokenError(error)) {
        await clearInvalidLocalSession();
        flushUser(null);
      }
    });

  return () => {
    isActive = false;
    data.subscription.unsubscribe();
  };
};

export const getCurrentAuthUserBridge = async (): Promise<AuthBridgeUser | null> => {
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearInvalidLocalSession();
      return null;
    }
    throw error;
  }
  return mapSessionUserToAuthBridgeUser(data.session?.user);
};
