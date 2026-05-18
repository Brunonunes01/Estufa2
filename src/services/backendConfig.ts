export type DataBackend = 'firebase' | 'supabase';

const normalizeBackend = (value?: string | null): DataBackend => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'supabase') return 'supabase';
  return 'firebase';
};

export const getDataBackend = (): DataBackend =>
  normalizeBackend(process.env.EXPO_PUBLIC_DATA_BACKEND);

export const isSupabaseBackend = () => getDataBackend() === 'supabase';

