// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Importação do Firebase
import { User } from '../types/domain';

// 1. DEFINIÇÃO DA TIPAGEM (A "Promessa" do que existe no contexto)
interface AuthContextData {
  user: User | null;
  loading: boolean;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: { uid: string; name: string }[];
  // Aqui declaramos que o signIn existe!
  signIn: (email: string, password: string) => Promise<void>; 
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
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
            
            setSelectedTenantId(prev => prev || userData.uid);

            // Monta lista de contas
            const tenants = [{ uid: userData.uid, name: 'Minha Conta (Padrão)' }];
            
            // Busca compartilhamentos antigos (Array)
            if (userData.sharedAccess && Array.isArray(userData.sharedAccess)) {
                userData.sharedAccess.forEach((access: any) => {
                    if (!tenants.find(t => t.uid === access.uid)) {
                        tenants.push({ uid: access.uid, name: `Conta de ${access.name}` });
                    }
                });
            }

            // Busca compartilhamentos novos (Subcoleção)
            try {
                const sharedSnapshot = await getDocs(collection(db, 'users', firebaseUser.uid, 'accessible_tenants'));
                sharedSnapshot.forEach(doc => {
                     const data = doc.data();
                     if (!tenants.find(t => t.uid === data.tenantId)) {
                         tenants.push({ uid: data.tenantId, name: data.name || 'Estufa Compartilhada' });
                     }
                });
            } catch (err) {
                console.log("Erro ao carregar compartilhamentos:", err);
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

  // 2. IMPLEMENTAÇÃO DA FUNÇÃO
  const signIn = async (email: string, password: string) => {
      // Chama o Firebase diretamente
      await signInWithEmailAndPassword(auth, email, password);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        selectedTenantId: selectedTenantId || (user?.uid || ''), 
        changeTenant,
        availableTenants,
        signIn // 3. EXPORTAÇÃO (Não esqueça de passar aqui!)
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};