import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

export const verifyCurrentUserPassword = async (password: string): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error('Usuário não autenticado.');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, password);

  try {
    await reauthenticateWithCredential(currentUser, credential);
    return true;
  } catch (error: any) {
    if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
      return false;
    }
    throw error;
  }
};

export const changeCurrentUserPassword = async (currentPassword: string, newPassword: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error('Usuário não autenticado.');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
};
