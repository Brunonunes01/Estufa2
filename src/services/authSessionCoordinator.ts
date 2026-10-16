import type { AuthBridgeUser } from './authBridgeHelpers.ts';

type SessionUser = unknown;
type SessionResult = { session?: { user?: SessionUser | null } | null };

interface AuthSessionCoordinatorDeps {
  subscribe: (listener: (sessionUser: SessionUser | null) => void) => () => void;
  getSession: () => Promise<SessionResult>;
  mapSessionUser: (user: SessionUser | null | undefined) => AuthBridgeUser | null;
  clearInvalidLocalSession: () => Promise<void>;
  isInvalidRefreshTokenError: (error: unknown) => boolean;
  reportError?: (error: unknown) => void;
}

export const createAuthSessionCoordinator = ({
  subscribe,
  getSession,
  mapSessionUser,
  clearInvalidLocalSession,
  isInvalidRefreshTokenError,
  reportError,
}: AuthSessionCoordinatorDeps) => ({
  onAuthStateChanged(callback: (user: AuthBridgeUser | null) => void) {
    let hasResolvedInitialSession = false;
    let pendingUser: AuthBridgeUser | null | undefined;
    let isActive = true;

    const flushUser = (user: AuthBridgeUser | null) => {
      if (!isActive) return;
      hasResolvedInitialSession = true;
      callback(pendingUser !== undefined ? pendingUser : user);
      pendingUser = undefined;
    };

    const unsubscribe = subscribe((sessionUser) => {
      const mappedUser = mapSessionUser(sessionUser);
      if (!hasResolvedInitialSession) {
        pendingUser = mappedUser;
        return;
      }
      if (!isActive) return;
      callback(mappedUser);
    });

    void getSession()
      .then(async (sessionData) => {
        flushUser(mapSessionUser(sessionData.session?.user));
      })
      .catch(async (error) => {
        if (isInvalidRefreshTokenError(error)) {
          await clearInvalidLocalSession();
          flushUser(null);
          return;
        }
        reportError?.(error);
        flushUser(null);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  },
});
