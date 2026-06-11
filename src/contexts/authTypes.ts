import { User } from '../types/domain';

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
  role?: 'guest' | 'operator' | 'admin';
  permissions?: TenantPermissionFlags;
};

export interface AuthContextData {
  user: User | null;
  loading: boolean;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: AvailableTenant[];
  signIn: (email: string, password: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}
