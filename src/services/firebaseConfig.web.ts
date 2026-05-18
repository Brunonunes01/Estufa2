// Compat legado web: app agora é Supabase-only.
// Mantido apenas para imports antigos até limpeza total.

export const app = {} as any;
export const db = {} as any;
export const auth = {
  currentUser: null,
  signOut: async () => undefined,
} as any;
