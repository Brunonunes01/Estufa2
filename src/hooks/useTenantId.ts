import { useMemo } from 'react';
import { useAuth } from './useAuth';

export const useTenantId = () => {
  const { user, selectedTenantId } = useAuth();

  return useMemo(() => selectedTenantId || user?.uid, [selectedTenantId, user?.uid]);
};
