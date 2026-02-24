// src/screens/Auth/ShareAccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { generateShareCode, redeemShareCode, getSharedTenants } from '../../services/shareService';
import { Tenant } from '../../types/domain';

export default function ShareAccountScreen({ navigation }: any) {
    const { user, selectedTenantId } = useAuth();
    
    // Controle de Abas: 'minhas' = quem acessa a minha estufa | 'parceiros' = estufas que eu acesso
    const [activeTab, setActiveTab] = useState<'minhas' | 'parceiros'>('parceiros');

    // Estados para GERAÇÃO (Dono)
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [loadingGen, setLoadingGen] = useState(false);

    // Estados para RESGATE (Convidado)
    const [inputCode, setInputCode] = useState('');
    const [loadingRedeem, setLoadingRedeem] = useState(false);

    // Lista de Compartilhamentos
    const [sharedTenants, setSharedTenants] = useState<Tenant[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    useEffect(() => {
        if (activeTab === 'parceiros') {
            loadSharedList();
        }
    }, [activeTab]);

    const loadSharedList = async () => {
        if (!user) return;
        setLoadingList(true);
        const list = await getSharedTenants(user.uid);
        setSharedTenants(list);
        setLoadingList(false);
    };

    const handleGenerate = async () => {
        if (!user) return;
        setLoadingGen(true);
        try {
            // Usa o UID do usuário como TenantID padrão se ele estiver na conta principal dele
            const tenantParaCompartilhar = user.uid; 
            const code = await generateShareCode(tenantParaCompartilhar, "Estufa de " + (user.name || "Produtor"), user.name || "Produtor");
            setGeneratedCode(code);
        } catch (error) {
            Alert.alert("Erro", "Falha ao gerar código. Verifique sua conexão.");
        } finally {
            setLoadingGen(false);
        }
    };

    const handleRedeem = async () => {
        if (!inputCode) return Alert.alert("Atenção", "Digite o código de convite.");
        setLoadingRedeem(true);
        try {
            await redeemShareCode(inputCode, user!.uid);
            Alert.alert("Sucesso!", "Acesso vinculado com sucesso!");
            setInputCode('');
            loadSharedList();
        } catch (error: any) {
            Alert.alert("Erro ao vincular", error.message);
        } finally {
            setLoadingRedeem(false);
        }
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return 'Data desconhecida';
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR');
    };

    // Card para a aba de Parceiros (Estufas que eu fui convidado)
    const renderParceiroItem = ({ item }: { item: Tenant }) => (
        <View style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="account-group" size={24} color="#3B82F6" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="account-arrow-left" size={16} color="#64748B" />
                    <Text style={styles.metaText}>
                        Proprietário: <Text style={styles.bold}>{item.sharedBy || 'Parceiro'}</Text>
                    </Text>
                </View>
                
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-check" size={16} color="#64748B" />
                    <Text style={styles.metaText}>
                        Vinculado em: <Text style={styles.bold}>{formatDate(item.sharedAt)}</Text>
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                
                {/* CABEÇALHO COM ABAS */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'parceiros' && styles.activeTab]}
                        onPress={() => setActiveTab('parceiros')}
                    >
                        <Text style={[styles.tabText, activeTab === 'parceiros' && styles.activeTabText]}>
                            Acessar Parceiros
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'minhas' && styles.activeTab]}
                        onPress={() => setActiveTab('minhas')}
                    >
                        <Text style={[styles.tabText, activeTab === 'minhas' && styles.activeTabText]}>
                            Convidar Pessoas
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    
                    {/* ABA: PARCEIROS (Contas de terceiros) */}
                    {activeTab === 'parceiros' && (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Vincular Nova Conta</Text>
                            <Text style={styles.subtitle}>Digite o código fornecido pelo dono da estufa.</Text>
                            
                            <View style={styles.inputContainer}>
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Ex: X7K9P2"
                                    placeholderTextColor="#94A3B8"
                                    value={inputCode}
                                    onChangeText={text => setInputCode(text.toUpperCase())}
                                    maxLength={6}
                                    autoCapitalize="characters"
                                />
                                <TouchableOpacity 
                                    style={styles.redeemBtn} 
                                    onPress={handleRedeem}
                                    disabled={loadingRedeem}
                                >
                                    {loadingRedeem ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Vincular</Text>}
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.sectionTitle, {marginTop: 30, marginBottom: 15}]}>Estufas que tenho acesso</Text>
                            {loadingList ? (
                                <ActivityIndicator style={{marginTop: 20}} color="#3B82F6" />
                            ) : (
                                <FlatList
                                    data={sharedTenants}
                                    keyExtractor={item => item.uid}
                                    renderItem={renderParceiroItem}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="link-variant-off" size={40} color="#CBD5E1" />
                                            <Text style={styles.emptyText}>Você não está vinculado a nenhuma estufa de terceiros.</Text>
                                        </View>
                                    }
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            )}
                        </View>
                    )}

                    {/* ABA: MINHA ESTUFA (Convidar terceiros) */}
                    {activeTab === 'minhas' && (
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            
                            <View style={styles.inviteHeader}>
                                <MaterialCommunityIcons name="shield-account-outline" size={48} color="#059669" />
                                <Text style={[styles.sectionTitle, {marginTop: 10, textAlign: 'center'}]}>Compartilhar Minha Estufa</Text>
                                <Text style={[styles.subtitle, {textAlign: 'center', paddingHorizontal: 20}]}>
                                    Permita que funcionários ou sócios acessem e registrem informações na sua estufa.
                                </Text>
                            </View>

                            {generatedCode ? (
                                <View style={styles.codeDisplay}>
                                    <MaterialCommunityIcons name="check-circle" size={32} color="#10B981" style={{marginBottom: 10}}/>
                                    <Text style={styles.codeLabel}>Seu código de convite é:</Text>
                                    <Text style={styles.codeValue}>{generatedCode}</Text>
                                    <Text style={styles.codeWarning}>Envie este código para a pessoa. Ele expira em 24h.</Text>
                                    
                                    <TouchableOpacity onPress={() => setGeneratedCode(null)} style={styles.secondaryBtn}>
                                        <Text style={styles.secondaryBtnText}>Gerar outro código</Text>
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
                                            <MaterialCommunityIcons name="key-plus" size={24} color="#FFF" style={{marginRight: 10}} />
                                            <Text style={[styles.btnText, {fontSize: 18}]}>Criar Convite</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                        </ScrollView>
                    )}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    
    // ABAS
    tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', padding: 8, marginHorizontal: 24, marginTop: 20, borderRadius: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#EFF6FF' },
    tabText: { fontWeight: '600', color: '#64748B' },
    activeTabText: { color: '#2563EB', fontWeight: 'bold' },

    content: { padding: 24, flex: 1 },
    
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
    
    // INPUTS
    inputContainer: { flexDirection: 'row', gap: 12 },
    input: { 
        flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', 
        borderRadius: 14, paddingHorizontal: 16, height: 56, fontSize: 18, 
        color: '#1E293B', fontWeight: 'bold', letterSpacing: 2
    },
    redeemBtn: { 
        backgroundColor: '#3B82F6', borderRadius: 14, paddingHorizontal: 24, 
        justifyContent: 'center', alignItems: 'center' 
    },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    // CARDS LISTA
    card: { 
        backgroundColor: '#FFF', flexDirection: 'row', padding: 16, borderRadius: 16, 
        marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
        shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 
    },
    cardIcon: { 
        width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    metaText: { fontSize: 13, color: '#64748B', marginLeft: 6 },
    bold: { fontWeight: '700', color: '#334155' },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#FFF', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 10, lineHeight: 20 },

    // ABA CONVIDAR
    inviteHeader: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    generateBtn: { 
        backgroundColor: '#059669', borderRadius: 16, paddingVertical: 18, 
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: "#059669", shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    
    // CÓDIGO GERADO
    codeDisplay: { 
        backgroundColor: '#ECFDF5', padding: 30, borderRadius: 16, 
        alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' 
    },
    codeLabel: { fontSize: 14, color: '#047857', fontWeight: '600' },
    codeValue: { fontSize: 40, fontWeight: '900', color: '#064E3B', marginVertical: 15, letterSpacing: 6 },
    codeWarning: { fontSize: 13, color: '#059669', marginBottom: 20 },
    
    secondaryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: 'rgba(5, 150, 105, 0.1)' },
    secondaryBtnText: { color: '#059669', fontWeight: 'bold' }
});