import { useCallback } from 'react';
import { auth } from '../services/firebaseConfig';

export const useDashboardActions = () => {
  const signOut = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { signOut };
};
