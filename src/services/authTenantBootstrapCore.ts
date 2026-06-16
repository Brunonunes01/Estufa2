import type { AvailableTenant } from '../contexts/authTypes.ts';
import type { User } from '../types/domain.ts';
import {
  mapMembershipsToAvailableTenants,
  resolveBootstrapRole,
  resolveTenantSelection,
} from './authTenantHelpers.ts';
import type { AuthBootstrapUser, MembershipRow } from './authTenantHelpers.ts';

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

export type AuthTenantBootstrapDeps = {
  ensureConfigured(): void;
  loadProfile(userId: string): Promise<ProfileRow | null>;
  loadMemberships(userId: string): Promise<MembershipRow[]>;
  upsertProfile(input: { id: string; email: string; name: string; updated_at: string }): Promise<ProfileRow | null>;
  createOwnerTenant(ownerUserId: string, tenantName: string): Promise<void>;
  loadProfilesByIds(userIds: string[]): Promise<ProfileRow[]>;
  now(): string;
};

export const createAuthTenantBootstrapService = (deps: AuthTenantBootstrapDeps) => {
  const bootstrapAuthTenantState = async (
    authUser: AuthBootstrapUser,
    previousTenantId?: string
  ): Promise<AuthBootstrapResult> => {
    deps.ensureConfigured();
    const fallbackName = authUser.displayName?.trim() || authUser.email?.split('@')[0] || 'UsuÃ¡rio';

    let [profile, memberships] = await Promise.all([deps.loadProfile(authUser.id), deps.loadMemberships(authUser.id)]);

    if (!profile || !profile.name || !profile.email) {
      profile =
        (await deps.upsertProfile({
          id: authUser.id,
          email: authUser.email || profile?.email || '',
          name: profile?.name || fallbackName,
          updated_at: deps.now(),
        })) || profile;
    }

    if (!memberships || memberships.length === 0) {
      const tenantName = `Estufa de ${fallbackName.split(' ')[0] || 'UsuÃ¡rio'}`;
      await deps.createOwnerTenant(authUser.id, tenantName);
      memberships = await deps.loadMemberships(authUser.id);
    }

    const ownerIds = Array.from(
      new Set(
        memberships
          .map((membership) => {
            const tenant = Array.isArray(membership.tenants) ? membership.tenants[0] : membership.tenants;
            return tenant?.owner_user_id || null;
          })
          .filter((ownerId): ownerId is string => Boolean(ownerId && ownerId !== authUser.id))
      )
    );

    const ownerNamesMap = new Map<string, string>();
    const ownerEmailsMap = new Map<string, string>();

    if (ownerIds.length > 0) {
      const ownerProfiles = await deps.loadProfilesByIds(ownerIds);
      ownerProfiles.forEach((ownerRow) => {
        ownerNamesMap.set(ownerRow.id, ownerRow.name || 'Responsavel');
        if (ownerRow.email) ownerEmailsMap.set(ownerRow.id, ownerRow.email);
      });
    }

    const availableTenants = mapMembershipsToAvailableTenants(
      memberships,
      authUser,
      fallbackName,
      ownerNamesMap,
      ownerEmailsMap
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

  return {
    bootstrapAuthTenantState,
  };
};
