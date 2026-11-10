import { useMemo } from 'react';
import { useAuth } from './useAuth';

export const useTenantId = () => {
  const { selectedTenantId } = useAuth();

  return useMemo(() => selectedTenantId.trim() || undefined, [selectedTenantId]);
};
