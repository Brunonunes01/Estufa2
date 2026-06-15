import { User } from '../types/domain';
import { AvailableTenant } from '../contexts/authTypes';
import {
  AuthBootstrapUser,
  mapMembershipsToAvailableTenants,
  MembershipRow,
  resolveBootstrapRole,
  resolveTenantSelection,
} from './authTenantHelpers.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type AuthBootstrapResult = {
  user: User;
  availableTenants: AvailableTenant[];
  resolvedTenantId: string;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: User['role'] | null;
};

export const ensureSupabaseConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
};

export const bootstrapAuthTenantState = async (
  authUser: AuthBootstrapUser,
  previousTenantId?: string
): Promise<AuthBootstrapResult> => {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const fallbackName = authUser.displayName?.trim() || authUser.email?.split('@')[0] || 'Usuário';

  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('profiles').select('id, email, name, role').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('tenant_memberships')
      .select(
        'tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, tenants(id, name, owner_user_id)'
      )
      .eq('user_id', authUser.id),
  ]);

  let profile = (profileResult.data || null) as ProfileRow | null;
  let memberships = (membershipsResult.data || []) as MembershipRow[];

  if (!profile || !profile.name || !profile.email) {
    const { data: upsertedProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email || profile?.email || '',
          name: profile?.name || fallbackName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, email, name, role')
      .maybeSingle();

    if (profileError) throw profileError;
    profile = upsertedProfile || profile;
  }

  if (!memberships || memberships.length === 0) {
    const tenantName = `Estufa de ${fallbackName.split(' ')[0] || 'Usuário'}`;
    const { error: tenantError } = await supabase.from('tenants').insert({
      owner_user_id: authUser.id,
      name: tenantName,
    });

    if (tenantError && !String(tenantError.message || '').toLowerCase().includes('duplicate')) {
      throw tenantError;
    }

    const reload = await supabase
      .from('tenant_memberships')
      .select(
        'tenant_id, role, can_read, can_write, can_delete, can_manage_sharing, tenants(id, name, owner_user_id)'
      )
      .eq('user_id', authUser.id);
    memberships = (reload.data || []) as MembershipRow[];
  }

  const availableTenants = mapMembershipsToAvailableTenants(
    memberships,
    authUser,
    fallbackName
  ) as AvailableTenant[];
  const resolvedTenantId = resolveTenantSelection(availableTenants, previousTenantId);
  const role = resolveBootstrapRole(profile?.role, memberships);

  return {
    availableTenants,
    resolvedTenantId,
    user: {
      uid: authUser.id,
      email: authUser.email || '',
      name: profile?.name || fallbackName,
      displayName: profile?.name || fallbackName,
      role,
    } as User,
  };
};
