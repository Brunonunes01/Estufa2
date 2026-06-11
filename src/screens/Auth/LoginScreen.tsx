import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/theme';
import { resetPasswordForEmailBridge, signInWithPasswordBridge } from '../../services/authBridge';
import {
  getSavedLoginAccounts,
  removeSavedLoginAccount,
  saveLoginAccount,
  SavedLoginAccount,
} from '../../services/savedLoginAccounts';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedLoginAccount[]>([]);

  useEffect(() => {
    const loadSavedAccounts = async () => {
      const accounts = await getSavedLoginAccounts();
      setSavedAccounts(accounts);

      if (accounts.length > 0) {
        setEmail((currentEmail) => currentEmail || accounts[0].email);
      }
    };

    void loadSavedAccounts();
  }, []);

  const handleLogin = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithPasswordBridge(normalizedEmail, password);
      const accounts = await saveLoginAccount(normalizedEmail);
      setSavedAccounts(accounts);
    } catch (err: any) {
      let msg = 'Erro ao entrar.';
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.message?.toLowerCase?.().includes('invalid login credentials')
      ) {
        msg = 'Credenciais inválidas. Verifique e-mail e senha.';
      }
      setError(msg);
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }

    try {
      await resetPasswordForEmailBridge(normalizedEmail);
      Alert.alert('Recuperação de senha', 'Enviamos um link de redefinição para o e-mail informado.');
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível enviar o link de redefinição de senha.';
      setError(msg);
      Alert.alert('Erro', msg);
    }
  };

  const handleSelectSavedAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword('');
    setError('');
  };

  const handleRemoveSavedAccount = async (accountEmail: string) => {
    const accounts = await removeSavedLoginAccount(accountEmail);
    setSavedAccounts(accounts);

    if (email.trim().toLowerCase() === accountEmail.toLowerCase()) {
      setEmail(accounts[0]?.email || '');
      setPassword('');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoArea}>
            <Text style={styles.kicker}>Acesso</Text>
            <Text style={styles.title}>
              AgroGestao <Text style={styles.titleLight}>Rural</Text>
            </Text>
            <Text style={styles.subtitle}>
              Entre para gerenciar estufas, plantios e vendas com mais clareza.
            </Text>
          </View>
        </View>

        <View style={styles.formArea}>
          {savedAccounts.length > 0 ? (
            <View style={styles.savedAccountsSection}>
              <Text style={styles.savedAccountsTitle}>Contas salvas neste aparelho</Text>
              <Text style={styles.savedAccountsSubtitle}>Toque para preencher o e-mail mais rapido.</Text>
              <View style={styles.savedAccountsList}>
                {savedAccounts.map((account) => {
                  const isSelected = email.trim().toLowerCase() === account.email;

                  return (
                    <View
                      key={account.email}
                      style={[styles.savedAccountChip, isSelected ? styles.savedAccountChipSelected : null]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.savedAccountMain}
                        onPress={() => handleSelectSavedAccount(account.email)}
                      >
                        <View style={styles.savedAccountAvatar}>
                          <Feather name="user" size={15} color="#0F5A1C" />
                        </View>
                        <Text style={styles.savedAccountText} numberOfLines={1}>
                          {account.email}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.savedAccountRemove}
                        onPress={() => handleRemoveSavedAccount(account.email)}
                      >
                        <Feather name="x" size={14} color="#6E7E71" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.inputBox}>
            <View style={styles.iconBox}>
              <Feather name="mail" size={18} color="#0F5A1C" />
            </View>
            <TextInput
              placeholder="E-mail"
              placeholderTextColor="#777C82"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputBox}>
            <View style={styles.iconBox}>
              <Feather name="lock" size={18} color="#0F5A1C" />
            </View>
            <TextInput
              placeholder="Senha"
              placeholderTextColor="#777C82"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#0F5A1C" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity activeOpacity={0.88} style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <Feather name="log-in" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Entrar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.forgotArea} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <View style={styles.dividerArea}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity activeOpacity={0.88} style={styles.registerBox} onPress={() => navigation.navigate('Register')}>
            <View style={styles.userCircle}>
              <Feather name="user-plus" size={18} color="#0F5A1C" />
            </View>
            <Text style={styles.registerText}>
              Não tem conta? <Text style={styles.registerLink}>Cadastre-se</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    minHeight: '100%',
    backgroundColor: '#FFFFFF',
  },
  hero: {
    width: '100%',
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F4F8EF',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 24,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#4B6A53',
    marginBottom: 8,
  },
  title: {
    fontSize: width < 390 ? 26 : 29,
    fontWeight: '800',
    color: '#063F13',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  titleLight: {
    color: '#35901F',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#53605B',
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '400',
    maxWidth: 300,
  },
  formArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    marginTop: -12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  savedAccountsSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F4F8EF',
    borderWidth: 1,
    borderColor: '#D8E6D1',
  },
  savedAccountsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#153E1F',
  },
  savedAccountsSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#58705F',
  },
  savedAccountsList: {
    marginTop: 12,
    rowGap: 10,
  },
  savedAccountChip: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1DFCB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
  },
  savedAccountChipSelected: {
    borderColor: '#218119',
    backgroundColor: '#F7FFF5',
  },
  savedAccountMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedAccountAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E5',
    marginRight: 10,
  },
  savedAccountText: {
    flex: 1,
    fontSize: 14,
    color: '#24402A',
    fontWeight: '600',
  },
  savedAccountRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#B5CDAA',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F2F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#303030',
    paddingVertical: 0,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  errorBox: {
    marginTop: -2,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#C93B3B',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    height: 52,
    backgroundColor: '#218119',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 10,
    marginTop: 6,
    shadowColor: '#1B6E14',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotArea: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotText: {
    color: '#0F5A1C',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    columnGap: 12,
  },
  dividerText: {
    fontSize: 13,
    color: '#7A8B7F',
    fontWeight: '600',
  },
  line: {
    height: 1,
    width: width < 390 ? 58 : 74,
    backgroundColor: '#C7D6C0',
  },
  registerBox: {
    minHeight: 58,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F4F8EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  userCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  registerText: {
    fontSize: 14,
    color: '#202020',
  },
  registerLink: {
    color: '#0F6B1D',
    fontWeight: '700',
  },
});

export default LoginScreen;
