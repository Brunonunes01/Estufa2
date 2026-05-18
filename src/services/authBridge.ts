import { onAuthStateChanged as onFirebaseAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth } from './firebaseConfig';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { isSupabaseBackend } from './backendConfig';
import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

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
  if (!isSupabaseBackend()) {
    await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    return;
  }

  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
};

export const signUpWithPasswordBridge = async (name: string, email: string, password: string) => {
  if (!isSupabaseBackend()) {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    await updateProfile(userCredential.user, { displayName: name });
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email: email.trim(),
      role: 'admin',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return;
  }

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
    // Evita bloquear cadastro caso já exista tenant bootstrap.
    if (!msg.toLowerCase().includes('duplicate')) {
      throw tenantError;
    }
  }
};

export const signOutBridge = async () => {
  if (!isSupabaseBackend()) {
    await firebaseAuth.signOut();
    return;
  }
  ensureSupabaseReady();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const onAuthStateChangedBridge = (
  callback: (user: AuthBridgeUser | null) => void
) => {
  if (!isSupabaseBackend()) {
    return onFirebaseAuthStateChanged(firebaseAuth, (fbUser) =>
      callback(
        fbUser
          ? {
              id: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
            }
          : null
      )
    );
  }

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
  if (!isSupabaseBackend()) {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return { id: user.uid, email: user.email, displayName: user.displayName };
  }

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
