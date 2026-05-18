// Compat legado: app agora é Supabase-only.
// Este módulo é mantido temporariamente apenas para imports antigos ainda presentes.

export const app = {} as any;
export const db = {} as any;
export const auth = {
  currentUser: null,
  signOut: async () => undefined,
} as any;
