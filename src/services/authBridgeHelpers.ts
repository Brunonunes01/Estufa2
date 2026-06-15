export type AuthBridgeUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
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
