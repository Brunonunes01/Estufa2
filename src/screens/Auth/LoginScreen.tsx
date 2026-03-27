// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, TextInput, Text, ActivityIndicator, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleLogin = async () => {
    setError('');
    setLoading(true); 

    if (!email || !password) {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setLoading(false);
      let msg = 'Erro ao tentar logar.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Credenciais inválidas. Verifique e-mail e senha.';
      }
      setError(msg);
      Alert.alert('Erro', msg);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.heroCard}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                  <MaterialCommunityIcons name="greenhouse" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.appName}>AgroGestão</Text>
                <Text style={styles.appSub}>Monitoramento inteligente da estufa</Text>
              </View>
            </View>

            <View style={styles.card}>
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
                    />
                </View>
                
                {error ? (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.loginBtnText}>ENTRAR</Text>}
                </TouchableOpacity>
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

    card: { backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.lg, height: 56 },
    inputIcon: { paddingLeft: 15, paddingRight: 5 },
    input: { flex: 1, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, fontWeight: '700', height: '100%' },

    loginBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, ...SHADOWS.card },
    loginBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: TYPOGRAPHY.body, letterSpacing: 0.8 },

    registerBtn: { marginTop: SPACING.xl, alignItems: 'center' },
    registerText: { fontSize: 15, color: COLORS.textSecondary },
    registerLink: { color: COLORS.primary, fontWeight: 'bold' },
    
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: RADIUS.sm, marginBottom: SPACING.lg },
    errorText: { color: COLORS.danger, marginLeft: 8, fontSize: 14, flex: 1 }
});

export default LoginScreen;
