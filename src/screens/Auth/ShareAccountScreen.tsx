// src/screens/Auth/ShareAccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { generateShareCode, redeemShareCode, getSharedTenants } from '../../services/shareService';
import { Tenant } from '../../types/domain';

export default function ShareAccountScreen({ navigation }: any) {
    const { user, selectedTenantId } = useAuth();
    
    // Estados para GERAÇÃO (Dono)
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [loadingGen, setLoadingGen] = useState(false);

    // Estados para RESGATE (Convidado)
    const [inputCode, setInputCode] = useState('');
    const [loadingRedeem, setLoadingRedeem] = useState(false);

    // Lista de Compartilhamentos
    const [sharedTenants, setSharedTenants] = useState<Tenant[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    // Carrega a lista de quem compartilhou comigo
    useEffect(() => {
        loadSharedList();
    }, []);

    const loadSharedList = async () => {
        if (!user) return;
        setLoadingList(true);
        const list = await getSharedTenants(user.uid);
        setSharedTenants(list);
        setLoadingList(false);
    };

    // 1. Gerar Código (Para outra pessoa acessar MINHA conta)
    const handleGenerate = async () => {
        if (!selectedTenantId || !user) return Alert.alert("Erro", "Selecione uma estufa primeiro.");
        setLoadingGen(true);
        try {
            // Passamos o nome do usuário atual como 'ownerName'
            const code = await generateShareCode(selectedTenantId, "Minha Estufa", user.name || "Produtor");
            setGeneratedCode(code);
        } catch (error) {
            Alert.alert("Erro", "Falha ao gerar código.");
        } finally {
            setLoadingGen(false);
        }
    };

    // 2. Resgatar Código (Para EU acessar a conta de outra pessoa)
    const handleRedeem = async () => {
        if (!inputCode) return;
        setLoadingRedeem(true);
        try {
            await redeemShareCode(inputCode, user!.uid);
            Alert.alert("Sucesso!", "Agora você tem acesso a essa conta.");
            setInputCode('');
            loadSharedList(); // Recarrega a lista para mostrar o novo
        } catch (error: any) {
            Alert.alert("Erro", error.message);
        } finally {
            setLoadingRedeem(false);
        }
    };

    // Função para formatar a data bonitinha (Ex: 12/12/2025)
    const formatDate = (isoString?: string) => {
        if (!isoString) return 'Data desconhecida';
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR');
    };

    // Componente do Card da Lista
    const renderSharedItem = ({ item }: { item: Tenant }) => (
        <View style={styles.card}>
            <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="store-check" size={24} color="#059669" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                
                {/* --- AQUI ESTÁ A NOVIDADE --- */}
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="account-arrow-left" size={14} color="#64748B" />
                    <Text style={styles.metaText}>
                        Compartilhado por: <Text style={styles.bold}>{item.sharedBy || 'Desconhecido'}</Text>
                    </Text>
                </View>
                
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-clock" size={14} color="#64748B" />
                    <Text style={styles.metaText}>
                        Desde: <Text style={styles.bold}>{formatDate(item.sharedAt)}</Text>
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                
                {/* BLOCO 1: ENTRAR EM UMA CONTA (CONVIDADO) */}
                <Text style={styles.sectionTitle}>Acessar conta de parceiro</Text>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={styles.input}
                        placeholder="Digite o código (ex: X7K9P2)"
                        placeholderTextColor="#94A3B8"
                        value={inputCode}
                        onChangeText={text => setInputCode(text.toUpperCase())}
                        maxLength={6}
                    />
                    <TouchableOpacity 
                        style={styles.redeemBtn} 
                        onPress={handleRedeem}
                        disabled={loadingRedeem}
                    >
                        {loadingRedeem ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.btnText}>Entrar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* BLOCO 2: LISTA DE CONTAS COMPARTILHADAS COMIGO */}
                <Text style={[styles.sectionTitle, {marginTop: 30}]}>Contas Vinculadas</Text>
                {loadingList ? (
                    <ActivityIndicator style={{marginTop: 20}} color="#059669" />
                ) : (
                    <FlatList
                        data={sharedTenants}
                        keyExtractor={item => item.uid}
                        renderItem={renderSharedItem}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Você ainda não acessa contas de terceiros.</Text>
                        }
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}

                <View style={styles.divider} />

                {/* BLOCO 3: COMPARTILHAR MINHA CONTA (DONO) */}
                <Text style={styles.sectionTitle}>Convidar Alguém</Text>
                <Text style={styles.subtitle}>Gere um código para dar acesso à sua estufa atual.</Text>
                
                {generatedCode ? (
                    <View style={styles.codeDisplay}>
                        <Text style={styles.codeLabel}>Código de Acesso:</Text>
                        <Text style={styles.codeValue}>{generatedCode}</Text>
                        <Text style={styles.codeWarning}>Válido por 24 horas</Text>
                        <TouchableOpacity onPress={() => setGeneratedCode(null)} style={{marginTop: 10}}>
                            <Text style={{color: '#059669', fontWeight: 'bold'}}>Gerar Novo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.generateBtn} 
                        onPress={handleGenerate}
                        disabled={loadingGen}
                    >
                        {loadingGen ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" style={{marginRight: 8}} />
                                <Text style={styles.btnText}>Gerar Código de Convite</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 24, flex: 1 },
    
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
    subtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
    
    // INPUTS
    inputContainer: { flexDirection: 'row', gap: 10 },
    input: { 
        flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', 
        borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, 
        color: '#1E293B', fontWeight: '600'
    },
    redeemBtn: { 
        backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 20, 
        justifyContent: 'center', alignItems: 'center' 
    },
    generateBtn: { 
        backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, 
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    // CARDS
    card: { 
        backgroundColor: '#FFF', flexDirection: 'row', padding: 16, borderRadius: 16, 
        marginBottom: 12, alignItems: 'center',
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 
    },
    cardIcon: { 
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#ECFDF5', 
        justifyContent: 'center', alignItems: 'center', marginRight: 16 
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
    
    // META DADOS (Novo)
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    metaText: { fontSize: 12, color: '#64748B', marginLeft: 4 },
    bold: { fontWeight: '600', color: '#334155' },

    emptyText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginTop: 10 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 30 },

    // CÓDIGO GERADO
    codeDisplay: { 
        backgroundColor: '#EFF6FF', padding: 20, borderRadius: 16, 
        alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' 
    },
    codeLabel: { fontSize: 12, color: '#3B82F6', textTransform: 'uppercase', fontWeight: '700' },
    codeValue: { fontSize: 32, fontWeight: '900', color: '#1E40AF', marginVertical: 8, letterSpacing: 4 },
    codeWarning: { fontSize: 12, color: '#64748B' },
});