import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../../../hooks/useAuth';
import { HydroLote } from '../types';
import { listHydroLotes } from '../services/hidroponiaLoteService';

export const useHidroponiaLotes = (estufaId?: string | null) => {
  const { user, selectedTenantId } = useAuth();
  const isFocused = useIsFocused();
  const [lotes, setLotes] = useState<HydroLote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetId = selectedTenantId || user?.uid;

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      setLotes(await listHydroLotes(targetId, estufaId));
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error('Falha ao carregar lotes.'));
    } finally {
      setLoading(false);
    }
  }, [targetId, estufaId]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  return { lotes, loading, error, refetch: load, targetId };
};
