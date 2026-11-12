import { useCallback } from 'react';
import { signOutBridge } from '../services/authBridge';
import { classifyServiceError } from '../services/serviceErrorClassifier';

export const useDashboardActions = () => {
  const signOut = useCallback(async () => {
    try {
      await signOutBridge();
    } catch (error) {
      throw classifyServiceError(error, { operation: 'authentication', source: 'dashboard-actions' });
    }
  }, []);

  return { signOut };
};
