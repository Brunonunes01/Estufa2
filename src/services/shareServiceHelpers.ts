export type SharedTenantMembershipRow = {
  tenant_id: string;
  role?: 'guest' | 'operator' | 'admin' | null;
  can_read?: boolean | null;
  can_write?: boolean | null;
  can_delete?: boolean | null;
  can_manage_sharing?: boolean | null;
  created_at?: string | null;
  tenants?: {
    id?: string | null;
    name?: string | null;
    owner_user_id?: string | null;
  } | Array<{
    id?: string | null;
    name?: string | null;
    owner_user_id?: string | null;
  }> | null;
};

export type ProfileLookupRow = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type TenantMembershipRow = {
  user_id: string;
  role?: 'guest' | 'operator' | 'admin' | null;
  can_read?: boolean | null;
  can_write?: boolean | null;
  can_delete?: boolean | null;
  can_manage_sharing?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const pickSharedTenant = (tenant: SharedTenantMembershipRow['tenants']) => {
  if (Array.isArray(tenant)) return tenant[0] || null;
  return tenant || null;
};

export const listSharedTenantOwnerIds = (memberships: SharedTenantMembershipRow[], userId: string) =>
  Array.from(
    new Set(
      memberships
        .map((item) => pickSharedTenant(item.tenants))
        .filter((tenant) => tenant?.owner_user_id && tenant.owner_user_id !== userId)
        .map((tenant) => tenant!.owner_user_id as string)
    )
  );

export const mapSharedTenantRows = (
  memberships: SharedTenantMembershipRow[],
  userId: string,
  ownerNamesMap: Map<string, string>,
  ownerEmailsMap: Map<string, string>
) => {
  const filtered = memberships.filter((item) => pickSharedTenant(item.tenants)?.owner_user_id !== userId);

  return filtered.map((item) => {
    const tenant = pickSharedTenant(item.tenants);
    const ownerId = tenant?.owner_user_id || '';
    return {
      uid: item.tenant_id,
      name: tenant?.name || 'Estufa Compartilhada',
      ownerId,
      sharedBy: ownerNamesMap.get(ownerId) || 'Parceiro',
      sharedByEmail: ownerEmailsMap.get(ownerId) || null,
      ownerEmail: ownerEmailsMap.get(ownerId) || null,
      role: item.role || 'guest',
      permissions: {
        canRead: !!item.can_read,
        canWrite: !!item.can_write,
        canDelete: !!item.can_delete,
        canManageSharing: !!item.can_manage_sharing,
      },
      sharedAt: item.created_at || null,
    };
  });
};

export const mapTenantMembers = (
  memberships: TenantMembershipRow[],
  profilesMap: Map<string, ProfileLookupRow>
) =>
  memberships.map((item) => {
    const profile = profilesMap.get(item.user_id);
    return {
      userId: item.user_id,
      name: profile?.name || 'Usuario',
      email: profile?.email || null,
      role: item.role || 'guest',
      sharedAt: item.created_at || null,
      lastAccessAt: item.updated_at || item.created_at || null,
      canRead: !!item.can_read,
      canWrite: !!item.can_write,
      canDelete: !!item.can_delete,
      canManageSharing: !!item.can_manage_sharing,
    };
  });
