// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { User } from '../types/domain'; // Nossa interface de usuário

interface AuthContextData {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Observador do Firebase Auth
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log('AuthContext: onAuthStateChanged disparou.'); // NOVO LOG

      if (firebaseUser) {
        console.log('AuthContext: Usuário LOGADO, UID:', firebaseUser.uid); // NOVO LOG
        
        // Vamos buscar os dados dele no Firestore
        console.log('AuthContext: Buscando documento em users/', firebaseUser.uid); // NOVO LOG
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);
        
          if (userDoc.exists()) {
            console.log('AuthContext: Documento encontrado! Setando usuário.'); // NOVO LOG
            setUser({
              uid: firebaseUser.uid,
              ...userDoc.data()
            } as User);
          } else {
            // Este é o BUG provável!
            console.error('AuthContext: ERRO! Usuário autenticado, mas sem documento no Firestore!'); // NOVO LOG
            setUser(null); // Mantém o usuário deslogado
          }
        } catch (error) {
           console.error('AuthContext: Erro ao buscar documento do usuário:', error); // NOVO LOG
           setUser(null);
        }

      } else {
        // Usuário deslogado
        console.log('AuthContext: Usuário DESLOGADO.'); // NOVO LOG
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Limpa o listener ao desmontar
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};