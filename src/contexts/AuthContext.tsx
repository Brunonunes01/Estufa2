import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types/domain';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { onAuthStateChangedBridge, signInWithPasswordBridge } from '../services/authBridge';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: { uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string; role?: 'guest' | 'operator' | 'admin' }[];
  signIn: (email: string, password: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const ensureSupabaseConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<
    { uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string; role?: 'guest' | 'operator' | 'admin' }[]
  >([]);

  const ensureSupabaseProfileAndTenants = useCallback(
    async (authUser: { id: string; email?: string | null; displayName?: string | null }) => {
      ensureSupabaseConfigured();
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
          name: tenant?.name || (isOwner ? 'Minha Estufa' : 'Estufa Compartilhada'),
          type: (isOwner ? 'owner' : 'shared') as 'owner' | 'shared',
          ownerName: isOwner ? fallbackName : undefined,
          role: (m.role || 'guest') as 'guest' | 'operator' | 'admin',
        };
      });

      setAvailableTenants(tenantOptions);
      setSelectedTenantId((prev) => {
        if (prev && tenantOptions.some((t) => t.uid === prev)) return prev;
        const ownerTenant = tenantOptions.find((item) => item.type === 'owner');
        return ownerTenant?.uid || tenantOptions[0]?.uid || '';
      });

      const role =
        (profile?.role as User['role']) ||
        ((memberships || []).some((m: any) => m.role === 'admin') ? 'admin' : 'operator');

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

  useEffect(() => {
    let authUnsubscribe: (() => void) | null = null;

    const bootstrap = async () => {
      authUnsubscribe = onAuthStateChangedBridge(async (authUser) => {
        if (authUser) {
          try {
            await ensureSupabaseProfileAndTenants(authUser);
          } catch (error) {
            console.error('AuthContext Error:', error);
            setUser(null);
          }
        } else {
          setUser(null);
          setAvailableTenants([]);
          setSelectedTenantId('');
        }
        setLoading(false);
      });
    };

    bootstrap();

    return () => {
      if (authUnsubscribe) authUnsubscribe();
    };
  }, [ensureSupabaseProfileAndTenants]);

  const changeTenant = (uid: string) => {
    setSelectedTenantId(uid);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithPasswordBridge(email, password);
  };

  const refreshUserProfile = async () => {
    if (!user?.uid) return;
    await ensureSupabaseProfileAndTenants({
      id: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
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
