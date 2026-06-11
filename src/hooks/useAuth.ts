// src/hooks/useAuth.ts
import { useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAccessSnapshot } from '../lib/accessControl';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return useMemo(() => {
    const selectedTenant = context.availableTenants.find((tenant) => tenant.uid === context.selectedTenantId);
    const access = getAccessSnapshot(selectedTenant);

    return {
      ...context,
      selectedTenant,
      ...access,
    };
  }, [context]);
};
