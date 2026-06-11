import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';

import { onAuthStateChangedBridge, signInWithPasswordBridge } from '../services/authBridge';
import { bootstrapAuthTenantState } from '../services/authTenantService';
import { AuthContextData } from './authTypes';

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextData['user']>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<AuthContextData['availableTenants']>([]);

  const ensureSupabaseProfileAndTenants = useCallback(
    async (authUser: { id: string; email?: string | null; displayName?: string | null }) => {
      const bootstrap = await bootstrapAuthTenantState(authUser, selectedTenantId);
      setAvailableTenants(bootstrap.availableTenants);
      setSelectedTenantId(bootstrap.resolvedTenantId);
      setUser(bootstrap.user);
    },
    [selectedTenantId]
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

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      selectedTenantId: selectedTenantId || user?.uid || '',
      changeTenant,
      availableTenants,
      signIn,
      refreshUserProfile,
    }),
    [user, loading, selectedTenantId, availableTenants]
  );

  return <AuthContext.Provider value={contextValue}>{!loading && children}</AuthContext.Provider>;
};
