import type { TenantPermissionFlags } from '../contexts/authTypes.ts';
import { hasTenantPermission, type TenantOperation } from '../lib/accessControl.ts';

type ActiveAuthorization = {
  authUserId: string;
  tenantId: string;
  permissions: Required<TenantPermissionFlags>;
};

let activeAuthorization: ActiveAuthorization | null = null;

export const setActiveTenantAuthorization = (
  authUserId: string,
  tenantId: string,
  permissions: TenantPermissionFlags
) => {
  if (!authUserId.trim() || !tenantId.trim()) {
    activeAuthorization = null;
    return;
  }
  activeAuthorization = {
    authUserId: authUserId.trim(),
    tenantId: tenantId.trim(),
    permissions: {
      canRead: Boolean(permissions.canRead),
      canWrite: Boolean(permissions.canWrite),
      canDelete: Boolean(permissions.canDelete),
      canManageSharing: Boolean(permissions.canManageSharing),
    },
  };
};

export const clearActiveTenantAuthorization = () => {
  activeAuthorization = null;
};

export const assertActiveTenantAuthorization = (tenantId: string, operation: TenantOperation = 'read') => {
  if (!activeAuthorization) return tenantId;
  if (activeAuthorization.tenantId !== tenantId.trim()) {
    throw new Error('Escopo de tenant divergente para operacao protegida.');
  }
  if (!hasTenantPermission(activeAuthorization.permissions, operation)) {
    throw new Error('Permissao insuficiente para operacao protegida.');
  }
  return tenantId.trim();
};
