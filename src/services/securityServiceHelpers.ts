export const normalizePasswordForVerification = (password: string) => password.trim();

export const canChangePassword = (isCurrentPasswordValid: boolean) => {
  if (!isCurrentPasswordValid) {
    throw new Error('Senha atual invalida.');
  }
};
