type SharedTenantRole = 'admin' | 'operator' | 'guest';

type TenantPermissions = {
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  canManageSharing?: boolean;
};

type TenantContext = {
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

export const getRoleLabel = (role: AccessRole) => {
  if (role === 'owner') return 'Proprietário';
  if (role === 'manager') return 'Gerente';
  if (role === 'operator') return 'Operador';
  return 'Consulta';
};

export const getAccessSnapshot = (tenant: TenantContext): AccessSnapshot => {
  const isOwner = tenant?.type === 'owner';
  const sharedRole = (tenant?.role || 'guest') as SharedTenantRole;
  const defaults = sharedRoleDefaults[sharedRole];
  const permissions = tenant?.permissions || defaults;

  const canRead = isOwner ? true : Boolean(permissions.canRead ?? defaults.canRead);
  const canWrite = isOwner ? true : Boolean(permissions.canWrite ?? defaults.canWrite);
  const canDelete = isOwner ? true : Boolean(permissions.canDelete ?? defaults.canDelete);
  const canManageSharing = isOwner ? true : Boolean(permissions.canManageSharing ?? defaults.canManageSharing);

  const accessRole: AccessRole = isOwner
    ? 'owner'
    : sharedRole === 'admin'
      ? 'manager'
      : sharedRole === 'operator'
        ? 'operator'
        : 'viewer';

  const isManager = accessRole === 'manager';
  const isOperator = accessRole === 'operator';
  const isReadOnly = accessRole === 'viewer';
  const canViewCash = isOwner || isManager;
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
