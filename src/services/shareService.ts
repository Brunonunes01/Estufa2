// src/services/shareService.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  arrayUnion 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { User } from '../types/domain';

export const shareAccountByEmail = async (targetEmail: string, ownerUser: User) => {
  try {
    // 1. Achar o usuário pelo e-mail
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', targetEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Usuário não encontrado com este e-mail.');
    }

    const targetUserDoc = querySnapshot.docs[0];
    const targetUserData = targetUserDoc.data();

    // Evitar compartilhar consigo mesmo
    if (targetUserDoc.id === ownerUser.uid) {
        throw new Error('Você não pode compartilhar com você mesmo.');
    }

    // 2. Adicionar o ID do dono na lista de acessos do parceiro
    const accessItem = {
        uid: ownerUser.uid,
        name: ownerUser.name || 'Conta Compartilhada'
    };

    await updateDoc(doc(db, 'users', targetUserDoc.id), {
      sharedAccess: arrayUnion(accessItem)
    });

    console.log(`Conta de ${ownerUser.name} compartilhada com ${targetUserData.name}`);
    return targetUserData.name; // Retorna o nome de quem recebeu o acesso

  } catch (error: any) {
    console.error("Erro ao compartilhar:", error);
    throw new Error(error.message || 'Erro ao realizar compartilhamento.');
  }
};