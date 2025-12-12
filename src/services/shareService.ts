// src/services/shareService.ts
import { db } from './firebaseConfig';
import { 
    collection, addDoc, query, where, getDocs, doc, updateDoc, 
    serverTimestamp, getDoc, arrayUnion, setDoc 
} from 'firebase/firestore';
import { ShareCode, Tenant } from '../types/domain';

// Gera um código de compartilhamento (Exemplo simplificado)
export const generateShareCode = async (tenantId: string, tenantName: string, ownerName: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Gera código ex: "X7K9P2"
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas

    const shareData: ShareCode = {
        code,
        tenantId,
        tenantName,
        ownerName, // Salvamos o nome do dono aqui
        createdAt: Date.now(),
        expiresAt
    };

    // Salva na coleção temporária de códigos
    await addDoc(collection(db, 'share_codes'), shareData);
    return code;
};

// Resgata o código (Onde a mágica acontece)
export const redeemShareCode = async (code: string, userId: string): Promise<boolean> => {
    try {
        // 1. Busca o código
        const q = query(collection(db, 'share_codes'), where('code', '==', code.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) throw new Error("Código inválido.");

        const shareDoc = snapshot.docs[0];
        const shareData = shareDoc.data() as ShareCode;

        // 2. Verifica validade
        if (Date.now() > shareData.expiresAt) throw new Error("Código expirado.");

        // 3. Adiciona o usuário à lista de membros do Tenant (opcional, dependendo da sua estrutura)
        // await updateDoc(doc(db, 'tenants', shareData.tenantId), {
        //     members: arrayUnion(userId)
        // });

        // 4. Salva o acesso no perfil do usuário COM OS NOVOS DADOS
        const userRef = doc(db, 'users', userId);
        
        // Aqui salvamos os metadados do compartilhamento
        // Vamos salvar em uma subcoleção ou array de objetos para ter esses detalhes
        // Estrutura sugerida: users/{uid}/accessible_tenants/{tenantId}
        await setDoc(doc(db, 'users', userId, 'accessible_tenants', shareData.tenantId), {
            tenantId: shareData.tenantId,
            name: shareData.tenantName,
            sharedBy: shareData.ownerName, // <--- NOME DE QUEM COMPARTILHOU
            sharedAt: new Date().toISOString(), // <--- DATA DO ACEITE
            role: 'guest'
        });

        // Deleta o código usado (para ser uso único)
        // await deleteDoc(shareDoc.ref); 

        return true;

    } catch (error) {
        console.error("Erro ao resgatar código:", error);
        throw error;
    }
};

// Busca os tenants compartilhados com o usuário
export const getSharedTenants = async (userId: string): Promise<Tenant[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'users', userId, 'accessible_tenants'));
        return snapshot.docs.map(doc => ({
            uid: doc.data().tenantId,
            name: doc.data().name,
            ownerId: '', // Não crítico para listagem
            sharedBy: doc.data().sharedBy || 'Desconhecido',
            sharedAt: doc.data().sharedAt || null
        })) as Tenant[];
    } catch (error) {
        console.error(error);
        return [];
    }
};