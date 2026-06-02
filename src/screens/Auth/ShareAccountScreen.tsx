// src/screens/Auth/ShareAccountScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { 
  SegmentedButtons, 
  TextInput, 
  Button, 
  Card, 
  useTheme as usePaperTheme,
  Surface
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
    generateShareCode,
    redeemShareCode,
    getSharedTenants,
    listTenantMembers,
    removeTenantMember,
    SHARE_CODE_DEFAULT_LENGTH,
    TenantMember,
} from '../../services/shareService';
import { Tenant } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

export default function ShareAccountScreen({ navigation }: any) {
    const { user, selectedTenantId, availableTenants, refreshUserProfile, changeTenant } = useAuth();
    const appTheme = useAppTheme();
    const paperTheme = usePaperTheme();
    
    // Controle de Abas: 'minhas' = quem acessa a minha estufa | 'parceiros' = estufas que eu acesso
    const [activeTab, setActiveTab] = useState('parceiros');

    // Estados para GERAÇÃO (Dono)
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
    const [loadingGen, setLoadingGen] = useState(false);

    // Estados para RESGATE (Convidado)
    const [inputCode, setInputCode] = useState('');
    const [loadingRedeem, setLoadingRedeem] = useState(false);

    // Lista de Compartilhamentos
    const [sharedTenants, setSharedTenants] = useState<Tenant[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const currentTenant = availableTenants.find((tenant) => tenant.uid === selectedTenantId) || null;

    useEffect(() => {
        if (activeTab === 'parceiros') {
            loadSharedList();
        }
        if (activeTab === 'minhas') {
            loadTenantMembers();
        }
    }, [activeTab, selectedTenantId, user?.uid]);

    const loadSharedList = async () => {
        if (!user) return;
        setLoadingList(true);
        try {
            const list = await getSharedTenants(user.uid);
            setSharedTenants(list);
        } catch (error) {
            console.error('Erro ao buscar parceiros:', error);
        } finally {
            setLoadingList(false);
        }
    };

    const loadTenantMembers = async () => {
        if (!user?.uid || !selectedTenantId) return;
        setLoadingMembers(true);
        try {
            const members = await listTenantMembers(selectedTenantId, user.uid);
            setTenantMembers(members.filter((member) => member.userId !== user.uid));
        } catch (error: any) {
            console.error('Erro ao buscar membros do tenant:', error);
            setTenantMembers([]);
            const msg = String(error?.message || '');
            if (msg.toLowerCase().includes('somente administradores')) {
                Alert.alert('Sem permissão', 'Apenas administradores deste tenant podem gerenciar parceiros.');
            }
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleGenerate = async () => {
        if (!user) return;
        const tenantParaCompartilhar = selectedTenantId || '';
        if (!tenantParaCompartilhar) {
            Alert.alert('Atenção', 'Selecione uma conta/tenant antes de gerar o convite.');
            return;
        }

        setLoadingGen(true);
        try {
            const tenantInfo = availableTenants.find((tenant) => tenant.uid === tenantParaCompartilhar);
            const tenantName = tenantInfo?.name || `Estufa de ${user.name || 'Produtor'}`;
            const code = await generateShareCode(tenantParaCompartilhar, tenantName, user.name || 'Produtor');
            setGeneratedCode(code);
            setGeneratedAt(new Date());
        } catch (error: any) {
            Alert.alert("Erro", error?.message || "Falha ao gerar código. Verifique sua conexão.");
        } finally {
            setLoadingGen(false);
        }
    };

    const handleRedeem = async () => {
        if (!inputCode) return Alert.alert("Atenção", "Digite o código de convite.");
        setLoadingRedeem(true);
        try {
            const tenantId = await redeemShareCode(inputCode, user!.uid);
            await refreshUserProfile();
            changeTenant(tenantId);
            Alert.alert("Sucesso!", "Acesso vinculado com sucesso!");
            setInputCode('');
            loadSharedList();
        } catch (error: any) {
            Alert.alert("Erro ao vincular", error.message);
        } finally {
            setLoadingRedeem(false);
        }
    };

    const handleCopyCode = async () => {
        if (!generatedCode) return;
        await Clipboard.setStringAsync(generatedCode);
        Alert.alert('Copiado', 'Código copiado para a área de transferência.');
    };

    const handleRemoveMember = (member: TenantMember) => {
        if (!user?.uid || !selectedTenantId) return;
        Alert.alert(
            'Remover parceiro',
            `Deseja remover ${member.name} desta estufa?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRemovingMemberId(member.userId);
                            await removeTenantMember(selectedTenantId, member.userId, user.uid);
                            await loadTenantMembers();
                            Alert.alert('Sucesso', 'Parceiro removido.');
                        } catch (error: any) {
                            Alert.alert('Erro', error?.message || 'Não foi possível remover o parceiro.');
                        } finally {
                            setRemovingMemberId(null);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (value?: string | number | { toDate?: () => Date }) => {
        if (!value) return 'Data desconhecida';
        const date = typeof value === 'number'
          ? new Date(value)
          : typeof value === 'string'
            ? new Date(value)
            : (value as any).toDate
              ? (value as any).toDate()
              : new Date();
        return date.toLocaleDateString('pt-BR');
    };

    const formatDateTime = (value?: string | number | { toDate?: () => Date }) => {
        if (!value) return 'Nao informado';
        const date = typeof value === 'number'
          ? new Date(value)
          : typeof value === 'string'
            ? new Date(value)
            : (value as any).toDate
              ? (value as any).toDate()
              : new Date();
        return date.toLocaleString('pt-BR');
    };

    const getRoleLabel = (role?: string) => {
        if (role === 'admin') return 'Administrador';
        if (role === 'operator') return 'Operador';
        return 'Convidado';
    };

    const formatPermissionsList = (permissions?: {
        canRead?: boolean;
        canWrite?: boolean;
        canDelete?: boolean;
        canManageSharing?: boolean;
    }) => {
        if (!permissions) return 'Não informado';
        const granted: string[] = [];
        if (permissions.canRead) granted.push('Leitura');
        if (permissions.canWrite) granted.push('Escrita');
        if (permissions.canDelete) granted.push('Exclusão');
        if (permissions.canManageSharing) granted.push('Compartilhar');
        return granted.length ? granted.join(' • ') : 'Sem permissões';
    };

    const filteredMembers = tenantMembers.filter((member) => {
        const query = memberSearch.trim().toLowerCase();
        if (!query) return true;
        return (
            member.name.toLowerCase().includes(query) ||
            String(member.email || '').toLowerCase().includes(query)
        );
    });

    const buildMemberAuditSummary = (member: TenantMember) => {
        const tenantName = currentTenant?.name || 'Tenant atual';
        return [
            'Resumo de acesso - Auditoria',
            `Tenant: ${tenantName}`,
            `Parceiro: ${member.name}`,
            `Email: ${member.email || 'Nao informado'}`,
            `Perfil: ${member.role}`,
            `Permissoes: leitura(${member.canRead ? 'sim' : 'nao'}), escrita(${member.canWrite ? 'sim' : 'nao'}), exclusao(${member.canDelete ? 'sim' : 'nao'}), compartilhar(${member.canManageSharing ? 'sim' : 'nao'})`,
            `Vinculado em: ${formatDateTime(member.sharedAt)}`,
            `Ultimo acesso: ${formatDateTime(member.lastAccessAt)}`,
        ].join('\n');
    };

    const handleCopyMemberSummary = async (member: TenantMember) => {
        const summary = buildMemberAuditSummary(member);
        await Clipboard.setStringAsync(summary);
        Alert.alert('Copiado', 'Resumo de acesso copiado para auditoria.');
    };

    // Card para a aba de Parceiros (Estufas que eu fui convidado)
    const renderParceiroItem = ({ item }: { item: Tenant }) => (
        <Card style={[styles.card, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} mode="outlined">
            <Card.Content style={styles.cardRow}>
                <Surface style={[styles.cardIcon, { backgroundColor: appTheme.infoSoft }]} elevation={0}>
                    <MaterialCommunityIcons name="account-group" size={24} color={appTheme.info} />
                </Surface>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: appTheme.textPrimary }]}>{item.name}</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: appTheme.textSecondary }]}>Proprietário</Text>
                        <Text style={[styles.detailValue, { color: appTheme.textPrimary }]}>{item.sharedBy || 'Parceiro'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: appTheme.textSecondary }]}>E-mail</Text>
                        <Text style={[styles.detailValue, { color: appTheme.textPrimary }]}>{item.sharedByEmail || 'Não informado'}</Text>
                    </View>
                    
                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="calendar-check" size={16} color={appTheme.textSecondary} />
                        <Text style={[styles.metaText, { color: appTheme.textSecondary }]}> 
                            Vinculado em: <Text style={[styles.bold, { color: appTheme.textPrimary }]}>{formatDate(item.sharedAt)}</Text>
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="shield-account" size={16} color={appTheme.textSecondary} />
                        <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>Meu perfil: </Text>
                        <View style={[styles.rolePill, { backgroundColor: appTheme.infoSoft, borderColor: appTheme.info }]}>
                            <Text style={[styles.rolePillText, { color: appTheme.info }]}>{getRoleLabel((item as any).role)}</Text>
                        </View>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: appTheme.textSecondary }]}>Permissões</Text>
                        <Text style={[styles.detailValue, { color: appTheme.textPrimary }]}>{formatPermissionsList(item.permissions)}</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: appTheme.pageBackground }]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                
                <View style={styles.header}>
                  <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveTab}
                    buttons={[
                      {
                        value: 'parceiros',
                        label: 'Parceiros',
                        icon: 'account-multiple-outline',
                        showSelectedCheck: true,
                      },
                      {
                        value: 'minhas',
                        label: 'Convidar',
                        icon: 'key-outline',
                        showSelectedCheck: true,
                      },
                    ]}
                    style={styles.segmented}
                    theme={{
                      colors: {
                        secondaryContainer: COLORS.primarySoft,
                        onSecondaryContainer: COLORS.primary,
                        outline: appTheme.border,
                      }
                    }}
                  />
                </View>

                <View style={styles.content}>
                    
                    {/* ABA: PARCEIROS (Contas de terceiros) */}
                    {activeTab === 'parceiros' && (
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionTitle, { color: appTheme.textPrimary }]}>Vincular Nova Conta</Text>
                            <Text style={[styles.subtitle, { color: appTheme.textSecondary }]}>Insira o código fornecido pelo proprietário da estufa.</Text>
                            
                            <View style={styles.redeemRow}>
                                <TextInput 
                                    mode="outlined"
                                    placeholder="Ex: 9F1A3B"
                                    value={inputCode}
                                    onChangeText={text => setInputCode(text.toUpperCase())}
                                    maxLength={SHARE_CODE_DEFAULT_LENGTH}
                                    autoCapitalize="characters"
                                    style={styles.redeemInput}
                                    outlineColor={appTheme.border}
                                    activeOutlineColor={appTheme.info}
                                />
                                <Button 
                                    mode="contained" 
                                    onPress={handleRedeem}
                                    loading={loadingRedeem}
                                    disabled={loadingRedeem}
                                    style={styles.redeemBtn}
                                    buttonColor={appTheme.info}
                                    contentStyle={{ height: 50 }}
                                >
                                    Vincular
                                </Button>
                            </View>

                            <Text style={[styles.sectionTitle, {marginTop: 30, marginBottom: 15, color: appTheme.textPrimary }]}>Acessos Ativos</Text>
                            {loadingList ? (
                                <ActivityIndicator style={{marginTop: 20}} color={appTheme.info} />
                            ) : (
                                <FlatList
                                    data={sharedTenants}
                                    keyExtractor={item => item.uid}
                                    renderItem={renderParceiroItem}
                                    ListEmptyComponent={
                                        <Surface style={[styles.emptyState, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} mode="flat">
                                            <MaterialCommunityIcons name="link-variant-off" size={48} color={appTheme.textSecondary} style={{ opacity: 0.3 }} />
                                            <Text style={[styles.emptyText, { color: appTheme.textSecondary }]}>Nenhum parceiro vinculado ainda.</Text>
                                        </Surface>
                                    }
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                />
                            )}
                        </View>
                    )}

                    {/* ABA: MINHA ESTUFA (Convidar terceiros) */}
                    {activeTab === 'minhas' && (
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            
                            <View style={styles.inviteHero}>
                                <Surface style={[styles.heroIconCircle, { backgroundColor: appTheme.successSoft }]} elevation={0}>
                                  <MaterialCommunityIcons name="shield-account-outline" size={48} color={appTheme.success} />
                                </Surface>
                                <Text style={[styles.sectionTitle, {marginTop: 20, textAlign: 'center', color: appTheme.textPrimary }]}>
                                  Compartilhar Minha Estufa
                                </Text>
                                <Text style={[styles.subtitle, {textAlign: 'center', color: appTheme.textSecondary, paddingHorizontal: 20}]}>
                                    Conceda acesso a colaboradores ou sócios para visualizar e registrar manejos em tempo real.
                                </Text>
                            </View>

                            {generatedCode ? (
                                <Card style={[styles.codeCard, { backgroundColor: appTheme.successSoft, borderColor: appTheme.success }]} mode="outlined">
                                    <Card.Content style={{ alignItems: 'center' }}>
                                      <MaterialCommunityIcons name="check-circle" size={40} color={appTheme.success} />
                                      <Text style={[styles.codeLabel, { color: appTheme.success }]}>Código Gerado com Sucesso</Text>
                                      <Text style={[styles.codeValue, { color: appTheme.textPrimary }]}>{generatedCode}</Text>
                                      <Text style={[styles.codeWarning, { color: appTheme.textSecondary }]}> 
                                        Compartilhe este código. Ele é válido por 24 horas.
                                      </Text>
                                      {generatedAt ? (
                                        <Text style={[styles.codeMeta, { color: appTheme.textSecondary }]}> 
                                          Gerado em: {generatedAt.toLocaleString('pt-BR')} | Expira em: {new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                                        </Text>
                                      ) : null}
                                      <Button
                                        mode="contained-tonal"
                                        onPress={handleCopyCode}
                                        icon="content-copy"
                                        style={{ marginTop: 12 }}
                                      >
                                        Copiar código
                                      </Button>
                                      
                                      <Button 
                                        mode="text" 
                                        onPress={() => {
                                          setGeneratedCode(null);
                                          setGeneratedAt(null);
                                        }}
                                        textColor={appTheme.success}
                                        style={{ marginTop: 10 }}
                                      >
                                        GERAR NOVO CÓDIGO
                                      </Button>
                                    </Card.Content>
                                </Card>
                            ) : (
                                <Button 
                                    mode="contained" 
                                    onPress={handleGenerate}
                                    loading={loadingGen}
                                    disabled={loadingGen}
                                    buttonColor={appTheme.success}
                                    style={styles.generateBtn}
                                    contentStyle={styles.generateBtnContent}
                                    labelStyle={styles.generateBtnLabel}
                                    icon="key-plus"
                                >
                                    GERAR CONVITE
                                </Button>
                            )}

                            <Text style={[styles.sectionTitle, { marginTop: 26, marginBottom: 12, color: appTheme.textPrimary }]}> 
                                Parceiros com acesso
                            </Text>

                            <TextInput
                                mode="outlined"
                                placeholder="Filtrar por nome ou e-mail"
                                value={memberSearch}
                                onChangeText={setMemberSearch}
                                left={<TextInput.Icon icon="magnify" />}
                                style={{ marginBottom: 10 }}
                                outlineColor={appTheme.border}
                                activeOutlineColor={appTheme.success}
                            />

                            <Surface style={[styles.tenantInfoCard, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="greenhouse" size={16} color={appTheme.textSecondary} />
                                    <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>Estufa compartilhada: <Text style={[styles.bold, { color: appTheme.textPrimary }]}>{currentTenant?.name || 'Tenant atual'}</Text></Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="account-tie" size={16} color={appTheme.textSecondary} />
                                    <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>Responsavel: <Text style={[styles.bold, { color: appTheme.textPrimary }]}>{currentTenant?.ownerName || user?.name || 'Nao informado'}</Text></Text>
                                </View>
                            </Surface>

                            {loadingMembers ? (
                                <ActivityIndicator style={{ marginTop: 14 }} color={appTheme.success} />
                            ) : filteredMembers.length === 0 ? (
                                <Surface style={[styles.emptyState, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} mode="flat">
                                    <MaterialCommunityIcons name="account-off-outline" size={44} color={appTheme.textSecondary} style={{ opacity: 0.35 }} />
                                    <Text style={[styles.emptyText, { color: appTheme.textSecondary }]}>{tenantMembers.length === 0 ? 'Nenhum parceiro ativo nesta estufa.' : 'Nenhum parceiro encontrado para o filtro.'}</Text>
                                </Surface>
                            ) : (
                                <View style={{ marginTop: 4, gap: 10 }}>
                                    {filteredMembers.map((member) => {
                                        const isRemoving = removingMemberId === member.userId;
                                        return (
                                            <Card
                                                key={member.userId}
                                                style={[styles.card, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]}
                                                mode="outlined"
                                            >
                                                <Card.Content style={styles.cardRow}>
                                                    <Surface style={[styles.cardIcon, { backgroundColor: appTheme.successSoft }]} elevation={0}>
                                                        <MaterialCommunityIcons name="account-check-outline" size={22} color={appTheme.success} />
                                                    </Surface>
                                                    <View style={styles.cardContent}>
                                                        <Text style={[styles.cardTitle, { color: appTheme.textPrimary }]}>{member.name}</Text>
                                                        {member.email ? (
                                                            <View style={styles.metaRow}>
                                                                <MaterialCommunityIcons name="email-outline" size={16} color={appTheme.textSecondary} />
                                                                <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>{member.email}</Text>
                                                            </View>
                                                        ) : null}
                                                        <View style={styles.metaRow}>
                                                            <MaterialCommunityIcons name="calendar-check" size={16} color={appTheme.textSecondary} />
                                                            <Text style={[styles.metaText, { color: appTheme.textSecondary }]}> 
                                                                Vinculado em: <Text style={[styles.bold, { color: appTheme.textPrimary }]}>{formatDate(member.sharedAt)}</Text>
                                                            </Text>
                                                        </View>
                                                        <View style={styles.metaRow}>
                                                            <MaterialCommunityIcons name="clock-outline" size={16} color={appTheme.textSecondary} />
                                                            <Text style={[styles.metaText, { color: appTheme.textSecondary }]}> 
                                                                Ultimo acesso: <Text style={[styles.bold, { color: appTheme.textPrimary }]}>{formatDate(member.lastAccessAt)}</Text>
                                                            </Text>
                                                        </View>
                                                        <View style={styles.metaRow}>
                                                            <MaterialCommunityIcons name="shield-account" size={16} color={appTheme.textSecondary} />
                                                            <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>Perfil: </Text>
                                                            <View style={[styles.rolePill, { backgroundColor: appTheme.successSoft, borderColor: appTheme.success }]}>
                                                                <Text style={[styles.rolePillText, { color: appTheme.success }]}>{getRoleLabel(member.role)}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.detailRow}>
                                                            <Text style={[styles.detailLabel, { color: appTheme.textSecondary }]}>Permissões</Text>
                                                            <Text style={[styles.detailValue, { color: appTheme.textPrimary }]}>{formatPermissionsList(member)}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                        <Button
                                                            mode="text"
                                                            icon="content-copy"
                                                            onPress={() => void handleCopyMemberSummary(member)}
                                                            compact
                                                        >
                                                            Copiar
                                                        </Button>
                                                        <Button
                                                            mode="text"
                                                            textColor={appTheme.danger}
                                                            onPress={() => handleRemoveMember(member)}
                                                            loading={isRemoving}
                                                            disabled={isRemoving}
                                                            compact
                                                        >
                                                            Remover
                                                        </Button>
                                                    </View>
                                                </Card.Content>
                                            </Card>
                                        );
                                    })}
                                </View>
                            )}

                        </ScrollView>
                    )}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
    segmented: { borderRadius: RADIUS.md },

    content: { padding: 24, flex: 1 },
    
    sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
    subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
    
    // REDEEM
    redeemRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    redeemInput: { flex: 1, backgroundColor: 'transparent' },
    redeemBtn: { borderRadius: RADIUS.md, marginTop: 6 },

    // LISTA
    card: { marginBottom: 12, borderRadius: RADIUS.lg, borderWidth: 1 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: { 
        width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    metaText: { fontSize: 13, marginLeft: 6 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
      gap: 10,
    },
    detailLabel: { fontSize: 12, fontWeight: '700' },
    detailValue: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
    bold: { fontWeight: '700' },
    rolePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    rolePillText: { fontSize: 11, fontWeight: '800' },

    emptyState: { 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 40, 
      borderRadius: RADIUS.xl, 
      borderStyle: 'dashed', 
      borderWidth: 2,
      marginTop: 20
    },
    emptyText: { textAlign: 'center', marginTop: 12, fontSize: 15, opacity: 0.7 },

    // INVITE
    inviteHero: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
    heroIconCircle: { width: 90, height: 90, borderRadius: RADIUS.xl, justifyContent: 'center', alignItems: 'center' },
    generateBtn: { borderRadius: RADIUS.md, marginTop: 10 },
    generateBtnContent: { height: 56 },
    generateBtnLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    
    // CODE
    codeCard: { borderRadius: RADIUS.xl, borderWidth: 1.5, marginTop: 10 },
    codeLabel: { fontSize: 14, fontWeight: '700', marginTop: 12, textTransform: 'uppercase' },
    codeValue: {
        fontSize: 34,
        fontWeight: '900',
        marginVertical: 16,
        letterSpacing: 4,
        textAlign: 'center',
    },
    codeWarning: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
    codeMeta: { fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    tenantInfoCard: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 10,
      ...SHADOWS.card,
    },
});
