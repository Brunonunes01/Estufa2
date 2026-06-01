// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar
} from 'react-native';
import { TextInput, Button, useTheme as usePaperTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import useGoogleAuth from '../../hooks/useGoogleAuth';
import { signInWithPasswordBridge } from '../../services/authBridge';
import { isSupabaseBackend } from '../../services/backendConfig';
import { useAppTheme } from '../../hooks/useAppTheme';

const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const paperTheme = usePaperTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: appTheme.pageBackground }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <StatusBar barStyle={appTheme.isDark ? "light-content" : "dark-content"} backgroundColor={appTheme.pageBackground} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: Math.max(insets.bottom + SPACING.xl, 42) }
          ]}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.heroSection}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons name="greenhouse" size={40} color={COLORS.primary} />
              </View>
              <Text style={[styles.appName, { color: appTheme.textPrimary }]}>Estufa Inteligente</Text>
              <Text style={[styles.appSub, { color: appTheme.textSecondary }]}>Gestão e monitoramento profissional</Text>
              
              <View style={[styles.statusBadge, { backgroundColor: COLORS.primarySoft }]}>
                <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.primary} />
                <Text style={styles.statusBadgeText}>Ambiente Seguro</Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]}>
                <Text style={[styles.cardTitle, { color: appTheme.textPrimary }]}>Bem-vindo de volta</Text>
                <Text style={[styles.cardSubtitle, { color: appTheme.textSecondary }]}>Acesse sua conta para gerenciar seu cultivo.</Text>
                
                <TextInput
                  mode="outlined"
                  label="E-mail"
                  placeholder="seu@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  left={<TextInput.Icon icon="email-outline" color={appTheme.textSecondary} />}
                  style={styles.input}
                  outlineColor={appTheme.border}
                  activeOutlineColor={COLORS.primary}
                />

                <TextInput
                  mode="outlined"
                  label="Senha"
                  placeholder="Digite sua senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock-outline" color={appTheme.textSecondary} />}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"} 
                      onPress={() => setShowPassword(!showPassword)}
                      color={appTheme.textSecondary}
                    />
                  }
                  style={styles.input}
                  outlineColor={appTheme.border}
                  activeOutlineColor={COLORS.primary}
                />
                
                {error ? (
                    <View style={[styles.errorBox, { backgroundColor: appTheme.dangerSoft, borderColor: appTheme.danger }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={appTheme.danger} />
                        <Text style={[styles.errorText, { color: appTheme.danger }]}>{error}</Text>
                    </View>
                ) : null}
                
                <Button 
                  mode="contained" 
                  onPress={handleLogin} 
                  loading={loading}
                  disabled={loading}
                  style={styles.loginBtn}
                  contentStyle={styles.loginBtnContent}
                  labelStyle={styles.loginBtnLabel}
                  buttonColor={COLORS.primary}
                >
                  ACESSAR PAINEL
                </Button>

                {!supabaseMode ? (
                  <>
                    <View style={styles.dividerRow}>
                        <View style={[styles.dividerLine, { backgroundColor: appTheme.border }]} />
                        <Text style={[styles.dividerText, { color: appTheme.textSecondary }]}>ou</Text>
                        <View style={[styles.dividerLine, { backgroundColor: appTheme.border }]} />
                    </View>

                    <Button
                      mode="outlined"
                      onPress={signInWithGoogle}
                      disabled={loading || loadingGoogle || googleDisabled}
                      style={styles.googleBtn}
                      contentStyle={styles.googleBtnContent}
                      labelStyle={[styles.googleBtnLabel, { color: appTheme.textPrimary }]}
                      icon="google"
                      textColor={appTheme.textPrimary}
                    >
                      Entrar com Google
                    </Button>
                  </>
                ) : null}
            </View>

            <TouchableOpacity 
              style={styles.registerContainer} 
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
                <Text style={[styles.registerText, { color: appTheme.textSecondary }]}>
                  Ainda não tem acesso? <Text style={[styles.registerLink, { color: COLORS.primary }]}>Crie sua conta</Text>
                </Text>
            </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
    
    heroSection: { alignItems: 'center', marginBottom: SPACING.xxl },
    logoBadge: { 
      width: 80, 
      height: 80, 
      borderRadius: RADIUS.lg, 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: COLORS.surface, 
      borderWidth: 1, 
      borderColor: COLORS.border,
      ...SHADOWS.card 
    },
    appName: { fontSize: 28, fontWeight: '900', marginTop: 16, letterSpacing: -0.5 },
    appSub: { fontSize: 16, marginTop: 4, textAlign: 'center', opacity: 0.8 },
    statusBadge: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 6, 
      paddingHorizontal: 12, 
      paddingVertical: 4, 
      borderRadius: RADIUS.pill, 
      marginTop: 12 
    },
    statusBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },

    card: { padding: SPACING.xl, borderRadius: RADIUS.xl, borderWidth: 1, ...SHADOWS.card },
    cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    cardSubtitle: { fontSize: 14, marginBottom: SPACING.xl },
    
    input: { marginBottom: SPACING.md, backgroundColor: 'transparent' },

    loginBtn: { marginTop: SPACING.sm, borderRadius: RADIUS.md },
    loginBtnContent: { height: 56 },
    loginBtnLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },

    dividerRow: { marginVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    
    googleBtn: { borderRadius: RADIUS.md, borderColor: COLORS.border },
    googleBtnContent: { height: 52 },
    googleBtnLabel: { fontSize: 15, fontWeight: '700' },

    registerContainer: { marginTop: SPACING.xl, alignItems: 'center', padding: 10 },
    registerText: { fontSize: 15 },
    registerLink: { fontWeight: 'bold', textDecorationLine: 'underline' },
    
    errorBox: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      borderWidth: 1, 
      padding: 12, 
      borderRadius: RADIUS.md, 
      marginBottom: SPACING.lg 
    },
    errorText: { marginLeft: 8, fontSize: 14, flex: 1, fontWeight: '600' }
});

export default LoginScreen;
