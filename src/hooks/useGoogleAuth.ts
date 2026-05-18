interface UseGoogleAuthOptions {
  onError?: (message: string) => void;
}

export const useGoogleAuth = ({ onError }: UseGoogleAuthOptions = {}) => {
  const signInWithGoogle = async () => {
    onError?.('Login com Google ainda não está habilitado no modo Supabase desta versão.');
  };

  return {
    signInWithGoogle,
    loadingGoogle: false,
    googleDisabled: true,
  };
};

export default useGoogleAuth;
