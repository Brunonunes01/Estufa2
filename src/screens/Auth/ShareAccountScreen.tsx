import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  Button,
  Card,
  SegmentedButtons,
  Surface,
  TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import {
  generateShareCode,
  getSharedTenants,
  listTenantMembers,
  redeemShareCode,
  removeTenantMember,
  SHARE_CODE_DEFAULT_LENGTH,
  ShareAccessProfile,
  TenantMember,
  updateTenantMemberProfile,
} from '../../services/shareService';
import { Tenant } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

type ShareTab = 'parceiros' | 'minhas';

type InfoItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  appTheme: ReturnType<typeof useAppTheme>;
};

const InfoItem = ({ icon, label, value, appTheme }: InfoItemProps) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIconBox, { backgroundColor: appTheme.surfaceMuted }]}>
      <MaterialCommunityIcons name={icon} size={16} color={appTheme.textSecondary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.infoLabel, { color: appTheme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: appTheme.textPrimary }]}>{value}</Text>
    </View>
  </View>
);

export default function ShareAccountScreen() {
  const {
    user,
    selectedTenantId,
    availableTenants,
    refreshUserProfile,
    changeTenant,
    isOwner,
    canManageSharing,
    canInviteManager,
    accessRoleLabel,
  } = useAuth();
  const appTheme = useAppTheme();

  const [activeTab, setActiveTab] = useState<ShareTab>('parceiros');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [inviteProfile, setInviteProfile] = useState<ShareAccessProfile>('operator');
  const [inputCode, setInputCode] = useState('');
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [sharedTenants, setSharedTenants] = useState<Tenant[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingMemberProfile, setUpdatingMemberProfile] = useState<{ userId: string; profile: ShareAccessProfile } | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const currentTenant = availableTenants.find((tenant) => tenant.uid === selectedTenantId) || null;

  useEffect(() => {
    if (activeTab === 'parceiros') {
      void loadSharedList();
    }
    if (activeTab === 'minhas') {
      void loadTenantMembers();
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
        Alert.alert('Sem permissao', 'Apenas administradores deste tenant podem gerenciar parceiros.');
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    const tenantParaCompartilhar = selectedTenantId || '';
    if (!tenantParaCompartilhar) {
      Alert.alert('Atenção', 'Selecione uma conta antes de gerar o convite.');
      return;
    }

    setLoadingGen(true);
    try {
      const tenantInfo = availableTenants.find((tenant) => tenant.uid === tenantParaCompartilhar);
      const tenantName = tenantInfo?.name || `Estufa de ${user.name || 'Produtor'}`;
      const code = await generateShareCode(tenantParaCompartilhar, tenantName, user.name || 'Produtor', inviteProfile);
      setGeneratedCode(code);
      setGeneratedAt(new Date());
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao gerar código.');
    } finally {
      setLoadingGen(false);
    }
  };

  const handleRedeem = async () => {
    if (!inputCode) {
      Alert.alert('Atenção', 'Digite o código de convite.');
      return;
    }
    setLoadingRedeem(true);
    try {
      const tenantId = await redeemShareCode(inputCode, user!.uid);
      await refreshUserProfile();
      changeTenant(tenantId);
      Alert.alert('Sucesso', 'Acesso vinculado com sucesso.');
      setInputCode('');
      await loadSharedList();
    } catch (error: any) {
      Alert.alert('Erro ao vincular', error.message);
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
    Alert.alert('Remover parceiro', `Deseja remover ${member.name} desta estufa?`, [
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
    ]);
  };

  const handleChangeMemberProfile = (member: TenantMember, profile: ShareAccessProfile) => {
    if (!user?.uid || !selectedTenantId) return;
    const profileLabel = getShareProfileLabel(profile);
    Alert.alert('Alterar perfil', `Deseja alterar ${member.name} para ${profileLabel}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Alterar',
        onPress: async () => {
          try {
            setUpdatingMemberProfile({ userId: member.userId, profile });
            await updateTenantMemberProfile(selectedTenantId, member.userId, user.uid, profile);
            await loadTenantMembers();
            Alert.alert('Sucesso', `Perfil alterado para ${profileLabel}.`);
          } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível alterar o perfil do parceiro.');
          } finally {
            setUpdatingMemberProfile(null);
          }
        },
      },
    ]);
  };

  const formatDate = (value?: string | number | { toDate?: () => Date }) => {
    if (!value) return 'Data desconhecida';
    const date =
      typeof value === 'number'
        ? new Date(value)
        : typeof value === 'string'
          ? new Date(value)
          : (value as any).toDate
            ? (value as any).toDate()
            : new Date();
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (value?: string | number | { toDate?: () => Date }) => {
    if (!value) return 'Não informado';
    const date =
      typeof value === 'number'
        ? new Date(value)
        : typeof value === 'string'
          ? new Date(value)
          : (value as any).toDate
            ? (value as any).toDate()
            : new Date();
    return date.toLocaleString('pt-BR');
  };

  const getShareProfileLabel = (profile: ShareAccessProfile) => {
    if (profile === 'manager') return 'Gerente';
    if (profile === 'operator') return 'Operador';
    return 'Relatórios';
  };

  const getMemberRoleLabel = (role?: string) => {
    if (role === 'admin') return 'Gerente';
    if (role === 'operator') return 'Operador';
    return 'Relatórios';
  };

  const getMemberProfile = (member: TenantMember): ShareAccessProfile => {
    if (member.role === 'admin') return 'manager';
    if (member.role === 'operator') return 'operator';
    return 'viewer';
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
    if (permissions.canDelete) granted.push('Exclusao');
    if (permissions.canManageSharing) granted.push('Compartilhar');
    return granted.length ? granted.join(' • ') : 'Sem permissões';
  };

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return tenantMembers;
    return tenantMembers.filter((member) => {
      return member.name.toLowerCase().includes(query) || String(member.email || '').toLowerCase().includes(query);
    });
  }, [memberSearch, tenantMembers]);

  const buildMemberAuditSummary = (member: TenantMember) => {
    const tenantName = currentTenant?.name || 'Tenant atual';
    return [
      'Resumo de acesso - Auditoria',
      `Tenant: ${tenantName}`,
      `Parceiro: ${member.name}`,
      `Email: ${member.email || 'Não informado'}`,
      `Perfil: ${member.role}`,
      `Permissões: leitura(${member.canRead ? 'sim' : 'não'}), escrita(${member.canWrite ? 'sim' : 'não'}), exclusão(${member.canDelete ? 'sim' : 'não'}), compartilhar(${member.canManageSharing ? 'sim' : 'não'})`,
      `Vinculado em: ${formatDateTime(member.sharedAt)}`,
      `Último acesso: ${formatDateTime(member.lastAccessAt)}`,
    ].join('\n');
  };

  const handleCopyMemberSummary = async (member: TenantMember) => {
    await Clipboard.setStringAsync(buildMemberAuditSummary(member));
    Alert.alert('Copiado', 'Resumo de acesso copiado para auditoria.');
  };

  const canRemoveMember = (member: TenantMember) => {
    if (!canManageSharing) return false;
    if (member.role === 'admin' && !isOwner) return false;
    return true;
  };

  const canChangeMemberProfile = (member: TenantMember, profile: ShareAccessProfile) => {
    if (!canManageSharing) return false;
    if (getMemberProfile(member) === profile) return false;
    if (profile === 'manager' && !isOwner) return false;
    if (member.role === 'admin' && !isOwner) return false;
    return true;
  };

  const inviteProfileDescription =
    inviteProfile === 'manager'
      ? 'Gerente pode compartilhar acessos e administrar a operação.'
      : inviteProfile === 'operator'
        ? 'Operador registra dados e executa a rotina diária.'
        : 'Relatórios acessa informações sem alterar a operação.';

  const sharedAccountsSummary = `${sharedTenants.length} ${sharedTenants.length === 1 ? 'conta vinculada' : 'contas vinculadas'}`;
  const membersSummary = `${filteredMembers.length} ${filteredMembers.length === 1 ? 'parceiro visível' : 'parceiros visíveis'}`;

  const renderSharedTenantCard = (item: Tenant) => (
    <Card
      key={item.uid}
      style={[styles.recordCard, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]}
      mode="outlined"
    >
      <Card.Content style={styles.recordCardContent}>
        <View style={styles.recordHeader}>
          <View style={[styles.recordAvatar, { backgroundColor: appTheme.infoSoft }]}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={appTheme.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recordTitle, { color: appTheme.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.recordSubtitle, { color: appTheme.textSecondary }]}>
              Compartilhado por {item.sharedBy || 'Parceiro'}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: appTheme.infoSoft, borderColor: appTheme.info }]}>
            <Text style={[styles.roleBadgeText, { color: appTheme.info }]}>{getMemberRoleLabel((item as any).role)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoItem icon="email-outline" label="E-mail do responsável" value={item.sharedByEmail || 'Não informado'} appTheme={appTheme} />
          <InfoItem icon="calendar-check-outline" label="Vinculado em" value={formatDate(item.sharedAt)} appTheme={appTheme} />
        </View>

        <Surface style={[styles.permissionsBox, { backgroundColor: appTheme.surfaceMuted }]} elevation={0}>
          <Text style={[styles.permissionsTitle, { color: appTheme.textSecondary }]}>Permissões recebidas</Text>
          <Text style={[styles.permissionsValue, { color: appTheme.textPrimary }]}>{formatPermissionsList(item.permissions)}</Text>
        </Surface>
      </Card.Content>
    </Card>
  );

  const renderMemberCard = (member: TenantMember) => {
    const isRemoving = removingMemberId === member.userId;
    const isUpdating = updatingMemberProfile?.userId === member.userId;

    return (
      <Card
        key={member.userId}
        style={[styles.recordCard, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]}
        mode="outlined"
      >
        <Card.Content style={styles.recordCardContent}>
          <View style={styles.recordHeader}>
            <View style={[styles.recordAvatar, { backgroundColor: appTheme.successSoft }]}>
              <MaterialCommunityIcons name="account-check-outline" size={20} color={appTheme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recordTitle, { color: appTheme.textPrimary }]}>{member.name}</Text>
              <Text style={[styles.recordSubtitle, { color: appTheme.textSecondary }]}>{member.email || 'E-mail não informado'}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: appTheme.successSoft, borderColor: appTheme.success }]}>
              <Text style={[styles.roleBadgeText, { color: appTheme.success }]}>{getMemberRoleLabel(member.role)}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoItem icon="calendar-check-outline" label="Vinculado em" value={formatDate(member.sharedAt)} appTheme={appTheme} />
            <InfoItem icon="clock-outline" label="Último acesso" value={formatDate(member.lastAccessAt)} appTheme={appTheme} />
          </View>

          <Surface style={[styles.permissionsBox, { backgroundColor: appTheme.surfaceMuted }]} elevation={0}>
            <Text style={[styles.permissionsTitle, { color: appTheme.textSecondary }]}>Permissões</Text>
            <Text style={[styles.permissionsValue, { color: appTheme.textPrimary }]}>{formatPermissionsList(member)}</Text>
          </Surface>

          <View style={styles.memberActionSection}>
            <Text style={[styles.actionSectionTitle, { color: appTheme.textPrimary }]}>Alterar perfil</Text>
            <View style={styles.memberProfilesWrap}>
              {(['manager', 'operator', 'viewer'] as ShareAccessProfile[]).map((profile) => (
                <Button
                  key={profile}
                  mode={getMemberProfile(member) === profile ? 'contained-tonal' : 'outlined'}
                  onPress={() => handleChangeMemberProfile(member, profile)}
                  disabled={!canChangeMemberProfile(member, profile) || isUpdating || isRemoving}
                  loading={isUpdating && updatingMemberProfile?.profile === profile}
                  compact
                  style={styles.actionChip}
                  contentStyle={styles.actionChipContent}
                  labelStyle={styles.actionChipLabel}
                >
                  {getShareProfileLabel(profile)}
                </Button>
              ))}
            </View>

            <View style={styles.memberFooterActions}>
              <Button mode="text" icon="content-copy" onPress={() => void handleCopyMemberSummary(member)} compact>
                Copiar resumo
              </Button>
              {canRemoveMember(member) ? (
                <Button
                  mode="text"
                  textColor={appTheme.danger}
                  onPress={() => handleRemoveMember(member)}
                  loading={isRemoving}
                  disabled={isRemoving}
                  compact
                >
                  Remover acesso
                </Button>
              ) : (
                <Text style={[styles.lockedActionText, { color: appTheme.textSecondary }]}>
                  Só o proprietário remove gerente
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.pageBackground }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: appTheme.textPrimary }]}>Compartilhamento</Text>
          <Text style={[styles.screenSubtitle, { color: appTheme.textSecondary }]}>
            Veja quem compartilha com voce e gerencie quem acessa sua conta ativa.
          </Text>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ShareTab)}
            buttons={[
              {
                value: 'parceiros',
                label: 'Acessos recebidos',
                icon: 'account-multiple-outline',
                showSelectedCheck: true,
              },
              {
                value: 'minhas',
                label: 'Minha conta',
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
              },
            }}
          />
        </View>

        {activeTab === 'parceiros' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Surface style={[styles.summaryPanel, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: appTheme.infoSoft }]}>
                  <MaterialCommunityIcons name="account-switch-outline" size={20} color={appTheme.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryTitle, { color: appTheme.textPrimary }]}>Contas que voce acessa</Text>
                  <Text style={[styles.summaryText, { color: appTheme.textSecondary }]}>
                    {sharedAccountsSummary}
                  </Text>
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={[styles.blockTitle, { color: appTheme.textPrimary }]}>Vincular nova conta</Text>
                <Text style={[styles.blockSubtitle, { color: appTheme.textSecondary }]}>
                  Insira o código fornecido pelo proprietário da estufa.
                </Text>
                <TextInput
                  mode="outlined"
                  label="Código de convite"
                  placeholder="Ex: 9F1A3B..."
                  value={inputCode}
                  onChangeText={(text) => setInputCode(text.toUpperCase())}
                  maxLength={SHARE_CODE_DEFAULT_LENGTH}
                  autoCapitalize="characters"
                  style={styles.redeemInputFull}
                  outlineColor={appTheme.border}
                  activeOutlineColor={appTheme.info}
                  right={<TextInput.Icon icon="key-outline" />}
                />
                <Button
                  mode="contained"
                  onPress={handleRedeem}
                  loading={loadingRedeem}
                  disabled={loadingRedeem}
                  style={styles.primaryButton}
                  buttonColor={appTheme.info}
                  contentStyle={styles.primaryButtonContent}
                >
                  Vincular conta
                </Button>
              </View>
            </Surface>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: appTheme.textPrimary }]}>Acessos ativos</Text>
              <Text style={[styles.sectionCounter, { color: appTheme.textSecondary }]}>{sharedAccountsSummary}</Text>
            </View>

            {loadingList ? (
              <View style={styles.loadingWrap}>
                <Button loading mode="text">
                  Carregando
                </Button>
              </View>
            ) : sharedTenants.length === 0 ? (
              <Surface style={[styles.emptyState, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
                <MaterialCommunityIcons name="link-variant-off" size={44} color={appTheme.textSecondary} style={{ opacity: 0.35 }} />
                <Text style={[styles.emptyTitle, { color: appTheme.textPrimary }]}>Nenhum acesso recebido</Text>
                <Text style={[styles.emptyText, { color: appTheme.textSecondary }]}>
                  Quando você vincular uma conta, os dados do proprietário e seu perfil aparecerão aqui.
                </Text>
              </Surface>
            ) : (
              sharedTenants.map(renderSharedTenantCard)
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Surface style={[styles.summaryPanel, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: appTheme.successSoft }]}>
                  <MaterialCommunityIcons name="shield-account-outline" size={20} color={appTheme.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryTitle, { color: appTheme.textPrimary }]}>Conta ativa para compartilhamento</Text>
                  <Text style={[styles.summaryText, { color: appTheme.textSecondary }]}>
                    {currentTenant?.name || 'Nenhuma conta selecionada'}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: appTheme.successSoft, borderColor: appTheme.success }]}>
                  <Text style={[styles.roleBadgeText, { color: appTheme.success }]}>{accessRoleLabel}</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <InfoItem icon="greenhouse" label="Conta compartilhada" value={currentTenant?.name || 'Tenant atual'} appTheme={appTheme} />
                <InfoItem
                  icon="account-tie-outline"
                  label="Responsável"
                  value={currentTenant?.ownerName || user?.name || 'Não informado'}
                  appTheme={appTheme}
                />
              </View>

              <Surface style={[styles.noticeBox, { backgroundColor: appTheme.surfaceMuted }]} elevation={0}>
                <MaterialCommunityIcons
                  name={canManageSharing ? 'check-decagram-outline' : 'lock-outline'}
                  size={18}
                  color={canManageSharing ? appTheme.success : appTheme.textSecondary}
                />
                <Text style={[styles.noticeText, { color: appTheme.textSecondary }]}>
                  {canManageSharing
                    ? 'Voce pode gerar convites e gerenciar os parceiros desta conta.'
                    : 'Somente proprietário e gerente autorizado podem gerar convites e gerenciar parceiros deste tenant.'}
                </Text>
              </Surface>
            </Surface>

            <Surface style={[styles.panel, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
              <Text style={[styles.blockTitle, { color: appTheme.textPrimary }]}>Gerar convite</Text>
              <Text style={[styles.blockSubtitle, { color: appTheme.textSecondary }]}>
                Defina o perfil de acesso antes de compartilhar o código.
              </Text>

              <SegmentedButtons
                value={inviteProfile}
                onValueChange={(value) => setInviteProfile(value as ShareAccessProfile)}
                buttons={[
                  { value: 'manager', label: 'Gerente', disabled: !canInviteManager },
                  { value: 'operator', label: 'Operador' },
                  { value: 'viewer', label: 'Relatórios' },
                ]}
                style={styles.segmented}
                theme={{
                  colors: {
                    secondaryContainer: COLORS.successSoft,
                    onSecondaryContainer: COLORS.success,
                    outline: appTheme.border,
                  },
                }}
              />

              <Surface style={[styles.profileHintBox, { backgroundColor: appTheme.surfaceMuted }]} elevation={0}>
                <Text style={[styles.profileHintTitle, { color: appTheme.textPrimary }]}>
                  Perfil selecionado: {getShareProfileLabel(inviteProfile)}
                </Text>
                <Text style={[styles.profileHintText, { color: appTheme.textSecondary }]}>{inviteProfileDescription}</Text>
              </Surface>

              {generatedCode ? (
                <Card style={[styles.codeCard, { backgroundColor: appTheme.successSoft, borderColor: appTheme.success }]} mode="outlined">
                  <Card.Content>
                    <Text style={[styles.codeLabel, { color: appTheme.success }]}>Código ativo</Text>
                    <Text style={[styles.codeValue, { color: appTheme.textPrimary }]}>{generatedCode}</Text>
                    <Text style={[styles.codeWarning, { color: appTheme.textSecondary }]}>
                      Compartilhe este código apenas com a pessoa que deve acessar sua conta.
                    </Text>
                    {generatedAt ? (
                      <Text style={[styles.codeMeta, { color: appTheme.textSecondary }]}>
                        Gerado em {generatedAt.toLocaleString('pt-BR')}
                      </Text>
                    ) : null}
                    <Button mode="contained-tonal" onPress={handleCopyCode} icon="content-copy" style={{ marginTop: 12 }}>
                      Copiar código
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => {
                        setGeneratedCode(null);
                        setGeneratedAt(null);
                      }}
                      textColor={appTheme.success}
                      style={{ marginTop: 8 }}
                    >
                      Gerar novo código
                    </Button>
                  </Card.Content>
                </Card>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleGenerate}
                  loading={loadingGen}
                  disabled={loadingGen || !canManageSharing}
                  buttonColor={appTheme.success}
                  style={styles.primaryButton}
                  contentStyle={styles.primaryButtonContent}
                  icon="key-plus"
                >
                  Gerar convite {getShareProfileLabel(inviteProfile).toLowerCase()}
                </Button>
              )}
            </Surface>

            <Surface style={[styles.panel, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]} elevation={0}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: appTheme.textPrimary }]}>Parceiros com acesso</Text>
                  <Text style={[styles.sectionCounter, { color: appTheme.textSecondary }]}>{membersSummary}</Text>
                </View>
              </View>

              <TextInput
                mode="outlined"
                label="Filtrar parceiros"
                placeholder="Nome ou e-mail"
                value={memberSearch}
                onChangeText={setMemberSearch}
                left={<TextInput.Icon icon="magnify" />}
                style={{ marginBottom: 10 }}
                outlineColor={appTheme.border}
                activeOutlineColor={appTheme.success}
              />

              {loadingMembers ? (
                <View style={styles.loadingWrap}>
                  <Button loading mode="text">
                    Carregando
                  </Button>
                </View>
              ) : filteredMembers.length === 0 ? (
                <Surface style={[styles.emptyState, { backgroundColor: appTheme.surfaceMuted, borderColor: appTheme.border }]} elevation={0}>
                  <MaterialCommunityIcons name="account-off-outline" size={44} color={appTheme.textSecondary} style={{ opacity: 0.35 }} />
                  <Text style={[styles.emptyTitle, { color: appTheme.textPrimary }]}>
                    {tenantMembers.length === 0 ? 'Nenhum parceiro ativo' : 'Nenhum parceiro encontrado'}
                  </Text>
                  <Text style={[styles.emptyText, { color: appTheme.textSecondary }]}>
                    {tenantMembers.length === 0
                      ? 'Quando você compartilhar esta conta, os parceiros aparecerão aqui com perfil e permissões.'
                      : 'Ajuste o filtro para encontrar o parceiro desejado.'}
                  </Text>
                </Surface>
              ) : (
                filteredMembers.map(renderMemberCard)
              )}
            </Surface>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  segmented: {
    borderRadius: RADIUS.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl + 20,
    gap: 14,
  },
  summaryPanel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  panel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    ...SHADOWS.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryText: {
    fontSize: 13,
    marginTop: 2,
  },
  inputBlock: {
    gap: 8,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  blockSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  redeemInputFull: {
    backgroundColor: 'transparent',
  },
  primaryButton: {
    borderRadius: RADIUS.md,
    marginTop: 2,
  },
  primaryButtonContent: {
    height: 52,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  sectionCounter: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  recordCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: 10,
  },
  recordCardContent: {
    gap: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  permissionsBox: {
    borderRadius: RADIUS.md,
    padding: 12,
  },
  permissionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  permissionsValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  noticeBox: {
    marginTop: 2,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  profileHintBox: {
    marginTop: 12,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  profileHintTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileHintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  codeCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginTop: 14,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 14,
    textAlign: 'center',
    letterSpacing: 3,
  },
  codeWarning: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  codeMeta: {
    marginTop: 8,
    fontSize: 11,
    textAlign: 'center',
  },
  memberActionSection: {
    gap: 10,
  },
  actionSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  memberProfilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    borderRadius: 999,
  },
  actionChipContent: {
    minHeight: 34,
    paddingHorizontal: 4,
  },
  actionChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 6,
  },
  memberFooterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lockedActionText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 170,
    textAlign: 'right',
  },
  emptyState: {
    marginTop: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
});
