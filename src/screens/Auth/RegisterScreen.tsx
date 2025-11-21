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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    setError('');
    setLoading(true);

    // Validação simples no app
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
    
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        
        const user = userCredential.user;
        const userDocRef = doc(db, 'users', user.uid);
        
        // Cria o documento do usuário no Firestore com permissão padrão
        await setDoc(userDocRef, {
          name: name,
          email: email,
          role: "admin",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        setLoading(false);
        Alert.alert('Sucesso!', 'Sua conta foi criada.');
        // O AuthContext cuidará do redirecionamento
      })
      .catch((err) => {
        setLoading(false);
        
        if (err.code === 'auth/email-already-in-use') {
          setError('Este e-mail já está em uso.');
        } else if (err.code === 'auth/invalid-email') {
          setError('O formato do e-mail é inválido.');
        } else if (err.code === 'auth/weak-password') {
          setError('A senha é muito fraca (mínimo 6 caracteres).');
        } else {
          setError(err.message);
        }
      });
  };

  return (
    <KeyboardAvoidingView 
        style={styles.fullContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView contentContainerStyle={styles.centeredContent}>
            
            <View style={styles.card}>
                <Text style={styles.header}>
                    <MaterialCommunityIcons name="account-plus-outline" size={28} color="#4CAF50" /> Criar Conta
                </Text>

                <Text style={styles.label}>Nome</Text>
                <TextInput
                    placeholder="Seu nome completo"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />

                <Text style={styles.label}>E-mail</Text>
                <TextInput
                    placeholder="exemplo@dominio.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                />
                
                <Text style={styles.label}>Senha (mín. 6 caracteres)</Text>
                <TextInput
                    placeholder="Sua senha"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />
                
                {/* Mensagem de erro melhorada */}
                {error ? (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D32F2F" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                {/* Botão de Criação de Conta */}
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

            </View>

            {/* Botão de Login (Ação Secundária/Link) */}
            <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.loginButtonText}>
                    <Text style={styles.loginLink}>Já tenho conta</Text>
                </Text>
            </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#FAFAFA', 
    },
    centeredContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    // Card Principal
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, 
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 14, 
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    
    // Botão de Cadastro (Primário)
    registerButton: {
        backgroundColor: '#4CAF50', // Verde Primário
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        minHeight: 55,
    },
    registerButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    
    // Botão de Login (Secundário/Link)
    loginButton: {
        marginTop: 10,
        padding: 10,
    },
    loginButtonText: {
        fontSize: 14,
        color: '#666',
    },
    loginLink: {
        color: '#007bff',
        fontWeight: 'bold',
    },
    
    // Mensagem de Erro
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdebeb',
        borderColor: '#d9534f',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#d9534f',
        marginLeft: 8,
        fontSize: 14,
    }
});

export default RegisterScreen;