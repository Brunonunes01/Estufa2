// src/screens/Auth/ShareAccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { generateShareCode, redeemShareCode, getSharedTenants } from '../../services/shareService';
import { Tenant } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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

    const formatDate = (value?: string | number | { toDate?: () => Date }) => {
        if (!value) return 'Data desconhecida';
        const date = typeof value === 'number'
          ? new Date(value)
          : typeof value === 'string'
            ? new Date(value)
            : value.toDate
              ? value.toDate()
              : new Date();
        return date.toLocaleDateString('pt-BR');
    };

    // Card para a aba de Parceiros (Estufas que eu fui convidado)
    const renderParceiroItem = ({ item }: { item: Tenant }) => (
        <View style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: COLORS.infoSoft }]}>
                <MaterialCommunityIcons name="account-group" size={24} color={COLORS.info} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="account-arrow-left" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>
                        Proprietário: <Text style={styles.bold}>{item.sharedBy || 'Parceiro'}</Text>
                    </Text>
                </View>
                
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-check" size={16} color={COLORS.textSecondary} />
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
                                    placeholderTextColor={COLORS.textPlaceholder}
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
                                    {loadingRedeem ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.btnText}>Vincular</Text>}
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.sectionTitle, {marginTop: 30, marginBottom: 15}]}>Estufas que tenho acesso</Text>
                            {loadingList ? (
                                <ActivityIndicator style={{marginTop: 20}} color={COLORS.info} />
                            ) : (
                                <FlatList
                                    data={sharedTenants}
                                    keyExtractor={item => item.uid}
                                    renderItem={renderParceiroItem}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <MaterialCommunityIcons name="link-variant-off" size={40} color={COLORS.borderDark} />
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
                                <MaterialCommunityIcons name="shield-account-outline" size={48} color={COLORS.success} />
                                <Text style={[styles.sectionTitle, {marginTop: 10, textAlign: 'center'}]}>Compartilhar Minha Estufa</Text>
                                <Text style={[styles.subtitle, {textAlign: 'center', paddingHorizontal: 20}]}>
                                    Permita que funcionários ou sócios acessem e registrem informações na sua estufa.
                                </Text>
                            </View>

                            {generatedCode ? (
                                <View style={styles.codeDisplay}>
                                    <MaterialCommunityIcons name="check-circle" size={32} color={COLORS.success} style={{marginBottom: 10}}/>
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
                                        <ActivityIndicator color={COLORS.textLight} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="key-plus" size={24} color={COLORS.textLight} style={{marginRight: 10}} />
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
    container: { flex: 1, backgroundColor: COLORS.background },
    
    // ABAS
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 8, marginHorizontal: 24, marginTop: 20, borderRadius: RADIUS.lg, ...SHADOWS.card },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.sm },
    activeTab: { backgroundColor: COLORS.infoSoft },
    tabText: { fontWeight: '600', color: COLORS.textSecondary },
    activeTabText: { color: COLORS.info, fontWeight: 'bold' },

    content: { padding: 24, flex: 1 },
    
    sectionTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
    
    // INPUTS
    inputContainer: { flexDirection: 'row', gap: 12 },
    input: { 
        flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.md, paddingHorizontal: 16, height: 56, fontSize: TYPOGRAPHY.title,
        color: COLORS.textPrimary, fontWeight: 'bold', letterSpacing: 2
    },
    redeemBtn: { 
        backgroundColor: COLORS.info, borderRadius: RADIUS.md, paddingHorizontal: 24, 
        justifyContent: 'center', alignItems: 'center' 
    },
    btnText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 16 },

    // CARDS LISTA
    card: { 
        backgroundColor: COLORS.surface, flexDirection: 'row', padding: 16, borderRadius: RADIUS.lg,
        marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
        ...SHADOWS.card
    },
    cardIcon: { 
        width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: TYPOGRAPHY.title, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    metaText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 },
    bold: { fontWeight: '700', color: COLORS.textPrimary },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.borderDark },
    emptyText: { textAlign: 'center', color: COLORS.textPlaceholder, marginTop: 10, lineHeight: 20 },

    // ABA CONVIDAR
    inviteHeader: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    generateBtn: { 
        backgroundColor: COLORS.success, borderRadius: RADIUS.lg, paddingVertical: 18, 
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    
    // CÓDIGO GERADO
    codeDisplay: { 
        backgroundColor: COLORS.successSoft, padding: 30, borderRadius: RADIUS.lg,
        alignItems: 'center', borderWidth: 1, borderColor: COLORS.border
    },
    codeLabel: { fontSize: 14, color: COLORS.success, fontWeight: '600' },
    codeValue: { fontSize: 40, fontWeight: '900', color: COLORS.secondary, marginVertical: 15, letterSpacing: 6 },
    codeWarning: { fontSize: 13, color: COLORS.success, marginBottom: 20 },
    
    secondaryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.sm, backgroundColor: COLORS.whiteAlpha10 },
    secondaryBtnText: { color: COLORS.success, fontWeight: 'bold' }
});
