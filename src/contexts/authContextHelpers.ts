export const toAuthBootstrapErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'Nao foi possivel inicializar a autenticacao.';
};
