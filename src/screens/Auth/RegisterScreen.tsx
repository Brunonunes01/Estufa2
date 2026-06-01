// src/screens/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, Alert, StyleSheet, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, StatusBar 
} from 'react-native';
import { TextInput, Button, useTheme as usePaperTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import useGoogleAuth from '../../hooks/useGoogleAuth';
import { signUpWithPasswordBridge } from '../../services/authBridge';
import { isSupabaseBackend } from '../../services/backendConfig';
import { useAppTheme } from '../../hooks/useAppTheme';

const RegisterScreen = ({ navigation }: any) => {
  const appTheme = useAppTheme();
  const [name, setName] = useState('');
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

  const handleRegister = async () => {
    setError(''); 
    setLoading(true);
    
    if (!name || !email || !password) { 
      setError('Por favor, preencha todos os campos.'); 
      setLoading(false); 
      return; 
    }
    
    if (password.length < 6) { 
      setError('A senha deve ter no mínimo 6 caracteres.'); 
      setLoading(false); 
      return; 
    }
    
    try {
      await signUpWithPasswordBridge(name.trim(), email.trim(), password);
      setLoading(false);
      Alert.alert('Bem-vindo!', 'Conta criada com sucesso.');
    } catch (err: any) {
      setLoading(false);
      if (
        err?.code === 'auth/email-already-in-use' ||
        err?.message?.toLowerCase?.().includes('already registered')
      ) {
        setError('Este e-mail já está em uso.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError(err?.message || 'Ocorreu um erro ao criar a conta.');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: appTheme.pageBackground }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <StatusBar barStyle={appTheme.isDark ? "light-content" : "dark-content"} backgroundColor={appTheme.pageBackground} />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-plus" size={42} color={COLORS.primary} />
                </View>
                <Text style={[styles.title, { color: appTheme.textPrimary }]}>Criar Conta</Text>
                <Text style={[styles.subtitle, { color: appTheme.textSecondary }]}>Junte-se ao monitoramento inteligente</Text>
            </View>

            <View style={[styles.card, { backgroundColor: appTheme.surfaceBackground, borderColor: appTheme.border }]}>
                <TextInput
                  mode="outlined"
                  label="Nome Completo"
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                  left={<TextInput.Icon icon="account-outline" color={appTheme.textSecondary} />}
                  style={styles.input}
                  outlineColor={appTheme.border}
                  activeOutlineColor={COLORS.primary}
                />

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock-plus-outline" color={appTheme.textSecondary} />}
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
                  onPress={handleRegister} 
                  loading={loading}
                  disabled={loading}
                  style={styles.registerBtn}
                  contentStyle={styles.registerBtnContent}
                  labelStyle={styles.registerBtnLabel}
                  buttonColor={COLORS.primary}
                >
                  CRIAR MINHA CONTA
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

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: appTheme.textSecondary }]}>Já possui uma conta?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                      <Text style={[styles.loginLink, { color: COLORS.primary }]}>Fazer Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
    
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    iconCircle: { 
      width: 76, 
      height: 76, 
      backgroundColor: COLORS.surface, 
      borderRadius: RADIUS.lg, 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: 16, 
      borderWidth: 1, 
      borderColor: COLORS.border, 
      ...SHADOWS.card 
    },
    title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 16, marginTop: 4, textAlign: 'center', opacity: 0.8 },
    
    card: { padding: SPACING.xl, borderRadius: RADIUS.xl, borderWidth: 1, ...SHADOWS.card },
    
    input: { marginBottom: SPACING.md, backgroundColor: 'transparent' },
    
    registerBtn: { marginTop: SPACING.sm, borderRadius: RADIUS.md },
    registerBtnContent: { height: 56 },
    registerBtnLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    
    dividerRow: { marginVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    
    googleBtn: { borderRadius: RADIUS.md, borderColor: COLORS.border },
    googleBtnContent: { height: 52 },
    googleBtnLabel: { fontSize: 15, fontWeight: '700' },
    
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl, gap: 6 },
    footerText: { fontSize: 15 },
    loginLink: { fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
    
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

export default RegisterScreen;

