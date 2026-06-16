import { createAuthTenantBootstrapService } from './authTenantBootstrapCore.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';

export { AuthBootstrapResult } from './authTenantBootstrapCore.ts';

export const ensureSupabaseConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase nÃ£o configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
};

const defaultAuthTenantBootstrapService = createAuthTenantBootstrapService({
  ensureConfigured: ensureSupabaseConfigured,
  loadProfile: async (userId) => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('profiles').select('id, email, name, role').eq('id', userId).maybeSingle();
    return data || null;
  },
  loadMemberships: async (userId) => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('tenant_memberships')
      .select(
        'tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, tenants(id, name, owner_user_id)'
      )
      .eq('user_id', userId);
    return data || [];
  },
  upsertProfile: async (input) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .upsert(input, { onConflict: 'id' })
      .select('id, email, name, role')
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },
  createOwnerTenant: async (ownerUserId, tenantName) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('tenants').insert({
      owner_user_id: ownerUserId,
      name: tenantName,
    });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
      throw error;
    }
  },
  loadProfilesByIds: async (userIds) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
    if (error) throw error;
    return data || [];
  },
  now: () => new Date().toISOString(),
});

export const bootstrapAuthTenantState = defaultAuthTenantBootstrapService.bootstrapAuthTenantState;
