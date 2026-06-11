import { User } from '../types/domain';
import { AvailableTenant } from '../contexts/authTypes';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type AuthBootstrapUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

export type AuthBootstrapResult = {
  user: User;
  availableTenants: AvailableTenant[];
  resolvedTenantId: string;
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

  let profile = profileResult.data;
  let memberships = membershipsResult.data || [];

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
    memberships = reload.data || [];
  }

  const availableTenants: AvailableTenant[] = (memberships || []).map((membership: any) => {
    const tenant = membership.tenants;
    const isOwner = tenant?.owner_user_id === authUser.id;

    return {
      uid: membership.tenant_id,
      name: tenant?.name || (isOwner ? 'Minha Estufa' : 'Estufa Compartilhada'),
      type: isOwner ? 'owner' : 'shared',
      ownerName: isOwner ? fallbackName : undefined,
      role: (membership.role || 'guest') as AvailableTenant['role'],
      permissions: isOwner
        ? {
            canRead: true,
            canWrite: true,
            canDelete: true,
            canManageSharing: true,
          }
        : {
            canRead: !!membership.can_read,
            canWrite: !!membership.can_write,
            canDelete: !!membership.can_delete,
            canManageSharing: !!membership.can_manage_sharing,
          },
    };
  });

  const ownerTenant = availableTenants.find((item) => item.type === 'owner');
  const resolvedTenantId =
    previousTenantId && availableTenants.some((item) => item.uid === previousTenantId)
      ? previousTenantId
      : ownerTenant?.uid || availableTenants[0]?.uid || '';

  const role =
    (profile?.role as User['role']) ||
    ((memberships || []).some((membership: any) => membership.role === 'admin')
      ? 'admin'
      : (memberships || []).some((membership: any) => membership.role === 'operator')
        ? 'operator'
        : 'guest');

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
