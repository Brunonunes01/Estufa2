// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types/domain';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  // O ID que deve ser usado para buscar dados (pode ser o meu ou de um parceiro)
  selectedTenantId: string; 
  // Função para trocar de conta
  changeTenant: (uid: string) => void;
  // Lista de contas que posso acessar
  availableTenants: { uid: string; name: string }[]; 
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar qual conta estamos visualizando
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Lista de contas disponíveis (Minha + Compartilhadas)
  const [availableTenants, setAvailableTenants] = useState<{ uid: string; name: string }[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
        
          if (userDoc.exists()) {
            const userData = { uid: firebaseUser.uid, ...userDoc.data() } as User;
            setUser(userData);
            
            // Define a conta padrão como a do próprio usuário
            setSelectedTenantId(userData.uid);

            // Monta a lista de contas acessíveis
            const tenants = [{ uid: userData.uid, name: 'Minha Conta (Padrão)' }];
            
            if (userData.sharedAccess && Array.isArray(userData.sharedAccess)) {
                userData.sharedAccess.forEach(access => {
                    tenants.push({ uid: access.uid, name: `Conta de ${access.name}` });
                });
            }
            setAvailableTenants(tenants);

          } else {
            setUser(null);
          }
        } catch (error) {
           console.error('AuthContext Error:', error);
           setUser(null);
        }
      } else {
        setUser(null);
        setAvailableTenants([]);
        setSelectedTenantId('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const changeTenant = (uid: string) => {
      setSelectedTenantId(uid);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        selectedTenantId: selectedTenantId || (user?.uid || ''), 
        changeTenant,
        availableTenants 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};