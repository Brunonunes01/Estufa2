const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '';
};

export const resolveServiceErrorMessage = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error).trim();
  return message || fallback;
};

export const getPasswordChangeErrorMessage = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('senha atual invalida')) {
    return 'Senha atual invalida.';
  }
  if (message.includes('usuario nao autenticado')) {
    return 'Sua sessao expirou. Entre novamente.';
  }
  return 'Nao foi possivel alterar a senha.';
};

export const getPasswordVerificationErrorMessage = (
  error: unknown,
  fallback = 'Falha ao validar senha de administrador.'
) => {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('usuario nao autenticado')) {
    return 'Sua sessao expirou. Entre novamente.';
  }
  if (message.includes('supabase nao configurado')) {
    return 'Ambiente de autenticacao indisponivel.';
  }
  return fallback;
};
