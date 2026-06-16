export type SharedTenantRole = 'admin' | 'operator' | 'guest';

export type TenantPermissions = {
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  canManageSharing?: boolean;
};

export type TenantContext = {
  type?: 'owner' | 'shared';
  role?: SharedTenantRole;
  permissions?: TenantPermissions;
} | null | undefined;

export type AccessRole = 'owner' | 'manager' | 'operator' | 'viewer';

export type AccessSnapshot = {
  accessRole: AccessRole;
  accessRoleLabel: string;
  sharedRole?: SharedTenantRole;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isOperator: boolean;
  isReadOnly: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageSharing: boolean;
  canManageSecurity: boolean;
  canDeleteEstufa: boolean;
  canViewCash: boolean;
  canViewFinancialDashboard: boolean;
  canViewReports: boolean;
  canInviteManager: boolean;
  canRemoveManager: boolean;
};

const sharedRoleDefaults: Record<SharedTenantRole, Required<TenantPermissions>> = {
  admin: {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManageSharing: true,
  },
  operator: {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canManageSharing: false,
  },
  guest: {
    canRead: true,
    canWrite: false,
    canDelete: false,
    canManageSharing: false,
  },
};

export const resolveSharedTenantRole = (role?: string | null): SharedTenantRole => {
  if (role === 'admin' || role === 'operator') return role;
  return 'guest';
};

export const getDefaultTenantPermissions = (role: SharedTenantRole): Required<TenantPermissions> =>
  sharedRoleDefaults[role];

export const resolveTenantPermissions = (tenant: TenantContext): Required<TenantPermissions> => {
  if (tenant?.type === 'owner') {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canManageSharing: true,
    };
  }

  const sharedRole = resolveSharedTenantRole(tenant?.role);
  const defaults = getDefaultTenantPermissions(sharedRole);
  const permissions = tenant?.permissions;

  return {
    canRead: Boolean(permissions?.canRead ?? defaults.canRead),
    canWrite: Boolean(permissions?.canWrite ?? defaults.canWrite),
    canDelete: Boolean(permissions?.canDelete ?? defaults.canDelete),
    canManageSharing: Boolean(permissions?.canManageSharing ?? defaults.canManageSharing),
  };
};

export const resolveAccessRole = (tenant: TenantContext): AccessRole => {
  if (tenant?.type === 'owner') return 'owner';

  const sharedRole = resolveSharedTenantRole(tenant?.role);
  if (sharedRole === 'admin') return 'manager';
  if (sharedRole === 'operator') return 'operator';
  return 'viewer';
};

export const getRoleLabel = (role: AccessRole) => {
  if (role === 'owner') return 'Proprietário';
  if (role === 'manager') return 'Gerente';
  if (role === 'operator') return 'Operador';
  return 'Consulta';
};

export const getAccessSnapshot = (tenant: TenantContext): AccessSnapshot => {
  const isOwner = tenant?.type === 'owner';
  const sharedRole = resolveSharedTenantRole(tenant?.role);
  const permissions = resolveTenantPermissions(tenant);
  const canRead = permissions.canRead;
  const canWrite = permissions.canWrite;
  const canDelete = permissions.canDelete;
  const canManageSharing = permissions.canManageSharing;
  const accessRole = resolveAccessRole(tenant);

  const isManager = accessRole === 'manager';
  const isOperator = accessRole === 'operator';
  const isReadOnly = accessRole === 'viewer';
  const canViewCash = canRead;
  const canViewFinancialDashboard = canRead;

  return {
    accessRole,
    accessRoleLabel: getRoleLabel(accessRole),
    sharedRole,
    isOwner,
    isAdmin: isManager,
    isManager,
    isOperator,
    isReadOnly,
    canRead,
    canWrite,
    canDelete,
    canManageSharing,
    canManageSecurity: isOwner || isManager,
    canDeleteEstufa: isOwner,
    canViewCash,
    canViewFinancialDashboard,
    canViewReports: canRead,
    canInviteManager: isOwner,
    canRemoveManager: isOwner,
  };
};
