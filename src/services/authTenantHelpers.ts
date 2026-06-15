export type AuthBootstrapUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

export type AvailableTenantLike = {
  uid: string;
  name: string;
  type?: 'owner' | 'shared';
  ownerName?: string;
  role?: 'guest' | 'operator' | 'admin';
  permissions?: {
    canRead?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    canManageSharing?: boolean;
  };
};

export type MembershipTenantRow = {
  id?: string | null;
  name?: string | null;
  owner_user_id?: string | null;
};

export type MembershipRow = {
  tenant_id: string;
  role?: 'guest' | 'operator' | 'admin' | null;
  can_read?: boolean | null;
  can_write?: boolean | null;
  can_delete?: boolean | null;
  can_manage_sharing?: boolean | null;
  tenants?: MembershipTenantRow | MembershipTenantRow[] | null;
};

const pickMembershipTenant = (tenant: MembershipRow['tenants']): MembershipTenantRow | null => {
  if (Array.isArray(tenant)) return tenant[0] || null;
  return tenant || null;
};

export const mapMembershipsToAvailableTenants = (
  memberships: MembershipRow[],
  authUser: AuthBootstrapUser,
  fallbackName: string
): AvailableTenantLike[] =>
  memberships.map((membership) => {
    const tenant = pickMembershipTenant(membership.tenants);
    const isOwner = tenant?.owner_user_id === authUser.id;

    return {
      uid: membership.tenant_id,
      name: tenant?.name || (isOwner ? 'Minha Estufa' : 'Estufa Compartilhada'),
      type: isOwner ? 'owner' : 'shared',
      ownerName: isOwner ? fallbackName : undefined,
      role: membership.role || 'guest',
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

export const resolveTenantSelection = (
  availableTenants: AvailableTenantLike[],
  previousTenantId?: string
) => {
  const ownerTenant = availableTenants.find((item) => item.type === 'owner');
  return previousTenantId && availableTenants.some((item) => item.uid === previousTenantId)
    ? previousTenantId
    : ownerTenant?.uid || availableTenants[0]?.uid || '';
};

export const resolveBootstrapRole = (
  profileRole: 'admin' | 'operator' | 'guest' | null | undefined,
  memberships: MembershipRow[]
) => {
  if (profileRole) return profileRole;
  if (memberships.some((membership) => membership.role === 'admin')) return 'admin';
  if (memberships.some((membership) => membership.role === 'operator')) return 'operator';
  return 'guest';
};
