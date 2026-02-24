// src/screens/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, Alert, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; 
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(''); setLoading(true);
    if (!name || !email || !password) { setError('Por favor, preencha todos os campos.'); setLoading(false); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); setLoading(false); return; }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name, email, role: "admin", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
      setLoading(false);
      Alert.alert('Bem-vindo!', 'Conta criada com sucesso.');
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/invalid-email') setError('Formato de e-mail inválido.');
      else setError('Ocorreu um erro ao criar a conta.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-plus" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Nova Conta</Text>
                <Text style={styles.subtitle}>Comece a gerir a sua estufa</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Nome Completo</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textPlaceholder} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="O seu nome" placeholderTextColor={COLORS.textPlaceholder} value={name} onChangeText={setName} />
                </View>

                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textPlaceholder} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="exemplo@dominio.com" placeholderTextColor={COLORS.textPlaceholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                </View>
                
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-plus-outline" size={20} color={COLORS.textPlaceholder} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={COLORS.textPlaceholder} value={password} onChangeText={setPassword} secureTextEntry />
                </View>
                
                {error ? (
                    <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View>
                ) : null}
                
                <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Criar Conta</Text>}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Já tem uma conta?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.loginLink}>Fazer Login</Text></TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 30 },
    iconCircle: { width: 80, height: 80, backgroundColor: COLORS.surface, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
    card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 16, paddingHorizontal: 12, height: 56 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: '#000000', fontSize: 16, fontWeight: 'bold', height: '100%' },
    registerBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
    registerBtnText: { color: '#FFF', fontWeight: '800', fontSize: 18 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 5 },
    footerText: { color: COLORS.textSecondary },
    loginLink: { color: COLORS.primary, fontWeight: 'bold' },
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger, borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 20 },
    errorText: { color: COLORS.danger, marginLeft: 8, fontSize: 14, flex: 1 }
});
export default RegisterScreen;