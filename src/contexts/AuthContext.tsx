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
  availableTenants: { uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string }[];
  signIn: (email: string, password: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<{ uid: string; name: string; type?: 'owner' | 'shared'; ownerName?: string }[]>([]);

  const normalizeOwnerName = (value: unknown) => {
    if (typeof value !== 'string') return 'Parceiro';
    const clean = value.trim();
    return clean || 'Parceiro';
  };

  const loadUserProfile = async (uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      setUser(null);
      return null;
    }

    const raw = userDoc.data();
    const userData = {
      uid,
      ...raw,
      role: raw.role || 'admin',
    } as User;

    setUser(userData);
    if (!selectedTenantId) setSelectedTenantId(userData.uid);
    return userData;
  };

  useEffect(() => {
    let unsubscribeShares: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await loadUserProfile(firebaseUser.uid);
          if (userData) {
            setUser(userData);
            
            // Se não tiver selecionado, seleciona a própria conta
            if (!selectedTenantId) setSelectedTenantId(userData.uid);

            // 1. Sua conta principal (Sempre clara)
            const myAccount = { uid: userData.uid, name: 'Minha Estufa (Principal)', type: 'owner' as const, ownerName: userData.name };
            
            // 2. Acessos antigos (Fallback)
            const legacyShares: { uid: string; name: string; type: 'shared'; ownerName: string }[] = [];
            if (userData.sharedAccess && Array.isArray(userData.sharedAccess)) {
                userData.sharedAccess.forEach((access: any) => {
                    const ownerName = normalizeOwnerName(access?.ownerName || access?.sharedBy || access?.name);
                    legacyShares.push({
                      uid: access.uid,
                      name: `Estufa de ${ownerName}`,
                      type: 'shared',
                      ownerName,
                    });
                });
            }

            // 3. Monitoramento em TEMPO REAL dos novos convites
            unsubscribeShares = onSnapshot(collection(db, 'users', firebaseUser.uid, 'accessible_tenants'), (snapshot) => {
                const newShares = snapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // A MÁGICA AQUI: Pegamos o nome exato de quem compartilhou (sharedBy)
                    // Se não tiver, usamos o nome salvo ou 'Parceiro' como plano B
                    const ownerName = normalizeOwnerName(
                      data.ownerName || data.sharedByName || data.sharedBy || data.name
                    );

                    return {
                        uid: data.tenantId,
                        name: `Estufa de ${ownerName}`,
                        type: 'shared' as const,
                        ownerName,
                    };
                });

                // Junta tudo e remove duplicatas
                const allTenants = [myAccount, ...legacyShares, ...newShares];
                const uniqueTenants = allTenants.filter((item, index, self) =>
                    index === self.findIndex((t) => t.uid === item.uid)
                );

                setAvailableTenants(uniqueTenants);
            });

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

  const refreshUserProfile = async () => {
    if (!user?.uid) return;
    await loadUserProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        selectedTenantId: selectedTenantId || (user?.uid || ''), 
        changeTenant,
        availableTenants,
        signIn,
        refreshUserProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
