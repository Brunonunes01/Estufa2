// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore'; 
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { User } from '../types/domain';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  selectedTenantId: string;
  changeTenant: (uid: string) => void;
  availableTenants: { uid: string; name: string }[];
  signIn: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<{ uid: string; name: string }[]>([]);

  useEffect(() => {
    let unsubscribeShares: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
        
          if (userDoc.exists()) {
            const userData = { uid: firebaseUser.uid, ...userDoc.data() } as User;
            setUser(userData);
            
            // Se não tiver selecionado, seleciona a própria conta
            if (!selectedTenantId) setSelectedTenantId(userData.uid);

            // 1. Sua conta principal (Sempre clara)
            const myAccount = { uid: userData.uid, name: 'Minha Estufa (Principal)' };
            
            // 2. Acessos antigos (Fallback)
            const legacyShares: { uid: string; name: string }[] = [];
            if (userData.sharedAccess && Array.isArray(userData.sharedAccess)) {
                userData.sharedAccess.forEach((access: any) => {
                    legacyShares.push({ uid: access.uid, name: `Estufa de ${access.name || 'Parceiro'}` });
                });
            }

            // 3. Monitoramento em TEMPO REAL dos novos convites
            unsubscribeShares = onSnapshot(collection(db, 'users', firebaseUser.uid, 'accessible_tenants'), (snapshot) => {
                const newShares = snapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // A MÁGICA AQUI: Pegamos o nome exato de quem compartilhou (sharedBy)
                    // Se não tiver, usamos o nome salvo ou 'Parceiro' como plano B
                    let nomeDono = data.sharedBy || data.name || 'Parceiro';
                    
                    // Limpa o nome caso ele já venha com "Estufa de " salvo do banco antigo
                    if (nomeDono.startsWith('Estufa de ')) {
                        nomeDono = nomeDono.replace('Estufa de ', '');
                    }

                    return {
                        uid: data.tenantId,
                        name: `Estufa de ${nomeDono}` // Ex: "Estufa de Bruno"
                    };
                });

                // Junta tudo e remove duplicatas
                const allTenants = [myAccount, ...legacyShares, ...newShares];
                const uniqueTenants = allTenants.filter((item, index, self) =>
                    index === self.findIndex((t) => t.uid === item.uid)
                );

                setAvailableTenants(uniqueTenants);
            });

          } else {
            setUser(null);
          }
        } catch (error) {
           console.error('AuthContext Error:', error);
           setUser(null);
        }
      } else {
        // Logout
        setUser(null);
        setAvailableTenants([]);
        setSelectedTenantId('');
        if (unsubscribeShares) unsubscribeShares();
      }
      setLoading(false);
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeShares) unsubscribeShares();
    };
  }, []);

  const changeTenant = (uid: string) => {
      setSelectedTenantId(uid);
  };

  const signIn = async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        selectedTenantId: selectedTenantId || (user?.uid || ''), 
        changeTenant,
        availableTenants,
        signIn 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};