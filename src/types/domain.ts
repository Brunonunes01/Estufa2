// src/types/domain.ts

export interface Tenant {
  uid: string;
  name: string;
  ownerId: string;
  // NOVOS CAMPOS PARA RASTREABILIDADE
  sharedBy?: string; // Nome do proprietário que compartilhou
  sharedAt?: string; // Data em que o compartilhamento foi aceito (ISO string)
  createdAt?: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  currentTenantId: string;
  // Lista de IDs de tenants aos quais o usuário tem acesso
  sharedTenants?: string[]; 
}

// Interface auxiliar para o código de compartilhamento (se houver)
export interface ShareCode {
    code: string;
    tenantId: string;
    tenantName: string;
    ownerName: string; // Importante para sabermos quem gerou
    createdAt: number;
    expiresAt: number;
}