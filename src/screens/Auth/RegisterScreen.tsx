// src/screens/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  Alert, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Importei updateProfile para salvar o nome
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    if (name === '' || email === '' || password === '') {
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
      // 1. Cria o usuário na autenticação
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Atualiza o nome de exibição no perfil do Auth (opcional, mas recomendado)
      await updateProfile(user, { displayName: name });

      // 3. Salva os dados no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: name,
        email: email,
        role: "admin", // Padrão inicial
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      setLoading(false);
      Alert.alert('Bem-vindo!', 'Sua conta foi criada com sucesso.');
      // O AuthContext vai detectar o login e redirecionar automaticamente

    } catch (err: any) {
      setLoading(false);
      console.error(err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O formato do e-mail é inválido.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca.');
      } else {
        setError('Ocorreu um erro ao criar a conta.');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* CABEÇALHO (Igual ao Login) */}
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account-plus" size={40} color="#166534" />
                </View>
                <Text style={styles.title}>Nova Conta</Text>
                <Text style={styles.subtitle}>Comece a gerenciar sua estufa</Text>
            </View>

            {/* FORMULÁRIO */}
            <View style={styles.formContainer}>
                
                <Text style={styles.label}>Nome Completo</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                        placeholder="Seu nome"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                </View>

                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                        placeholder="exemplo@dominio.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />
                </View>
                
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-plus-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.input}
                    />
                </View>
                
                {/* Mensagem de erro */}
                {error ? (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D32F2F" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                {/* Botão Cadastrar */}
                <TouchableOpacity 
                    style={styles.registerButton} 
                    onPress={handleRegister} 
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.registerButtonText}>
                            Criar Conta
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Voltar para Login */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Já tem uma conta?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLink}>Fazer Login</Text>
                    </TouchableOpacity>
                </View>

            </View>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#14532d', // Fundo Verde Escuro Premium
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    
    // HEADER
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconCircle: {
        width: 80,
        height: 80,
        backgroundColor: '#FFF',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#A7F3D0', // Verde menta claro
        marginTop: 4,
    },

    // FORMULÁRIO (Cartão Branco)
    formContainer: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9', // Fundo cinza claro para o input
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        paddingHorizontal: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#1E293B', // COR DO TEXTO ESCURA (Resolve o problema)
        fontSize: 16,
        fontWeight: '500',
        height: '100%',
    },
    
    // BOTÕES
    registerButton: {
        backgroundColor: '#166534', // Verde Principal
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    
    // FOOTER (Link de Login)
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        gap: 5,
    },
    footerText: {
        color: '#64748B',
    },
    loginLink: {
        color: '#166534',
        fontWeight: 'bold',
    },
    
    // ERRO
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
        borderWidth: 1,
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    errorText: {
        color: '#B91C1C',
        marginLeft: 8,
        fontSize: 14,
        flex: 1, // Permite quebra de linha se o erro for grande
    }
});

export default RegisterScreen;