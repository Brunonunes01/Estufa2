// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  // Lógica de segurança para saber se sou dono
  const isOwner = !context.selectedTenantId || context.selectedTenantId === context.user?.uid;

  // Retornamos tudo do contexto (...) + o isOwner
  // O TypeScript vai inferir automaticamente que 'signIn' está incluso aqui
  return {
    ...context, 
    isOwner 
  };
};