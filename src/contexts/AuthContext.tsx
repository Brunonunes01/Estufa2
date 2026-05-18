import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, getDoc, collection, onSnapshot, Unsubscribe, setDoc, Timestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth, db as firebaseDb } from '../services/firebaseConfig';
import { User } from '../types/domain';
import { isSupabaseBackend } from '../services/backendConfig';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { onAuthStateChangedBridge, signInWithPasswordBridge } from '../services/authBridge';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: { uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string }[];
  signIn: (email: string, password: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const normalizeOwnerName = (value: unknown) => {
  if (typeof value !== 'string') return 'Parceiro';
  const clean = value.trim();
  return clean || 'Parceiro';
};

const supabaseEnabled = () => isSupabaseBackend() && isSupabaseConfigured();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<
    { uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string }[]
  >([]);

  const ensureSupabaseProfileAndTenants = useCallback(
    async (authUser: { id: string; email?: string | null; displayName?: string | null }) => {
      const supabase = getSupabaseClient();
      const fallbackName = authUser.displayName?.trim() || authUser.email?.split('@')[0] || 'Usuário';

      await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: authUser.email || '',
          name: fallbackName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      let { data: memberships } = await supabase
        .from('tenant_memberships')
        .select('tenant_id, role, tenants(id, name, owner_user_id)')
        .eq('user_id', authUser.id);

      if (!memberships || memberships.length === 0) {
        const tenantName = `Estufa de ${fallbackName.split(' ')[0] || 'Usuário'}`;
        const { error: tenantError } = await supabase.from('tenants').insert({
          owner_user_id: authUser.id,
          name: tenantName,
        });

        if (tenantError && !String(tenantError.message || '').toLowerCase().includes('duplicate')) {
          throw tenantError;
        }

        const reload = await supabase
          .from('tenant_memberships')
          .select('tenant_id, role, tenants(id, name, owner_user_id)')
          .eq('user_id', authUser.id);
        memberships = reload.data || [];
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();

      const tenantOptions = (memberships || []).map((m: any) => {
        const tenant = m.tenants;
        const isOwner = tenant?.owner_user_id === authUser.id;
        return {
          uid: m.tenant_id,
          name: isOwner ? 'Minha Estufa (Principal)' : tenant?.name || 'Estufa Compartilhada',
          type: (isOwner ? 'owner' : 'shared') as 'owner' | 'shared',
          ownerName: isOwner ? fallbackName : undefined,
        };
      });

      setAvailableTenants(tenantOptions);
      setSelectedTenantId((prev) => {
        if (prev && tenantOptions.some((t) => t.uid === prev)) return prev;
        return tenantOptions[0]?.uid || '';
      });

      const role = (profile?.role as User['role']) || ((memberships || []).some((m: any) => m.role === 'admin') ? 'admin' : 'operator');

      setUser({
        uid: authUser.id,
        email: authUser.email || '',
        name: profile?.name || fallbackName,
        displayName: profile?.name || fallbackName,
        role,
      } as User);
    },
    []
  );

  const loadUserProfileFirebase = useCallback(
    async (uid: string) => {
      const userDocRef = doc(firebaseDb, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const firebaseUser = firebaseAuth.currentUser;
        const fallbackName = firebaseUser?.displayName?.trim() || firebaseUser?.email?.split('@')[0] || 'Usuário';
        const now = Timestamp.now();

        await setDoc(userDocRef, {
          name: fallbackName,
          email: firebaseUser?.email || '',
          role: 'admin',
          createdAt: now,
          updatedAt: now,
        });

        const createdDoc = await getDoc(userDocRef);
        if (!createdDoc.exists()) {
          setUser(null);
          return null;
        }

        const createdRaw = createdDoc.data();
        const createdUserData = {
          uid,
          ...createdRaw,
          role: createdRaw.role || 'admin',
        } as User;

        setUser(createdUserData);
        if (!selectedTenantId) setSelectedTenantId(createdUserData.uid);
        return createdUserData;
      }

      const raw = userDoc.data();
      const userData = {
        uid,
        ...raw,
        role: raw.role || 'admin',
      } as User;

      setUser(userData);
      if (!selectedTenantId) setSelectedTenantId(userData.uid);
      return userData;
    },
    [selectedTenantId]
  );

  useEffect(() => {
    let unsubscribeShares: Unsubscribe | undefined;

    const bootstrap = async () => {
      const unsubscribeAuth = onAuthStateChangedBridge(async (authUser) => {
        if (authUser) {
          try {
            if (supabaseEnabled()) {
              await ensureSupabaseProfileAndTenants(authUser);
            } else {
              const userData = await loadUserProfileFirebase(authUser.id);
              if (userData) {
                setUser(userData);
                if (!selectedTenantId) setSelectedTenantId(userData.uid);

                const myAccount = {
                  uid: userData.uid,
                  name: 'Minha Estufa (Principal)',
                  type: 'owner' as const,
                  ownerName: userData.name,
                };

                const legacyShares: { uid: string; name: string; type: 'shared'; ownerName: string }[] = [];
                if (userData.sharedAccess && Array.isArray(userData.sharedAccess)) {
                  userData.sharedAccess.forEach((access: any) => {
                    const ownerName = normalizeOwnerName(access?.ownerName || access?.sharedBy || access?.name);
                    const legacyTenantId = access?.tenantId || access?.uid;
                    if (!legacyTenantId) return;
                    legacyShares.push({
                      uid: legacyTenantId,
                      name: `Estufa de ${ownerName}`,
                      type: 'shared',
                      ownerName,
                    });
                  });
                }

                unsubscribeShares = onSnapshot(
                  collection(firebaseDb, 'users', authUser.id, 'accessible_tenants'),
                  (snapshot) => {
                    const newShares = snapshot.docs.map((item) => {
                      const data = item.data();
                      const ownerName = normalizeOwnerName(
                        data.ownerName || data.sharedByName || data.sharedBy || data.name
                      );

                      return {
                        uid: data.tenantId,
                        name: `Estufa de ${ownerName}`,
                        type: 'shared' as const,
                        ownerName,
                      };
                    });

                    const allTenants = [myAccount, ...legacyShares, ...newShares];
                    const uniqueTenants = allTenants.filter(
                      (item, index, self) => index === self.findIndex((t) => t.uid === item.uid)
                    );

                    setAvailableTenants(uniqueTenants);
                  }
                );
              }
            }
          } catch (error) {
            console.error('AuthContext Error:', error);
            setUser(null);
          }
        } else {
          setUser(null);
          setAvailableTenants([]);
          setSelectedTenantId('');
          if (unsubscribeShares) unsubscribeShares();
        }
        setLoading(false);
      });

      return unsubscribeAuth;
    };

    let authUnsubscribe: (() => void) | null = null;

    bootstrap().then((unsub) => {
      authUnsubscribe = unsub;
    });

    return () => {
      if (authUnsubscribe) authUnsubscribe();
      if (unsubscribeShares) unsubscribeShares();
    };
  }, [ensureSupabaseProfileAndTenants, loadUserProfileFirebase, selectedTenantId]);

  const changeTenant = (uid: string) => {
    setSelectedTenantId(uid);
  };

  const signIn = async (email: string, password: string) => {
    if (supabaseEnabled()) {
      await signInWithPasswordBridge(email, password);
      return;
    }
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const refreshUserProfile = async () => {
    if (!user?.uid) return;

    if (supabaseEnabled()) {
      await ensureSupabaseProfileAndTenants({
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      return;
    }

    await loadUserProfileFirebase(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        selectedTenantId: selectedTenantId || user?.uid || '',
        changeTenant,
        availableTenants,
        signIn,
        refreshUserProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
