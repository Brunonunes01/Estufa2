// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, TextInput, Text, ActivityIndicator, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import useGoogleAuth from '../../hooks/useGoogleAuth';
import { signInWithPasswordBridge } from '../../services/authBridge';
import { isSupabaseBackend } from '../../services/backendConfig';

const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  const supabaseMode = isSupabaseBackend();
  const { signInWithGoogle, loadingGoogle, googleDisabled } = useGoogleAuth({
    onError: (message) => {
      setError(message);
      Alert.alert('Erro', message);
    },
  });

  const handleLogin = async () => {
    setError('');
    setLoading(true); 

    if (!email || !password) {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }
    
    try {
      await signInWithPasswordBridge(email.trim(), password);
    } catch (err: any) {
      let msg = 'Erro ao tentar logar.';
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + SPACING.xl, 42) }]}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.heroCard}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                  <MaterialCommunityIcons name="greenhouse" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.appName}>AgroGestão</Text>
                <Text style={styles.appSub}>Monitoramento inteligente da estufa</Text>
                <View style={styles.badgeRow}>
                  <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.badgeText}>Novo layout de acesso</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Entrar na sua conta</Text>
                <Text style={styles.cardSubtitle}>Use suas credenciais para acessar o painel da estufa.</Text>
                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="exemplo@email.com"
                        placeholderTextColor={COLORS.textPlaceholder}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoCorrect={false}
                        textContentType="emailAddress"
                    />
                </View>
                
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Sua senha secreta"
                        placeholderTextColor={COLORS.textPlaceholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textContentType="password"
                    />
                </View>
                
                {error ? (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.loginBtnText}>ENTRAR</Text>}
                </TouchableOpacity>

                {!supabaseMode ? (
                  <>
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>ou</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={[styles.googleBtn, (loading || loadingGoogle || googleDisabled) && styles.googleBtnDisabled]}
                      onPress={signInWithGoogle}
                      disabled={loading || loadingGoogle || googleDisabled}
                    >
                      {loadingGoogle ? (
                        <ActivityIndicator color={COLORS.textPrimary} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="google" size={20} color={COLORS.textPrimary} />
                          <Text style={styles.googleBtnText}>Entrar com Google</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>Não tem conta? <Text style={styles.registerLink}>Criar agora</Text></Text>
            </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
    heroCard: { marginBottom: SPACING.lg, borderRadius: RADIUS.xl, backgroundColor: COLORS.backgroundAlt, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.xl, ...SHADOWS.card },
    logoContainer: { alignItems: 'center' },
    logoBadge: { width: 68, height: 68, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    appName: { fontSize: TYPOGRAPHY.h1, fontWeight: '900', color: COLORS.secondary, marginTop: 12, letterSpacing: 0.2 },
    appSub: { fontSize: TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 6 },
    badgeRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 },
    badgeText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

    card: { backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
    cardTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.h2, fontWeight: '900', marginBottom: 6 },
    cardSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.lg },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.lg, height: 56 },
    inputIcon: { paddingLeft: 15, paddingRight: 5 },
    input: { flex: 1, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, fontWeight: '700', height: '100%' },

    loginBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, ...SHADOWS.card },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.body, letterSpacing: 0.8 },
    dividerRow: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
    dividerText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
    googleBtn: {
      marginTop: SPACING.md,
      height: 56,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    googleBtnText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: TYPOGRAPHY.body },
    googleBtnDisabled: { opacity: 0.65 },

    registerBtn: { marginTop: SPACING.xl, alignItems: 'center' },
    registerText: { fontSize: 15, color: COLORS.textSecondary },
    registerLink: { color: COLORS.primary, fontWeight: 'bold' },
    
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: RADIUS.sm, marginBottom: SPACING.lg },
    errorText: { color: COLORS.danger, marginLeft: 8, fontSize: 14, flex: 1 }
});

export default LoginScreen;
