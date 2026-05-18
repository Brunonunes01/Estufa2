import { useCallback } from 'react';
import { signOutBridge } from '../services/authBridge';

export const useDashboardActions = () => {
  const signOut = useCallback(async () => {
    await signOutBridge();
  }, []);

  return { signOut };
};
