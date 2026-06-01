// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  // Lógica de segurança para saber se sou dono
  const selectedTenant = context.availableTenants.find((tenant) => tenant.uid === context.selectedTenantId);
  const isOwner = selectedTenant?.type === 'owner';
  const isAdmin = selectedTenant?.role === 'admin';
  const canDeleteEstufa = isOwner && isAdmin;
  const canManageSecurity = isOwner && isAdmin;

  // Retornamos tudo do contexto (...) + o isOwner
  // O TypeScript vai inferir automaticamente que 'signIn' está incluso aqui
  return {
    ...context, 
    isOwner,
    isAdmin,
    canDeleteEstufa,
    canManageSecurity,
  };
};
