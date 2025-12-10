// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  // Lógica de Segurança:
  // Se não tem tenant selecionado, ou se o tenant é igual ao meu ID, sou o DONO.
  // Caso contrário, estou visitando a conta de alguém (Sou Operador/Parceiro).
  const isOwner = !context.selectedTenantId || context.selectedTenantId === context.user?.uid;

  return {
    ...context,
    isOwner, // Exportamos essa variável para usar nas telas
  };
};