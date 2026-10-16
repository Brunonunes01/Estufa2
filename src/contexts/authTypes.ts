import type { User } from '../types/domain.ts';

export type TenantPermissionFlags = {
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  canManageSharing?: boolean;
};

export type AvailableTenant = {
  uid: string;
  name: string;
  type?: 'owner' | 'shared';
  ownerName?: string;
  ownerEmail?: string;
  role?: 'guest' | 'operator' | 'admin';
  permissions?: TenantPermissionFlags;
};

export interface AuthContextData {
  user: User | null;
  loading: boolean;
  authBootstrapError?: string | null;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: AvailableTenant[];
  signIn: (email: string, password: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}
