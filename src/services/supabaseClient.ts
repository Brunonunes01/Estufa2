import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { resolveSupabaseStorageKey } from './supabaseClientHelpers.ts';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

// O Fast Refresh recria o módulo, mas não destrói a instância anterior do
// GoTrueClient. Persistir o cliente no global evita duas auto-refresh loops
// disputando o mesmo Navigator LockManager no navegador.
const GLOBAL_CLIENT_KEY = '__sge_supabase_client__';
type SupabaseGlobal = typeof globalThis & {
  [GLOBAL_CLIENT_KEY]?: SupabaseClient;
};

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  if (!cachedClient) {
    const globalScope = globalThis as SupabaseGlobal;
    if (globalScope[GLOBAL_CLIENT_KEY]) {
      cachedClient = globalScope[GLOBAL_CLIENT_KEY] as SupabaseClient;
      return cachedClient;
    }

    cachedClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        storageKey: resolveSupabaseStorageKey(supabaseUrl),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        lockAcquireTimeout: 10000,
      },
    });
    globalScope[GLOBAL_CLIENT_KEY] = cachedClient;
  }

  return cachedClient;
};
