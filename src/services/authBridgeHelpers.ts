export type AuthBridgeUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  name?: string | null;
};

type SessionUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
  } | null;
};

export const mapSessionUserToAuthBridgeUser = (user: SessionUserLike | null | undefined): AuthBridgeUser | null => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || null,
  };
};

export const isInvalidRefreshTokenError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as AuthErrorLike;
  const message = String(candidate.message || '').toLowerCase();
  const code = String(candidate.code || '').toLowerCase();
  const name = String(candidate.name || '').toLowerCase();

  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    code.includes('refresh_token') ||
    name.includes('authapierror')
  );
};
