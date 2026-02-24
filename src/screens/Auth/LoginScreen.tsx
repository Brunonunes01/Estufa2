// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, TextInput, Text, ActivityIndicator, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

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
            
            <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="greenhouse" size={80} color={COLORS.primary} />
                <Text style={styles.appName}>AgroGestão</Text>
                <Text style={styles.appSub}>Controle de Estufas</Text>
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
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D32F2F" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>ENTRAR</Text>}
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
    container: { flex: 1, backgroundColor: COLORS.background }, // FUNDO CLARO
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    appName: { fontSize: 32, fontWeight: '900', color: COLORS.primary, marginTop: 10 },
    appSub: { fontSize: 16, color: COLORS.textSecondary, marginTop: 5 },
    
    card: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 24, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    
    // INPUTS BLINDADOS CONTRA MODO ESCURO
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 20, height: 56 },
    inputIcon: { paddingLeft: 15, paddingRight: 5 },
    input: { flex: 1, fontSize: 16, color: '#000000', fontWeight: 'bold', height: '100%' }, // PRETO ABSOLUTO
    
    loginBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
    loginBtnText: { color: COLORS.textLight, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    
    registerBtn: { marginTop: 30, alignItems: 'center' },
    registerText: { fontSize: 15, color: COLORS.textSecondary },
    registerLink: { color: COLORS.primary, fontWeight: 'bold' },
    
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerBg, padding: 12, borderRadius: 8, marginBottom: 20 },
    errorText: { color: COLORS.danger, marginLeft: 8, fontSize: 14, flex: 1 }
});

export default LoginScreen;