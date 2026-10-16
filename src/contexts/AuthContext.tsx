import React, { createContext, useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';

import { onAuthStateChangedBridge, signInWithPasswordBridge } from '../services/authBridge';
import { bootstrapAuthTenantState } from '../services/authTenantService';
import { loadPersistedTenantSelection, persistTenantSelection } from '../services/tenantSelectionStorage';
import { AuthContextData } from './authTypes';
import { toAuthBootstrapErrorMessage } from './authContextHelpers';

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextData['user']>(null);
  const [loading, setLoading] = useState(true);
  const [authBootstrapError, setAuthBootstrapError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<AuthContextData['availableTenants']>([]);
  const selectedTenantIdRef = useRef('');
  const authBootstrapRef = useRef(0);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setAvailableTenants([]);
    setSelectedTenantId('');
    selectedTenantIdRef.current = '';
  }, []);

  const ensureSupabaseProfileAndTenants = useCallback(
    async (authUser: { id: string; email?: string | null; displayName?: string | null }) => {
      const bootstrapId = authBootstrapRef.current + 1;
      authBootstrapRef.current = bootstrapId;
      const persistedTenantId =
        selectedTenantIdRef.current || (await loadPersistedTenantSelection(authUser.id));
      const bootstrap = await bootstrapAuthTenantState(authUser, persistedTenantId);
      if (authBootstrapRef.current !== bootstrapId) return;
      setAvailableTenants(bootstrap.availableTenants);
      setSelectedTenantId(bootstrap.resolvedTenantId);
      selectedTenantIdRef.current = bootstrap.resolvedTenantId;
      await persistTenantSelection(authUser.id, bootstrap.resolvedTenantId);
      setUser(bootstrap.user);
      setAuthBootstrapError(null);
    },
    []
  );

  useEffect(() => {
    let authUnsubscribe: (() => void) | null = null;
    let isMounted = true;

    const bootstrap = async () => {
      authUnsubscribe = onAuthStateChangedBridge(async (authUser) => {
        if (!isMounted) return;
        if (authUser) {
          try {
            await ensureSupabaseProfileAndTenants(authUser);
          } catch {
            if (!isMounted) return;
            resetAuthState();
            setAuthBootstrapError('Nao foi possivel carregar o perfil autenticado.');
          }
        } else {
          resetAuthState();
          setAuthBootstrapError(null);
        }
        if (isMounted) {
          setLoading(false);
        }
      });
    };

    void bootstrap().catch((error) => {
      if (!isMounted) return;
      resetAuthState();
      setAuthBootstrapError(toAuthBootstrapErrorMessage(error));
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (authUnsubscribe) authUnsubscribe();
    };
  }, [ensureSupabaseProfileAndTenants, resetAuthState]);

  const changeTenant = (uid: string) => {
    const trimmedUid = uid.trim();
    if (!trimmedUid || !availableTenants.some((tenant) => tenant.uid === trimmedUid)) {
      return;
    }
    selectedTenantIdRef.current = trimmedUid;
    setSelectedTenantId(trimmedUid);
    if (user?.uid) {
      void persistTenantSelection(user.uid, trimmedUid);
    }
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
      authBootstrapError,
      selectedTenantId: selectedTenantId || user?.uid || '',
      changeTenant,
      availableTenants,
      signIn,
      refreshUserProfile,
    }),
    [user, loading, authBootstrapError, selectedTenantId, availableTenants]
  );

  return <AuthContext.Provider value={contextValue}>{!loading && children}</AuthContext.Provider>;
};
