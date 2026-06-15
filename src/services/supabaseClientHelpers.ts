export const resolveSupabaseStorageKey = (supabaseUrl?: string | null) => {
  if (!supabaseUrl) return 'sge.supabase.auth';
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0] || 'default';
    return `sge.supabase.auth.${projectRef}`;
  } catch {
    return 'sge.supabase.auth';
  }
};
