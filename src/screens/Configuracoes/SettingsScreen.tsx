import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { auth, db } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { changeCurrentUserPassword } from '../../services/securityService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import SectionHeading from '../../components/ui/SectionHeading';
import { useFeedback } from '../../hooks/useFeedback';

const SettingsScreen = () => {
  const { user, isAdmin, refreshUserProfile } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const { showSuccess, showError, showWarning } = useFeedback();
  const netInfo = useNetInfo();

  const [nome, setNome] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [defaultCidade, setDefaultCidade] = useState('');
  const [defaultTipoCultivo, setDefaultTipoCultivo] = useState('');
  const [defaultCobertura, setDefaultCobertura] = useState('');
  const [savingDefaults, setSavingDefaults] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  const roleLabel = useMemo(() => (isAdmin ? 'Administrador' : 'Operador'), [isAdmin]);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      setLoadingProfile(true);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setNome(data.name || user.name || '');
          setEmail(data.email || user.email || '');
          setDefaultCidade(data.defaultCidade || '');
          setDefaultTipoCultivo(data.defaultTipoCultivo || '');
          setDefaultCobertura(data.defaultCobertura || '');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
  }, [user?.uid]);

  const handleSaveConta = async () => {
    if (!user?.uid) return;
    if (!nome.trim()) {
      showWarning('Informe um nome válido.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: nome.trim(),
        updatedAt: new Date(),
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: nome.trim() });
      }
      await refreshUserProfile();
      if (netInfo.isConnected === false) {
        showWarning('Sem internet: alterações salvas localmente. Sincronizando...');
      } else {
        showSuccess('Dados da conta atualizados.');
      }
    } catch (error) {
      console.error(error);
      showError('Não foi possível atualizar a conta.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!user?.uid) return;
    setSavingDefaults(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        defaultCidade: defaultCidade.trim(),
        defaultTipoCultivo: defaultTipoCultivo.trim(),
        defaultCobertura: defaultCobertura.trim(),
        updatedAt: new Date(),
      });
      if (netInfo.isConnected === false) {
        showWarning('Sem internet: alterações salvas localmente. Sincronizando...');
      } else {
        showSuccess('Configurações padrão de estufa atualizadas.');
      }
    } catch (error) {
      console.error(error);
      showError('Não foi possível salvar as configurações de estufa.');
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleAlterarSenha = async () => {
    if (!isAdmin) {
      showWarning('Somente administradores podem alterar a senha crítica.');
      return;
    }
    if (!senhaAtual || !senhaNova || !senhaConfirmacao) {
      showWarning('Preencha todos os campos de segurança.');
      return;
    }
    if (senhaNova.length < 6) {
      showWarning('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senhaNova !== senhaConfirmacao) {
      showWarning('A confirmação não confere.');
      return;
    }

    setSavingSecurity(true);
    try {
      await changeCurrentUserPassword(senhaAtual, senhaNova);
      setSenhaAtual('');
      setSenhaNova('');
      setSenhaConfirmacao('');
      if (netInfo.isConnected === false) {
        showWarning('Sem internet: alteração salva localmente. Sincronizando...');
      } else {
        showSuccess('Senha de administrador alterada com sucesso.');
      }
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        showError('Senha atual inválida.');
      } else {
        showError('Não foi possível alterar a senha.');
      }
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeading title="Configurações" subtitle="Conta, segurança e preferências do sistema" />

      <View style={styles.roleBadge}>
        <MaterialCommunityIcons name={isAdmin ? 'shield-account' : 'account'} size={16} color={COLORS.textLight} />
        <Text style={styles.roleBadgeText}>{roleLabel}</Text>
      </View>

      <View style={styles.card}>
        <SectionHeading title="Conta" subtitle="Dados básicos de acesso" />
        {loadingProfile ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Seu nome" />

            <Text style={styles.label}>E-mail</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveConta} disabled={savingProfile}>
              {savingProfile ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.primaryBtnText}>Salvar Conta</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <SectionHeading title="Segurança" subtitle="Senha de administrador para ações críticas" />
        <Text style={styles.securityInfo}>
          A exclusão de estufa e operações críticas exigem validação da senha do administrador.
        </Text>
        <Text style={styles.label}>Senha atual</Text>
        <TextInput style={styles.input} value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry />
        <Text style={styles.label}>Nova senha</Text>
        <TextInput style={styles.input} value={senhaNova} onChangeText={setSenhaNova} secureTextEntry />
        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput style={styles.input} value={senhaConfirmacao} onChangeText={setSenhaConfirmacao} secureTextEntry />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAlterarSenha} disabled={savingSecurity || !isAdmin}>
          {savingSecurity ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.primaryBtnText}>{isAdmin ? 'Atualizar Senha Admin' : 'Apenas Administrador'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <SectionHeading title="Estufa" subtitle="Configurações padrão para novos cadastros" />
        <Text style={styles.label}>Cidade padrão</Text>
        <TextInput style={styles.input} value={defaultCidade} onChangeText={setDefaultCidade} placeholder="Ex: Jales - SP" />
        <Text style={styles.label}>Tipo de cultivo padrão</Text>
        <TextInput style={styles.input} value={defaultTipoCultivo} onChangeText={setDefaultTipoCultivo} placeholder="Ex: Hidroponia" />
        <Text style={styles.label}>Cobertura padrão</Text>
        <TextInput style={styles.input} value={defaultCobertura} onChangeText={setDefaultCobertura} placeholder="Ex: Filme difusor" />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDefaults} disabled={savingDefaults}>
          {savingDefaults ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.primaryBtnText}>Salvar Padrões</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <SectionHeading title="Notificações" subtitle="Ajuste alertas do dia a dia" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Alertas críticos de estufa</Text>
          <Switch
            value={settings.notifyCritical}
            onValueChange={(value) => updateSettings({ notifyCritical: value })}
            trackColor={{ false: COLORS.borderDark, true: COLORS.primaryLight }}
            thumbColor={settings.notifyCritical ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Resumo diário</Text>
          <Switch
            value={settings.notifyDailySummary}
            onValueChange={(value) => updateSettings({ notifyDailySummary: value })}
            trackColor={{ false: COLORS.borderDark, true: COLORS.primaryLight }}
            thumbColor={settings.notifyDailySummary ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeading title="Aparência" subtitle="Personalize o visual do aplicativo" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Modo escuro (experimental)</Text>
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => updateSettings({ darkMode: value })}
            trackColor={{ false: COLORS.borderDark, true: COLORS.primaryLight }}
            thumbColor={settings.darkMode ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <Text style={styles.helpText}>O modo escuro já é aplicado nas telas principais de operação.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: SPACING.md,
    gap: 6,
  },
  roleBadgeText: { color: COLORS.textLight, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    height: 46,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  inputDisabled: { color: COLORS.textMuted },
  securityInfo: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
  primaryBtn: {
    height: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: COLORS.textLight, fontWeight: '700', fontSize: 14 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.body, fontWeight: '600', flex: 1, marginRight: 10 },
  helpText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 12 },
});

export default SettingsScreen;
